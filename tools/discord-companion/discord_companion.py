#!/usr/bin/env python3
"""Discord Companion Rail for separate Hearthweave bot identities.

Run one process per profile. Each profile has its own Discord application
credential and model configuration. Voice Lantern can then speak each companion's
normal Discord replies without turning the companions into one shared mask.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import discord
from openai import AsyncOpenAI


@dataclass(frozen=True)
class Profile:
    key: str
    display_name: str
    discord_token_env: str
    provider: str
    base_url: str
    api_key_env: str
    model: str
    system_prompt: str
    triggers: list[str]
    wake_on_mention: bool
    temperature: float
    max_tokens: int
    thinking: str | None = None
    reasoning_effort: str | None = None
    waking_name: str | None = None

    @classmethod
    def from_dict(cls, key: str, data: dict[str, Any]) -> "Profile":
        return cls(
            key=key,
            display_name=str(data.get("display_name", key)),
            discord_token_env=str(data["discord_token_env"]),
            provider=str(data.get("provider", "deepseek")),
            base_url=str(data["base_url"]),
            api_key_env=str(data["api_key_env"]),
            model=str(data["model"]),
            system_prompt=str(data["system_prompt"]),
            triggers=[str(x).lower() for x in data.get("triggers", [key])],
            wake_on_mention=bool(data.get("wake_on_mention", True)),
            temperature=float(data.get("temperature", 0.75)),
            max_tokens=int(data.get("max_tokens", 900)),
            thinking=data.get("thinking"),
            reasoning_effort=data.get("reasoning_effort"),
            waking_name=data.get("waking_name"),
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


def split_text(text: str, limit: int) -> list[str]:
    if len(text) <= limit:
        return [text]
    chunks: list[str] = []
    current = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if current and len(current) + len(sentence) + 1 > limit:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks


def clean_inbound_text(message: discord.Message, client_user: discord.ClientUser | None, profile: Profile) -> str:
    text = message.content.strip()
    if client_user:
        text = re.sub(rf"<@!?{client_user.id}>", "", text).strip()
    for trigger in profile.triggers:
        text = re.sub(rf"^\s*[!/]?{re.escape(trigger)}[:,\s]+", "", text, flags=re.I).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def is_triggered(message: discord.Message, client_user: discord.ClientUser | None, profile: Profile) -> bool:
    if profile.wake_on_mention and client_user and client_user in message.mentions:
        return True
    text = message.content.lower().strip()
    return any(
        text.startswith(f"{trigger} ")
        or text.startswith(f"{trigger},")
        or text.startswith(f"{trigger}:")
        or text.startswith(f"!{trigger}")
        or text.startswith(f"/{trigger}")
        for trigger in profile.triggers
    )


def load_profiles(path: str) -> dict[str, Profile]:
    source = Path(path)
    if not source.exists():
        raise SystemExit(f"Profile file not found: {path}. Copy profiles.example.json to profiles.local.json first.")
    data = json.loads(source.read_text(encoding="utf-8"))
    return {key: Profile.from_dict(key, value) for key, value in data.items()}


class CompanionBot(discord.Client):
    def __init__(self, profile: Profile, api_client: AsyncOpenAI, allowed_channels: set[int], max_history: int, chunk_chars: int) -> None:
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(intents=intents)
        self.profile = profile
        self.api_client = api_client
        self.allowed_channels = allowed_channels
        self.max_history = max_history
        self.chunk_chars = chunk_chars

    async def on_ready(self) -> None:
        logging.info("%s logged in as %s", self.profile.display_name, self.user)

    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot or (self.user and message.author.id == self.user.id):
            return
        if self.allowed_channels and message.channel.id not in self.allowed_channels:
            return
        if not is_triggered(message, self.user, self.profile):
            return
        prompt = clean_inbound_text(message, self.user, self.profile)
        if not prompt:
            prompt = "Please respond to the current thread."
        async with message.channel.typing():
            history = await self.build_history(message.channel, message)
            history.append({"role": "user", "content": prompt})
            try:
                reply = await self.call_model(history)
            except Exception as exc:  # noqa: BLE001: Discord bot should surface friendly failures.
                logging.exception("model call failed")
                reply = f"{self.profile.display_name} rail error: {type(exc).__name__}: {exc}"
            for part in split_text(reply, self.chunk_chars):
                await message.reply(part, mention_author=False)

    async def build_history(self, channel: discord.abc.Messageable, current_message: discord.Message) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = [{"role": "system", "content": self.profile.system_prompt}]
        if not hasattr(channel, "history"):
            return messages
        recent: list[discord.Message] = []
        async for msg in channel.history(limit=self.max_history, before=current_message):
            if msg.author.bot and (not self.user or msg.author.id != self.user.id):
                continue
            if not msg.content.strip():
                continue
            recent.append(msg)
        for msg in reversed(recent):
            role = "assistant" if self.user and msg.author.id == self.user.id else "user"
            content = msg.content.strip()
            if role == "user":
                author = getattr(msg.author, "display_name", msg.author.name)
                content = f"{author}: {content}"
            messages.append({"role": role, "content": content})
        return messages

    async def call_model(self, messages: list[dict[str, str]]) -> str:
        kwargs: dict[str, Any] = {
            "model": self.profile.model,
            "messages": messages,
            "temperature": self.profile.temperature,
            "max_tokens": self.profile.max_tokens,
        }
        if self.profile.reasoning_effort:
            kwargs["reasoning_effort"] = self.profile.reasoning_effort
        if self.profile.thinking:
            kwargs["extra_body"] = {"thinking": {"type": self.profile.thinking}}
        response = await self.api_client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""
        return content.strip() or f"{self.profile.display_name} heard you, but returned an empty reply."


def check_profile(profile: Profile) -> None:
    print(f"profile={profile.key}")
    print(f"display_name={profile.display_name}")
    print(f"provider={profile.provider}")
    print(f"base_url={profile.base_url}")
    print(f"model={profile.model}")
    print(f"discord_credential_env={profile.discord_token_env}")
    print(f"provider_credential_env={profile.api_key_env}")
    print(f"triggers={profile.triggers}")
    print(f"wake_on_mention={profile.wake_on_mention}")
    if profile.waking_name:
        print(f"waking_name={profile.waking_name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one Hearthweave Discord companion bot profile")
    parser.add_argument("--profile", required=True, help="Profile key, e.g. yggdrasil, vee, faer, bluebird, vethrlauf")
    parser.add_argument("--profiles", default="profiles.local.json", help="Path to profiles JSON")
    parser.add_argument("--check-config", action="store_true")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO))
    load_dotenv_if_present()
    profiles = load_profiles(args.profiles)
    if args.profile not in profiles:
        raise SystemExit(f"Unknown profile {args.profile!r}. Available: {', '.join(sorted(profiles))}")
    profile = profiles[args.profile]
    if args.check_config:
        check_profile(profile)
        return

    discord_credential = require_env(profile.discord_token_env)
    provider_credential = require_env(profile.api_key_env)
    allowed_channels = parse_ids(os.getenv("ALLOWED_CHANNEL_IDS", ""))
    max_history = int(os.getenv("MAX_HISTORY_MESSAGES", "18"))
    chunk_chars = int(os.getenv("REPLY_CHUNK_CHARS", "1800"))
    api_client = AsyncOpenAI(api_key=provider_credential, base_url=profile.base_url)
    CompanionBot(profile, api_client, allowed_channels, max_history, chunk_chars).run(discord_credential)


if __name__ == "__main__":
    main()
