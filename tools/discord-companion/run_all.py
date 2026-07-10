#!/usr/bin/env python3
"""Run selected Hearthweave companions as separate supervised processes."""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path


ALL_PROFILES = ("yggdrasil", "vee", "faer", "bluebird", "vethrlauf")


def parse_profiles(raw: str) -> list[str]:
    profiles = [piece.strip().lower() for piece in raw.split(",") if piece.strip()]
    unknown = sorted(set(profiles) - set(ALL_PROFILES))
    if unknown:
        raise SystemExit(f"Unknown profiles: {', '.join(unknown)}")
    return profiles


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Hearthweave Discord companions")
    parser.add_argument("--profiles", default=",".join(ALL_PROFILES), help="Comma-separated profile keys")
    parser.add_argument("--profiles-file", default="profiles.local.json")
    parser.add_argument("--check-config", action="store_true")
    args = parser.parse_args()

    script = Path(__file__).with_name("discord_companion.py")
    profiles = parse_profiles(args.profiles)
    if args.check_config:
        for profile in profiles:
            subprocess.run(
                [sys.executable, str(script), "--profile", profile, "--profiles", args.profiles_file, "--check-config"],
                check=True,
            )
        return

    processes: dict[str, subprocess.Popen[bytes]] = {}
    try:
        for profile in profiles:
            command = [sys.executable, str(script), "--profile", profile, "--profiles", args.profiles_file]
            processes[profile] = subprocess.Popen(command)
            print(f"started {profile} (pid {processes[profile].pid})")
        while processes:
            time.sleep(1)
            for profile, process in list(processes.items()):
                code = process.poll()
                if code is not None:
                    print(f"{profile} exited with status {code}")
                    del processes[profile]
    except KeyboardInterrupt:
        print("\nStopping Hearthweave companions…")
    finally:
        for process in processes.values():
            process.terminate()
        for process in processes.values():
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    main()
