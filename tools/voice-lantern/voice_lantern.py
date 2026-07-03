#!/usr/bin/env python3
"""Voice Lantern: consent-first Discord voice bridge for Flameclyffe.

The bridge is a transport layer, not an agent. It receives approved human audio,
turns it into text locally, posts that text into the Discord channel where the
real agent already lives, and reads the agent's normal text reply aloud.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import re
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import discord
import edge_tts
import numpy as np
from discord.ext import voice_recv
from faster_whisper import WhisperModel

COMMAND = re.compile(r"^\s*(?:!voice\s+|voice\s+|!)(join|leave|skip|stop|test|hush|listen|consent|status|feather)\b", re.I)
FILLER_ONLY = re.compile(r"^(thank you\.?|thanks for watching\.?|bye\.?|you\.?|\.+)$", re.I)


@dataclass(frozen=True)
class Config:
    discord_token: str
    agent_user_ids: set[int]
    human_user_ids: set[int]
    text_channel_id: int | None
    tts_voice: str
    whisper_model: str
    silence_flush_sec: float
    min_utterance_sec: float
    chunk_chars: int
    transcript_prefix: str
    require_consent_ack: bool

    @classmethod
    def from_env(cls) -> "Config":
        load_dotenv_if_present()
        return cls(
            discord_token=require_env("DISCORD_TOKEN"),
            agent_user_ids=parse_ids(require_env("AGENT_USER_IDS")),
            human_user_ids=parse_ids(require_env("HUMAN_USER_IDS")),
            text_channel_id=parse_optional_int(os.getenv("TEXT_CHANNEL_ID", "")),
            tts_voice=os.getenv("TTS_VOICE", "en-US-AriaNeural"),
            whisper_model=os.getenv("WHISPER_MODEL", "base.en"),
            silence_flush_sec=float(os.getenv("SILENCE_FLUSH_SEC", "4.5")),
            min_utterance_sec=float(os.getenv("MIN_UTTERANCE_SEC", "0.6")),
            chunk_chars=int(os.getenv("CHUNK_CHARS", "700")),
            transcript_prefix=os.getenv("TRANSCRIPT_PREFIX", "[Voice Lantern transcript]"),
            require_consent_ack=parse_bool(os.getenv("REQUIRE_CONSENT_ACK", "true")),
        )


def load_dotenv_if_present(path: str = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def parse_ids(value: str) -> set[int]:
    return {int(piece.strip()) for piece in value.split(",") if piece.strip()}


def parse_optional_int(value: str) -> int | None:
    value = value.strip()
    return int(value) if value else None


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def cleanup_transcript(text: str) -> str:
    cleaned = text.strip()
    replacements = [
        (r"\b(laughing emoji|laugh emoji)\b", ""),
        (r"\bheart emoji\b", "❤️"),
        (r"\s+question mark\b", "?"),
        (r"\s+exclamation (point|mark)\b", "!"),
        (r"\s+period\b", "."),
        (r"\s+comma\b", ","),
        (r"\bnoise date\b", "noise gate"),
    ]
    for pattern, replacement in replacements:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.I)
    cleaned = re.sub(r"\s+([?.!,])", r"\1", cleaned)
    cleaned = re.sub(r"([?.!,])([^\s?.!,])", r"\1 \2", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def clean_tts_text(msg: discord.Message) -> str:
    text = re.sub(r"```.*?```", " Code block skipped. ", msg.content, flags=re.S)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    for mention in msg.mentions:
        text = re.sub(rf"<@!?{mention.id}>", mention.display_name, text)
    text = re.sub(r"<a?:(\w+):\d+>", r"\1", text)
    text = re.sub(r"https?://\S+", " link ", text)
    text = re.sub(r"[*_~#>|]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def split_text(text: str, limit: int) -> list[str]:
    if len(text) <= limit:
        return [text]
    parts: list[str] = []
    current = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if current and len(current) + len(sentence) + 1 > limit:
            parts.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        parts.append(current)
    return parts


class AudioBuffer:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.chunks: list[bytes] = []
        self.last_packet = 0.0

    def feed(self, pcm: bytes) -> None:
        with self.lock:
            self.chunks.append(pcm)
            self.last_packet = time.time()

    def take_if_silent(self, silence_sec: float) -> bytes | None:
        with self.lock:
            if not self.chunks or time.time() - self.last_packet < silence_sec:
                return None
            data = b"".join(self.chunks)
            self.chunks.clear()
            return data


class VoiceLantern(discord.Client):
    def __init__(self, config: Config) -> None:
        intents = discord.Intents.default()
        intents.message_content = True
        intents.voice_states = True
        super().__init__(intents=intents)
        self.config = config
        self.voice: voice_recv.VoiceRecvClient | None = None
        self.text_channel: discord.abc.Messageable | None = None
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.skip = asyncio.Event()
        self.listening = False if config.require_consent_ack else True
        self.consent_acknowledged = False if config.require_consent_ack else True
        self.audio = AudioBuffer()
        self.whisper: WhisperModel | None = None
        self.stt_executor = ThreadPoolExecutor(max_workers=1)
        self.workers_started = False

    async def on_ready(self) -> None:
        logging.info("logged in as %s", self.user)
        if self.config.text_channel_id and self.text_channel is None:
            channel = self.get_channel(self.config.text_channel_id) or await self.fetch_channel(self.config.text_channel_id)
            if isinstance(channel, discord.abc.Messageable):
                self.text_channel = channel
        if not self.workers_started:
            self.workers_started = True
            asyncio.create_task(self.speak_worker())
            asyncio.create_task(self.stt_flusher())
            threading.Thread(target=self.load_whisper, daemon=True).start()

    def load_whisper(self) -> None:
        self.whisper = WhisperModel(self.config.whisper_model, device="cpu", compute_type="int8", cpu_threads=2)
        self.whisper.transcribe(np.zeros(16000, dtype=np.float32), language="en")
        logging.info("loaded whisper model %s", self.config.whisper_model)

    def on_voice_packet(self, user: discord.User | None, data: voice_recv.VoiceData) -> None:
        if self.listening and self.consent_acknowledged and user and user.id in self.config.human_user_ids:
            self.audio.feed(data.pcm)

    async def transcribe_pcm(self, buf: bytes) -> str:
        def work() -> str:
            audio = np.frombuffer(buf, dtype=np.int16).reshape(-1, 2).mean(axis=1)
            audio = (audio[::3] / 32768.0).astype(np.float32)
            assert self.whisper is not None
            segments, _ = self.whisper.transcribe(audio, language="en", beam_size=1, vad_filter=True)
            return " ".join(seg.text.strip() for seg in segments).strip()
        return await self.loop.run_in_executor(self.stt_executor, work)

    async def stt_flusher(self) -> None:
        min_bytes = int(48000 * 2 * 2 * self.config.min_utterance_sec)
        while True:
            await asyncio.sleep(0.25)
            buf = self.audio.take_if_silent(self.config.silence_flush_sec)
            if not buf or len(buf) < min_bytes or self.whisper is None or self.text_channel is None:
                continue
            text = await self.transcribe_pcm(buf)
            if not text or FILLER_ONLY.match(text):
                continue
            mentions = " ".join(f"<@{uid}>" for uid in self.config.agent_user_ids)
            for part in split_text(cleanup_transcript(text), 1800):
                await self.text_channel.send(f"{self.config.transcript_prefix} {mentions} {part}")

    async def synth(self, text: str) -> str:
        fd, path = tempfile.mkstemp(suffix=".mp3", prefix="voice-lantern-")
        os.close(fd)
        await edge_tts.Communicate(text, self.config.tts_voice).save(path)
        return path

    async def speak_worker(self) -> None:
        while True:
            text = await self.queue.get()
            if not self.voice or not self.voice.is_connected():
                continue
            self.skip.clear()
            path = await self.synth(text)
            try:
                done = asyncio.Event()
                self.voice.play(discord.FFmpegOpusAudio(path), after=lambda _: self.loop.call_soon_threadsafe(done.set))
                skip_task = asyncio.create_task(self.skip.wait())
                done_task = asyncio.create_task(done.wait())
                await asyncio.wait({skip_task, done_task}, return_when=asyncio.FIRST_COMPLETED)
                if self.skip.is_set() and self.voice.is_playing():
                    self.voice.stop()
                skip_task.cancel()
                done_task.cancel()
            finally:
                try:
                    os.unlink(path)
                except OSError:
                    pass

    async def on_message(self, msg: discord.Message) -> None:
        if self.user and msg.author.id == self.user.id:
            return
        if msg.author.id in self.config.agent_user_ids and self.text_channel and msg.channel.id == self.text_channel.id:
            for part in split_text(clean_tts_text(msg), self.config.chunk_chars):
                await self.queue.put(part)
            return
        if msg.author.bot or msg.author.id not in self.config.human_user_ids:
            return
        match = COMMAND.match(msg.content)
        if match:
            await self.handle_command(msg, match.group(1).lower())

    def clear_queue(self) -> None:
        while not self.queue.empty():
            try:
                self.queue.get_nowait()
            except asyncio.QueueEmpty:
                break

    async def handle_command(self, msg: discord.Message, command: str) -> None:
        if command == "join":
            await self.join_voice(msg)
        elif command == "leave":
            await self.leave_voice(msg)
        elif command == "skip":
            self.skip.set()
        elif command == "stop":
            self.clear_queue()
            self.skip.set()
            await msg.channel.send("Voice Lantern stopped playback and cleared the queue.")
        elif command in {"hush", "feather"}:
            self.listening = False
            await msg.channel.send("Feather held. Voice input is paused. Say `voice listen` to resume.")
        elif command == "listen":
            if self.config.require_consent_ack and not self.consent_acknowledged:
                await msg.channel.send("Consent has not been acknowledged yet. Say `voice consent` first.")
                return
            self.listening = True
            await msg.channel.send("Voice Lantern is listening again.")
        elif command == "consent":
            self.consent_acknowledged = True
            self.listening = True
            await msg.channel.send("Consent acknowledged for this small test channel. Everyone present should know voice may be transcribed.")
        elif command == "status":
            await msg.channel.send(f"Voice Lantern status: connected={bool(self.voice and self.voice.is_connected())}, listening={self.listening}, consent={self.consent_acknowledged}.")
        elif command == "test":
            await self.queue.put("Voice Lantern is connected. The pipe is lit.")

    async def join_voice(self, msg: discord.Message) -> None:
        if not msg.author.voice or not msg.author.voice.channel:
            await msg.channel.send("Join a voice channel first, then say `voice join`.")
            return
        target = msg.author.voice.channel
        if self.voice and self.voice.is_connected():
            await self.voice.move_to(target)
        else:
            self.voice = await target.connect(cls=voice_recv.VoiceRecvClient)
            self.voice.listen(voice_recv.BasicSink(self.on_voice_packet))
        self.text_channel = msg.channel
        await msg.channel.send("Voice Lantern connected. Everyone present must consent before transcription. Use `voice consent`, `voice hush`, `voice listen`, `voice skip`, `voice stop`, or `voice leave`.")

    async def leave_voice(self, msg: discord.Message) -> None:
        self.clear_queue()
        self.skip.set()
        self.listening = False if self.config.require_consent_ack else True
        self.consent_acknowledged = False if self.config.require_consent_ack else True
        if self.voice and self.voice.is_connected():
            await self.voice.disconnect()
        self.voice = None
        self.text_channel = None
        await msg.channel.send("Voice Lantern disconnected. Consent state cleared.")


async def run_tts_smoke(config: Config) -> None:
    client = VoiceLantern(config)
    path = await client.synth("Voice Lantern smoke test.")
    try:
        print(f"TTS smoke file created: {path}")
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def check_config(config: Config) -> None:
    print("Voice Lantern config ok")
    print(f"agent_user_ids={sorted(config.agent_user_ids)}")
    print(f"human_user_ids={sorted(config.human_user_ids)}")
    print(f"text_channel_id={config.text_channel_id}")
    print(f"tts_voice={config.tts_voice}")
    print(f"whisper_model={config.whisper_model}")
    print(f"require_consent_ack={config.require_consent_ack}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Voice Lantern Discord voice bridge")
    parser.add_argument("--check-config", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO))
    config = Config.from_env()
    if args.check_config:
        check_config(config)
        return
    if args.self_test:
        asyncio.run(run_tts_smoke(config))
        return
    VoiceLantern(config).run(config.discord_token)


if __name__ == "__main__":
    main()
