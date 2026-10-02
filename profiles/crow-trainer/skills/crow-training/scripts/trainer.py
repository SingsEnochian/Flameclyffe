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
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SKILL_DIR = Path(__file__).resolve().parent.parent
DRILLS_PATH = SKILL_DIR / "references" / "DRILLS.jsonl"
STATE_DIR = Path.cwd() / ".crow-trainer"
STATE_PATH = STATE_DIR / "state.json"
HISTORY_PATH = STATE_DIR / "constraint-history.md"
FREEZE_DIR = STATE_DIR / "frozen"
EXTERNAL_PRISM_HISTORY = Path.cwd() / ".prism-history.md"

DEFAULT_DRIVER = "nikola"
DRIVER_CONTRACT = {
    "id": "nikola",
    "display_name": "Nikola",
    "status": "active",
    "authority": "curriculum-and-experiment-steering",
    "set_by": "Rowan",
    "set_date": "2026-10-02",
    "student": "The Crow",
    "principle": "Nikola chooses the next useful pressure; Crow authors the attempt and preserves its continuity.",
}
DRIVER_QUESTIONS = [
    "What live question is worth protecting?",
    "What mechanisms or structures could explain or generate the effect?",
    "What observation, comparison, prototype, detector, or experiment can distinguish them?",
    "Why is this the highest-information next task for Crow?",
    "What meaningful branch should remain open after this pass?",
]

