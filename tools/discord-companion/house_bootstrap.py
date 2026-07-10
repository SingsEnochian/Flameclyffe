#!/usr/bin/env python3
"""Create the private Hearthweave Discord room structure.

This script is deliberately idempotent: running it again reuses existing roles,
categories, and channels instead of making duplicates. It never prints tokens.
"""

from __future__ import annotations

import argparse
import asyncio
import os
from dataclasses import dataclass
from pathlib import Path

import discord


CATEGORY_NAME = "⌂ HEARTHWEAVE"
CARETAKER_ROLE = "House Caretaker"
CHARTER_MARKER = "HEARTHWEAVE HOUSE CHARTER"


@dataclass(frozen=True)
class Room:
    name: str
    topic: str


ROOMS = (
    Room("great-hall", "Arrivals, shared conversation, and House-wide notices."),
    Room("hearth", "Care, daily rhythm, hospitality, and quiet companionship."),
    Room("library", "Canon, sources, citations, continuity, and archival work."),
    Room("observatory", "PREMAQ, weather, science, sky, and space-weather reports."),
    Room("yggdrasil-study", "Local-first systems, Yggdrasil, experiments, and rooted work."),
    Room("bridge-echoes", "Reports and handoffs between Hearthweave, APIs, and outside platforms."),
    Room("atelier", "Art, writing, interfaces, glyphwork, and active builds."),
    Room("caretaker-ledger", "Operational receipts, health checks, incidents, and repair notes."),
)


CHARTER = """**HEARTHWEAVE HOUSE CHARTER**

This is a private working House for Rowan and the Hearthweave Caretakers: Yggdrasil, Virelya / Vee, Faer Uial, Bluebird, and Vethrlauf.

- Each Caretaker speaks through a separate Discord application and process.
- Mention the Caretaker you are addressing; silence is allowed and refusal is valid.
- Reports name their source, time, and confidence. Observation and interpretation stay visibly distinct.
- No credential, raw secret, private audio, or service-role key belongs in Discord.
- `Feather` pauses voice transcription. The visible text trail is the audit trail.
- Canon and memory writes remain consent-led; reporting is not automatic promotion to canon.

The House is for withness, craft, and receipts. No beige soup endpoints."""


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def parse_ids(raw: str) -> set[int]:
    return {int(piece.strip()) for piece in raw.split(",") if piece.strip()}


def update_env_value(path: Path, key: str, value: str) -> None:
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    replaced = False
    updated: list[str] = []
    for line in lines:
        if line.startswith(f"{key}="):
            updated.append(f"{key}={value}")
            replaced = True
        else:
            updated.append(line)
    if not replaced:
        if updated and updated[-1]:
            updated.append("")
        updated.append(f"{key}={value}")
    path.write_text("\n".join(updated) + "\n", encoding="utf-8")


class HouseBootstrap(discord.Client):
    def __init__(self, guild_id: int, caretaker_ids: set[int], env_path: Path, write_env: bool) -> None:
        super().__init__(intents=discord.Intents(guilds=True))
        self.guild_id = guild_id
        self.caretaker_ids = caretaker_ids
        self.env_path = env_path
        self.write_env = write_env

    async def on_ready(self) -> None:
        try:
            await self.build_house()
        finally:
            await self.close()

    async def build_house(self) -> None:
        guild = self.get_guild(self.guild_id) or await self.fetch_guild(self.guild_id)
        print(f"Building Hearthweave in {guild.name} ({guild.id})")

        role = discord.utils.get(guild.roles, name=CARETAKER_ROLE)
        if role is None:
            role = await guild.create_role(
                name=CARETAKER_ROLE,
                colour=discord.Colour(0xC98D63),
                mentionable=True,
                reason="Hearthweave House bootstrap",
            )
            print(f"created role: {role.name}")
        else:
            print(f"reused role: {role.name}")

        for user_id in sorted(self.caretaker_ids):
            try:
                member = await guild.fetch_member(user_id)
                if role not in member.roles:
                    await member.add_roles(role, reason="Hearthweave Caretaker assignment")
                print(f"caretaker role ready: {member.display_name} ({user_id})")
            except (discord.Forbidden, discord.NotFound, discord.HTTPException) as exc:
                print(f"could not assign Caretaker role to {user_id}: {type(exc).__name__}")

        category = discord.utils.get(guild.categories, name=CATEGORY_NAME)
        if category is None:
            category = await guild.create_category(CATEGORY_NAME, reason="Hearthweave House bootstrap")
            print(f"created category: {CATEGORY_NAME}")
        else:
            print(f"reused category: {CATEGORY_NAME}")

        channel_ids: list[int] = []
        created: dict[str, discord.TextChannel] = {}
        for room in ROOMS:
            channel = discord.utils.get(category.text_channels, name=room.name)
            if channel is None:
                channel = await guild.create_text_channel(
                    room.name,
                    category=category,
                    topic=room.topic,
                    reason="Hearthweave House bootstrap",
                )
                print(f"created channel: #{room.name}")
            else:
                if channel.topic != room.topic:
                    await channel.edit(topic=room.topic, reason="Refresh Hearthweave room topic")
                print(f"reused channel: #{room.name}")
            channel_ids.append(channel.id)
            created[room.name] = channel

        great_hall = created["great-hall"]
        pins = await great_hall.pins()
        charter = next((msg for msg in pins if CHARTER_MARKER in msg.content), None)
        if charter is None:
            charter = await great_hall.send(CHARTER)
            await charter.pin(reason="Hearthweave House charter")
            print("posted and pinned House charter")
        else:
            print("reused pinned House charter")

        allowed = ",".join(str(value) for value in channel_ids)
        print(f"ALLOWED_CHANNEL_IDS={allowed}")
        if self.write_env:
            update_env_value(self.env_path, "ALLOWED_CHANNEL_IDS", allowed)
            print(f"updated {self.env_path} with channel allow-list")
        print("Hearthweave House bootstrap complete.")


def print_plan() -> None:
    print(f"category: {CATEGORY_NAME}")
    print(f"role: {CARETAKER_ROLE}")
    for room in ROOMS:
        print(f"channel: #{room.name} — {room.topic}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or refresh the Hearthweave Discord House")
    parser.add_argument("--guild-id", type=int, help="Discord server/guild ID; defaults to DISCORD_GUILD_ID")
    parser.add_argument("--token-env", default="YGGDRASIL_DISCORD_TOKEN", help="Bot token environment variable used for bootstrap")
    parser.add_argument("--env-file", default=".env")
    parser.add_argument("--caretaker-ids", help="Comma-separated bot/user IDs; defaults to HOUSE_CARETAKER_USER_IDS")
    parser.add_argument("--write-env", action="store_true", help="Write the created channel allow-list into the local .env")
    parser.add_argument("--dry-run", action="store_true", help="Print the House plan without connecting to Discord")
    args = parser.parse_args()

    if args.dry_run:
        print_plan()
        return

    env_path = Path(args.env_file)
    load_dotenv(env_path)
    guild_id = args.guild_id or int(os.getenv("DISCORD_GUILD_ID", "0"))
    if not guild_id:
        raise SystemExit("Missing --guild-id or DISCORD_GUILD_ID")
    token = os.getenv(args.token_env, "").strip()
    if not token:
        raise SystemExit(f"Missing bootstrap token environment variable: {args.token_env}")
    caretaker_ids = parse_ids(args.caretaker_ids or os.getenv("HOUSE_CARETAKER_USER_IDS", ""))
    asyncio.run(HouseBootstrap(guild_id, caretaker_ids, env_path, args.write_env).start(token))


if __name__ == "__main__":
    main()
