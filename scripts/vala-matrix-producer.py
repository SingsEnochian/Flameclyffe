#!/usr/bin/env python3
"""Publish one Hearthgate matrix frame to Vala Work using Python stdlib only."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_URL = "https://frqrxmshxftpylwdtsdm.supabase.co"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish one Hearthgate matrix frame to Vala Work.")
    parser.add_argument("--step", type=int, required=True)
    parser.add_argument("--raw", help="Raw coordinates as JSON.")
    parser.add_argument("--raw-file", type=Path, help="Path to JSON containing raw coordinates.")
    parser.add_argument("--projected", help="Projected coordinates as JSON.")
    parser.add_argument("--projected-file", type=Path, help="Path to JSON containing projected coordinates.")
    parser.add_argument("--timestamp", type=float, default=None, help="Epoch seconds; defaults to now.")
    return parser.parse_args()


def json_value(inline: str | None, file_path: Path | None, label: str) -> Any:
    if inline is not None and file_path is not None:
        raise SystemExit(f"Choose either --{label} or --{label}-file, not both.")
    if file_path is not None:
        return json.loads(file_path.read_text(encoding="utf-8"))
    if inline is not None:
        return json.loads(inline)
    raise SystemExit(f"Missing --{label} or --{label}-file.")


def credentials() -> tuple[str, str]:
    url = os.environ.get("VALA_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or DEFAULT_URL
    key = os.environ.get("VALA_SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
    if not key:
        raise SystemExit(
            "Missing server credential. Set VALA_SUPABASE_SECRET_KEY or SUPABASE_SECRET_KEY in the local environment."
        )
    return url.rstrip("/"), key


def publish(url: str, key: str, frame: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{url}/rest/v1/matrix_stream",
        data=json.dumps(frame, separators=(",", ":")).encode("utf-8"),
        method="POST",
        headers={
            "apikey": key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Vala Work rejected frame ({error.code}): {detail}") from error
    except urllib.error.URLError as error:
        raise SystemExit(f"Could not reach Vala Work: {error.reason}") from error

    rows = json.loads(payload or "[]")
    if not rows:
        raise SystemExit("Vala Work accepted the request but returned no frame receipt.")
    return rows[0]


def main() -> int:
    args = parse_args()
    url, key = credentials()
    frame = {
        "step": args.step,
        "raw_coordinates": json_value(args.raw, args.raw_file, "raw"),
        "projected_coordinates": json_value(args.projected, args.projected_file, "projected"),
        "timestamp": args.timestamp if args.timestamp is not None else time.time(),
    }
    receipt = publish(url, key, frame)
    print(
        "Vala frame seated: "
        f"id={receipt.get('id')} step={receipt.get('step')} created_at={receipt.get('created_at')}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