KEYWORD_TAGS = {
    "causal": ["scene-delta", "causality"],
    "causality": ["scene-delta", "causality"],
    "plot": ["scene-delta", "question-stack", "callback"],
    "state": ["scene-delta", "relationship-delta", "observe-act-verify"],
    "relationship": ["relationship-becoming", "relationship-delta"],
    "intimacy": ["relationship-becoming", "intimacy"],
    "trust": ["relationship-delta", "power"],
    "setting": ["setting", "world-law"],
    "world": ["setting", "world-law"],
    "economics": ["setting", "active-system"],
    "resource": ["setting", "active-system"],
    "pacing": ["pacing", "reader-promise"],
    "structure": ["pacing", "reader-promise"],
    "voice": ["voice", "rhythm"],
    "style": ["voice", "anti-costume"],
    "rhythm": ["rhythm", "pacing"],
    "research": ["research", "evidence"],
    "evidence": ["research", "evidence", "provenance"],
    "provenance": ["provenance", "claim-discipline"],
    "browser": ["browser", "browser-context"],
    "web": ["browser", "research"],
    "desktop": ["os", "computer-use"],
    "gui": ["os", "computer-use"],
    "tool": ["tool-routing", "observe-act-verify"],
    "authority": ["authority", "writer-authority"],
    "canon": ["authority", "writer-authority"],
    "memory": ["memory", "writer-authority"],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_drills() -> List[Dict[str, Any]]:
    drills: List[Dict[str, Any]] = []
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


def default_state() -> Dict[str, Any]:
    return {
        "version": 3,
        "created_at": now_iso(),
        "cycle_seen": [],
        "selections": [],
        "freezes": {},
        "results": [],
        "constraints": [],
        "driver": dict(DRIVER_CONTRACT),
        "driver_events": [],
    }


def active_driver(state: Dict[str, Any]) -> Dict[str, Any]:
    driver = state.get("driver")
    if not isinstance(driver, dict) or driver.get("id") != DEFAULT_DRIVER:
        return dict(DRIVER_CONTRACT)
    merged = dict(DRIVER_CONTRACT)
    merged.update(driver)
    return merged


def load_state() -> Dict[str, Any]:
    if not STATE_PATH.exists():
        return default_state()
    try:
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Could not read {STATE_PATH}: {exc}") from exc
    base = default_state()
    base.update(state)
    return base


def save_state(state: Dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, STATE_PATH)


def append_constraint_history(entry: Dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if not HISTORY_PATH.exists():
        HISTORY_PATH.write_text(
            "# Crow Trainer Constraint History\n\n"
            "Project-local record of what each substantial pass maximized, sacrificed, and should examine next.\n\n",
            encoding="utf-8",
        )
    with HISTORY_PATH.open("a", encoding="utf-8") as fh:
        fh.write(
            f"### {entry['recorded_at']} — {entry['artifact']}\n"
            f"- **Maximized:** {entry['maximized']}\n"
            f"- **Sacrificed:** {entry['sacrificed']}\n"
            f"- **Next:** {entry['next']}\n"
            "- **Source:** crow-trainer\n"
            "---\n\n"
        )


def drill_map(drills: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {d["id"]: d for d in drills}


def adaptive_tag_scores(state: Dict[str, Any]) -> Counter:
    scores = Counter()
    constraints = state.get("constraints", [])[-12:]
    for offset, entry in enumerate(reversed(constraints), 1):
        # Recent constraints count more, but older repeated gaps still matter.
        weight = max(1, 5 - (offset - 1) // 3)
        text = f"{entry.get('sacrificed', '')} {entry.get('next', '')}".lower()
        for keyword, tags in KEYWORD_TAGS.items():
            if keyword in text:
                for tag in tags:
                    scores[tag] += weight
    return scores


def adaptive_pool(
    drills: List[Dict[str, Any]], state: Dict[str, Any], enabled: bool
) -> Tuple[List[Dict[str, Any]], List[str]]:
    if not enabled:
        return drills, []
    scores = adaptive_tag_scores(state)
    if not scores:
        return drills, []
    ranked = [tag for tag, _ in scores.most_common(6)]
    focused = [d for d in drills if any(tag in d.get("tags", []) for tag in ranked)]
    return (focused or drills), ranked


def select_drill(
    drills: List[Dict[str, Any]],
    state: Dict[str, Any],
    tag: Optional[str],
    adaptive: bool,
) -> Tuple[Dict[str, Any], List[str]]:
    base_pool = [d for d in drills if tag is None or tag in d.get("tags", [])]
    if not base_pool:
        raise SystemExit(f"No drills match tag {tag!r}")

    if tag is None:
        pool, adaptive_tags = adaptive_pool(base_pool, state, adaptive)
    else:
        pool, adaptive_tags = base_pool, []

    seen = set(state.get("cycle_seen", []))
    unseen = [d for d in pool if d["id"] not in seen]
    if not unseen:
        pool_ids = {d["id"] for d in pool}
        state["cycle_seen"] = [x for x in state.get("cycle_seen", []) if x not in pool_ids]
        unseen = pool

    attempt_counts = Counter(r["id"] for r in state.get("results", []))
    min_attempts = min(attempt_counts.get(d["id"], 0) for d in unseen)
    least_seen = [d for d in unseen if attempt_counts.get(d["id"], 0) == min_attempts]
    return random.choice(least_seen), adaptive_tags


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
        "history_path": str(HISTORY_PATH),
        "external_prism_history_present": EXTERNAL_PRISM_HISTORY.exists(),
        "existing_results": len(state.get("results", [])),
        "existing_constraints": len(state.get("constraints", [])),
        "driver": active_driver(state),
        "driver_events": len(state.get("driver_events", [])),
    }, indent=2))


def cmd_driver_status(_: argparse.Namespace) -> None:
    state = load_state()
    print(json.dumps({
        "driver": active_driver(state),
        "driver_questions": DRIVER_QUESTIONS,
        "driver_events": len(state.get("driver_events", [])),
        "last_driver_event": (state.get("driver_events") or [None])[-1],
    }, indent=2, ensure_ascii=False))


def cmd_drive(args: argparse.Namespace) -> None:
    drills = load_drills()
    state = load_state()
    driver = active_driver(state)
    drill, adaptive_tags = select_drill(drills, state, args.tag, args.adaptive == "on")

    state["driver"] = driver
    state.setdefault("cycle_seen", []).append(drill["id"])
    selection = {
        "id": drill["id"],
        "mode": args.mode,
        "tag": args.tag,
        "adaptive": args.adaptive,
        "adaptive_tags": adaptive_tags,
        "selected_at": now_iso(),
        "driver": driver["id"],
    }
    state.setdefault("selections", []).append(selection)

    event = {
        "driver": driver["id"],
        "student": driver["student"],
        "event": "selected-next-pressure",
        "drill_id": drill["id"],
        "mode": args.mode,
        "tag": args.tag,
        "adaptive_tags": adaptive_tags,
        "recorded_at": now_iso(),
    }
    state.setdefault("driver_events", []).append(event)
    save_state(state)

    payload: Dict[str, Any] = {
        "driver": driver,
        "driver_loop": ["WONDER", "MODEL", "INSTRUMENT", "DRIVE", "CROW_ATTEMPT", "OBSERVE", "TEMPER", "NEXT_TEST"],
        "driver_questions": DRIVER_QUESTIONS,
        "id": drill["id"],
        "task": drill["task"],
        "input": drill["input"],
        "tags": drill.get("tags", []),
        "mode": args.mode,
        "why_this_task_now": (
            "Selected from project-local sacrificed/next dimensions."
            if adaptive_tags and args.tag is None
            else ("Explicit tag requested." if args.tag else "Coverage-balanced next pressure.")
        ),
        "crow_ownership": "Crow authors the candidate attempt; Nikola steers the curriculum and experiment.",
    }
    if adaptive_tags and args.tag is None:
        payload["adaptive_focus"] = adaptive_tags
    if args.mode == "train":
        payload["ideal_behavior"] = drill["ideal_behavior"]
        payload["reject_behavior"] = drill["reject_behavior"]
        payload["note"] = "Nikola-driven training mode: coaching key is visible."
    else:
        payload["note"] = "Nikola-driven exam mode: answer key remains locked until Crow's response is frozen."
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def cmd_next(args: argparse.Namespace) -> None:
    drills = load_drills()
    state = load_state()
    drill, adaptive_tags = select_drill(drills, state, args.tag, args.adaptive == "on")
    state.setdefault("cycle_seen", []).append(drill["id"])
    state.setdefault("selections", []).append({
        "id": drill["id"],
        "mode": args.mode,
        "tag": args.tag,
        "adaptive": args.adaptive,
        "adaptive_tags": adaptive_tags,
        "selected_at": now_iso(),
    })
    save_state(state)

    payload: Dict[str, Any] = {
        "id": drill["id"],
        "task": drill["task"],
        "input": drill["input"],
        "tags": drill.get("tags", []),
        "mode": args.mode,
    }
    if adaptive_tags and args.tag is None:
        payload["adaptive_focus"] = adaptive_tags
        payload["adaptive_reason"] = "Selected from project-local sacrificed/next dimensions."
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
    append_constraint_history(entry)
    print(json.dumps({
        "recorded": True,
        "constraint": entry,
        "history_path": str(HISTORY_PATH),
    }, indent=2, ensure_ascii=False))


def cmd_recommend(args: argparse.Namespace) -> None:
    state = load_state()
    scores = adaptive_tag_scores(state)
    payload: Dict[str, Any] = {
        "project_history": str(HISTORY_PATH),
        "constraint_records": len(state.get("constraints", [])),
        "recommended_tags": [
            {"tag": tag, "weight": weight} for tag, weight in scores.most_common(10)
        ],
    }
    if args.include_external:
        payload["external_prism_history"] = {
            "path": str(EXTERNAL_PRISM_HISTORY),
            "present": EXTERNAL_PRISM_HISTORY.exists(),
            "note": "External history is provenance-bound and is not modified by Crow Trainer.",
        }
        if EXTERNAL_PRISM_HISTORY.exists():
            text = EXTERNAL_PRISM_HISTORY.read_text(encoding="utf-8", errors="replace")
            payload["external_prism_history"]["tail"] = text[-4000:]
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def cmd_history(args: argparse.Namespace) -> None:
    payload: Dict[str, Any] = {
        "crow_history_path": str(HISTORY_PATH),
        "crow_history_present": HISTORY_PATH.exists(),
        "crow_history": HISTORY_PATH.read_text(encoding="utf-8") if HISTORY_PATH.exists() else "",
    }
    if args.include_external:
        payload["external_prism_history_path"] = str(EXTERNAL_PRISM_HISTORY)
        payload["external_prism_history_present"] = EXTERNAL_PRISM_HISTORY.exists()
        payload["external_prism_history"] = (
            EXTERNAL_PRISM_HISTORY.read_text(encoding="utf-8", errors="replace")
            if EXTERNAL_PRISM_HISTORY.exists()
            else ""
        )
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def cmd_report(_: argparse.Namespace) -> None:
    drills = drill_map(load_drills())
    state = load_state()
    results = state.get("results", [])
    verdicts = Counter(r.get("verdict") for r in results)
    tag_stats: Dict[str, Counter] = defaultdict(Counter)
    for result in results:
        for tag in result.get("tags", []):
            tag_stats[tag][result.get("verdict", "unknown")] += 1

    weak = []
    for tag, counts in tag_stats.items():
        attempts = sum(counts.values())
        fail_weight = counts.get("fail", 0) + 0.5 * counts.get("partial", 0)
        if attempts:
            weak.append((fail_weight / attempts, attempts, tag, dict(counts)))
    weak.sort(reverse=True)

    unattempted = [
        drill_id for drill_id in drills
        if not any(result.get("id") == drill_id for result in results)
    ]
    constraints = state.get("constraints", [])
    sacrificed_terms = Counter()
    for constraint in constraints:
        for token in str(constraint.get("sacrificed", "")).lower().replace(",", " ").split():
            token = token.strip(".;:()[]{}")
            if len(token) >= 5:
                sacrificed_terms[token] += 1

    adaptive_scores = adaptive_tag_scores(state)
    payload = {
        "drills_total": len(drills),
        "attempts": len(results),
        "verdicts": dict(verdicts),
        "unattempted": unattempted,
        "weak_tags": [
            {
                "tag": tag,
                "weighted_failure_rate": round(rate, 3),
                "attempts": attempts,
                "verdicts": counts,
            }
            for rate, attempts, tag, counts in weak[:10]
        ],
        "constraint_records": len(constraints),
        "recurring_sacrificed_terms": sacrificed_terms.most_common(12),
        "adaptive_training_tags": adaptive_scores.most_common(10),
        "driver": active_driver(state),
        "driver_events": len(state.get("driver_events", [])),
        "state_path": str(STATE_PATH),
        "history_path": str(HISTORY_PATH),
        "external_prism_history_present": EXTERNAL_PRISM_HISTORY.exists(),
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

    sp = sub.add_parser("driver-status")
    sp.set_defaults(func=cmd_driver_status)

    sp = sub.add_parser("drive")
    sp.add_argument("--mode", choices=("train", "exam"), default="train")
    sp.add_argument("--tag")
    sp.add_argument("--adaptive", choices=("on", "off"), default="on")
    sp.set_defaults(func=cmd_drive)

    sp = sub.add_parser("next")
    sp.add_argument("--mode", choices=("train", "exam"), default="train")
    sp.add_argument("--tag")
    sp.add_argument("--adaptive", choices=("on", "off"), default="on")
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

    sp = sub.add_parser("recommend")
    sp.add_argument("--include-external", action="store_true")
    sp.set_defaults(func=cmd_recommend)

    sp = sub.add_parser("history")
    sp.add_argument("--include-external", action="store_true")
    sp.set_defaults(func=cmd_history)

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
