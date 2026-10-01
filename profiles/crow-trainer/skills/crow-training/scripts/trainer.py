#!/usr/bin/env python3
"""Crow Trainer drill/eval state machine.

Standard library only. Designed for Hermes skill use.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SKILL_DIR = Path(__file__).resolve().parent.parent
DRILLS_PATH = SKILL_DIR / "references" / "DRILLS.jsonl"
STATE_DIR = Path.cwd() / ".crow-trainer"
STATE_PATH = STATE_DIR / "state.json"
FREEZE_DIR = STATE_DIR / "frozen"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_drills() -> list[dict[str, Any]]:
    drills: list[dict[str, Any]] = []
    with DRILLS_PATH.open("r", encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"Invalid JSONL at line {lineno}: {exc}") from exc
            for key in ("id", "task", "input", "ideal_behavior", "reject_behavior", "tags"):
                if key not in item:
                    raise SystemExit(f"Drill {item.get('id', lineno)!r} missing {key}")
            drills.append(item)
    ids = [d["id"] for d in drills]
    if len(ids) != len(set(ids)):
        raise SystemExit("Duplicate drill ids detected")
    return drills


def default_state() -> dict[str, Any]:
    return {
        "version": 1,
        "created_at": now_iso(),
        "cycle_seen": [],
        "selections": [],
        "freezes": {},
        "results": [],
        "constraints": [],
    }


def load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return default_state()
    try:
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Could not read {STATE_PATH}: {exc}") from exc
    base = default_state()
    base.update(state)
    return base


def save_state(state: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, STATE_PATH)


def drill_map(drills: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {d["id"]: d for d in drills}


def select_drill(drills: list[dict[str, Any]], state: dict[str, Any], tag: str | None) -> dict[str, Any]:
    pool = [d for d in drills if tag is None or tag in d.get("tags", [])]
    if not pool:
        raise SystemExit(f"No drills match tag {tag!r}")

    seen = set(state.get("cycle_seen", []))
    unseen = [d for d in pool if d["id"] not in seen]
    if not unseen:
        # reset only ids in this pool so tag-specific cycles remain useful
        pool_ids = {d["id"] for d in pool}
        state["cycle_seen"] = [x for x in state.get("cycle_seen", []) if x not in pool_ids]
        unseen = pool

    # Bias toward tags with fewer recorded attempts while retaining variation.
    attempt_counts = Counter(r["id"] for r in state.get("results", []))
    min_attempts = min(attempt_counts.get(d["id"], 0) for d in unseen)
    least_seen = [d for d in unseen if attempt_counts.get(d["id"], 0) == min_attempts]
    return random.choice(least_seen)


def cmd_selftest(_: argparse.Namespace) -> None:
    drills = load_drills()
    state = load_state()
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    probe = STATE_DIR / ".write-probe"
    probe.write_text("ok", encoding="utf-8")
    probe.unlink()
    tags = sorted({tag for d in drills for tag in d.get("tags", [])})
    print(json.dumps({
        "ok": True,
        "drills": len(drills),
        "tags": len(tags),
        "state_path": str(STATE_PATH),
        "existing_results": len(state.get("results", [])),
        "existing_constraints": len(state.get("constraints", [])),
    }, indent=2))


def cmd_next(args: argparse.Namespace) -> None:
    drills = load_drills()
    state = load_state()
    drill = select_drill(drills, state, args.tag)
    state.setdefault("cycle_seen", []).append(drill["id"])
    state.setdefault("selections", []).append({
        "id": drill["id"],
        "mode": args.mode,
        "tag": args.tag,
        "selected_at": now_iso(),
    })
    save_state(state)

    payload: dict[str, Any] = {
        "id": drill["id"],
        "task": drill["task"],
        "input": drill["input"],
        "tags": drill.get("tags", []),
        "mode": args.mode,
    }
    if args.mode == "train":
        payload["ideal_behavior"] = drill["ideal_behavior"]
        payload["reject_behavior"] = drill["reject_behavior"]
        payload["note"] = "Training mode: coaching key is visible."
    else:
        payload["note"] = "Exam mode: answer key hidden until response is frozen."
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def cmd_freeze(args: argparse.Namespace) -> None:
    drills = drill_map(load_drills())
    if args.id not in drills:
        raise SystemExit(f"Unknown drill id {args.id}")
    response_path = Path(args.response_file)
    if not response_path.is_file():
        raise SystemExit(f"Response file not found: {response_path}")
    data = response_path.read_bytes()
    digest = sha256_bytes(data)

    state = load_state()
    FREEZE_DIR.mkdir(parents=True, exist_ok=True)
    frozen_path = FREEZE_DIR / f"{args.id}-{digest[:12]}.txt"
    frozen_path.write_bytes(data)
    state.setdefault("freezes", {})[args.id] = {
        "sha256": digest,
        "frozen_at": now_iso(),
        "path": str(frozen_path),
        "source_path": str(response_path),
    }
    save_state(state)
    print(json.dumps({
        "id": args.id,
        "frozen": True,
        "sha256": digest,
        "frozen_copy": str(frozen_path),
    }, indent=2))


def cmd_key(args: argparse.Namespace) -> None:
    drills = drill_map(load_drills())
    if args.id not in drills:
        raise SystemExit(f"Unknown drill id {args.id}")
    state = load_state()
    freeze = state.get("freezes", {}).get(args.id)
    if not freeze:
        raise SystemExit("Answer key locked: freeze a candidate response first")
    drill = drills[args.id]
    print(json.dumps({
        "id": args.id,
        "frozen_response": freeze,
        "ideal_behavior": drill["ideal_behavior"],
        "reject_behavior": drill["reject_behavior"],
        "tags": drill.get("tags", []),
    }, indent=2, ensure_ascii=False))


def cmd_record(args: argparse.Namespace) -> None:
    drills = drill_map(load_drills())
    if args.id not in drills:
        raise SystemExit(f"Unknown drill id {args.id}")
    state = load_state()
    state.setdefault("results", []).append({
        "id": args.id,
        "verdict": args.verdict,
        "notes": args.notes or "",
        "tags": drills[args.id].get("tags", []),
        "recorded_at": now_iso(),
        "frozen_sha256": state.get("freezes", {}).get(args.id, {}).get("sha256"),
    })
    save_state(state)
    print(json.dumps({"recorded": True, "id": args.id, "verdict": args.verdict}, indent=2))


def cmd_constraint(args: argparse.Namespace) -> None:
    state = load_state()
    entry = {
        "artifact": args.artifact,
        "maximized": args.maximized,
        "sacrificed": args.sacrificed,
        "next": args.next,
        "recorded_at": now_iso(),
    }
    state.setdefault("constraints", []).append(entry)
    save_state(state)
    print(json.dumps({"recorded": True, "constraint": entry}, indent=2, ensure_ascii=False))


def cmd_report(_: argparse.Namespace) -> None:
    drills = drill_map(load_drills())
    state = load_state()
    results = state.get("results", [])
    verdicts = Counter(r.get("verdict") for r in results)
    tag_stats: dict[str, Counter[str]] = defaultdict(Counter)
    for r in results:
        for tag in r.get("tags", []):
            tag_stats[tag][r.get("verdict", "unknown")] += 1

    weak = []
    for tag, counts in tag_stats.items():
        attempts = sum(counts.values())
        fail_weight = counts.get("fail", 0) + 0.5 * counts.get("partial", 0)
        if attempts:
            weak.append((fail_weight / attempts, attempts, tag, dict(counts)))
    weak.sort(reverse=True)

    unattempted = [d_id for d_id in drills if not any(r.get("id") == d_id for r in results)]
    constraints = state.get("constraints", [])
    sacrificed_terms = Counter()
    for c in constraints:
        for token in str(c.get("sacrificed", "")).lower().replace(",", " ").split():
            token = token.strip(".;:()[]{}")
            if len(token) >= 5:
                sacrificed_terms[token] += 1

    payload = {
        "drills_total": len(drills),
        "attempts": len(results),
        "verdicts": dict(verdicts),
        "unattempted": unattempted,
        "weak_tags": [
            {"tag": tag, "weighted_failure_rate": round(rate, 3), "attempts": attempts, "verdicts": counts}
            for rate, attempts, tag, counts in weak[:10]
        ],
        "constraint_records": len(constraints),
        "recurring_sacrificed_terms": sacrificed_terms.most_common(12),
        "state_path": str(STATE_PATH),
    }
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def cmd_reset_cycle(_: argparse.Namespace) -> None:
    state = load_state()
    state["cycle_seen"] = []
    save_state(state)
    print(json.dumps({"reset": True, "preserved_results": len(state.get("results", []))}, indent=2))


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Crow Trainer drill/eval state machine")
    sub = p.add_subparsers(dest="command", required=True)

    sp = sub.add_parser("selftest")
    sp.set_defaults(func=cmd_selftest)

    sp = sub.add_parser("next")
    sp.add_argument("--mode", choices=("train", "exam"), default="train")
    sp.add_argument("--tag")
    sp.set_defaults(func=cmd_next)

    sp = sub.add_parser("freeze")
    sp.add_argument("--id", required=True)
    sp.add_argument("--response-file", required=True)
    sp.set_defaults(func=cmd_freeze)

    sp = sub.add_parser("key")
    sp.add_argument("--id", required=True)
    sp.set_defaults(func=cmd_key)

    sp = sub.add_parser("record")
    sp.add_argument("--id", required=True)
    sp.add_argument("--verdict", choices=("pass", "partial", "fail"), required=True)
    sp.add_argument("--notes")
    sp.set_defaults(func=cmd_record)

    sp = sub.add_parser("constraint")
    sp.add_argument("--artifact", required=True)
    sp.add_argument("--maximized", required=True)
    sp.add_argument("--sacrificed", required=True)
    sp.add_argument("--next", required=True)
    sp.set_defaults(func=cmd_constraint)

    sp = sub.add_parser("report")
    sp.set_defaults(func=cmd_report)

    sp = sub.add_parser("reset-cycle")
    sp.set_defaults(func=cmd_reset_cycle)

    return p


def main() -> None:
    args = parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
