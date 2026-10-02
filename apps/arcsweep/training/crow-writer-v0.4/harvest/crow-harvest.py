#!/usr/bin/env python3
"""Crow Writer harvest CLI.

Turns author-reviewed co-writing records into reproducible SFT, preference, and
held-out JSONL. Nothing marked pending/reject/mixed is exported for training.

No network calls. No credentials required.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Iterable

MODES = {"DRAFT","DIAGNOSE","DRILL","VARIANTS","REVISE","COMPARE","CANON","HARVEST"}
DECISIONS = {"pending","keep","reject","mixed"}
CANON = {"not-canon","candidate","canon","conflicted"}

REQUIRED = {
    "id","mode","prompt","candidate","author_decision",
    "tags","project","source_ref","canon_status"
}

SECRET_PATTERNS = [
    re.compile(r"\bhf_[A-Za-z0-9_-]{12,}\b"),
    re.compile(r"\bsk-(?:proj-|ant-|or-)?[A-Za-z0-9_.-]{16,}\b"),
    re.compile(r"\bsb_secret_[A-Za-z0-9_-]{12,}\b"),
    re.compile(r"\bntn_[A-Za-z0-9_-]{12,}\b"),
    re.compile(r"\b(?:aws_)?secret_access_key\b\s*[:=]", re.I),
    re.compile(r"\bdiscord token\b\s*[:=]", re.I),
    re.compile(r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----"),
]

def load_jsonl(path: Path) -> list[dict]:
    rows=[]
    if not path.exists():
        return rows
    for n,line in enumerate(path.read_text(encoding="utf-8").splitlines(),1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as e:
            raise SystemExit(f"{path}:{n}: invalid JSON: {e}")
    return rows

def dump_jsonl(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows),
        encoding="utf-8",
    )

def all_text(row: dict) -> str:
    bits=[]
    for k,v in row.items():
        if isinstance(v,str):
            bits.append(v)
        elif isinstance(v,list):
            bits.extend(str(x) for x in v)
    return "\n".join(bits)

def validate_row(row: dict, seen: set[str]) -> list[str]:
    errs=[]
    missing=sorted(REQUIRED - set(row))
    if missing:
        errs.append("missing fields: " + ", ".join(missing))
        return errs
    if not isinstance(row["id"],str) or not row["id"].strip():
        errs.append("id must be non-empty string")
    elif row["id"] in seen:
        errs.append("duplicate id")
    if row["mode"] not in MODES:
        errs.append(f"invalid mode {row['mode']!r}")
    if row["author_decision"] not in DECISIONS:
        errs.append(f"invalid author_decision {row['author_decision']!r}")
    if row["canon_status"] not in CANON:
        errs.append(f"invalid canon_status {row['canon_status']!r}")
    if not isinstance(row["tags"],list) or not all(isinstance(x,str) for x in row["tags"]):
        errs.append("tags must be array of strings")
    if row.get("sensitive"):
        errs.append("sensitive=true: record cannot enter training corpus")
    txt=all_text(row)
    if any(p.search(txt) for p in SECRET_PATTERNS):
        errs.append("possible credential/secret detected")
    return errs

def validate(rows: list[dict]) -> None:
    seen=set()
    problems=[]
    for idx,row in enumerate(rows,1):
        errs=validate_row(row,seen)
        if row.get("id"):
            seen.add(row["id"])
        if errs:
            problems.append((idx,row.get("id","?"),errs))
    if problems:
        for idx,rid,errs in problems:
            print(f"ROW {idx} {rid}: " + "; ".join(errs))
        raise SystemExit(2)
    print(json.dumps({"event":"validation_pass","records":len(rows)}))

def deterministic_holdout(row_id: str, seed: str, percent: int) -> bool:
    h=hashlib.sha256(f"{seed}:{row_id}".encode()).digest()
    return int.from_bytes(h[:4],"big") % 100 < percent

def export(rows: list[dict], out: Path, seed: str, holdout_percent: int) -> None:
    validate(rows)
    approved=[r for r in rows if r["author_decision"]=="keep" and not r.get("sensitive",False)]
    pending=[r for r in rows if r["author_decision"]!="keep"]

    train=[]
    held=[]
    prefs=[]

    for r in approved:
        forced=r.get("holdout")
        is_holdout = forced if isinstance(forced,bool) else deterministic_holdout(r["id"],seed,holdout_percent)

        record = {
            "id": r["id"],
            "mode": r["mode"],
            "project": r["project"],
            "tags": r["tags"],
            "source_ref": r["source_ref"],
            "canon_status": r["canon_status"],
            "messages": [
                {"role":"user","content":r["prompt"]},
                {"role":"assistant","content":r.get("preferred_text") or r["candidate"]},
            ],
            "author_note": r.get("author_note",""),
        }

        if is_holdout:
            held.append(record)
        else:
            train.append(record)

        chosen=r.get("preferred_text")
        rejected=r.get("rejected_text")
        if chosen and rejected and not is_holdout:
            prefs.append({
                "id": r["id"],
                "prompt": r["prompt"],
                "chosen": chosen,
                "rejected": rejected,
                "preference_reason": r.get("preference_reason") or r.get("author_note",""),
                "tags": r["tags"],
                "project": r["project"],
                "source_ref": r["source_ref"],
            })

    dump_jsonl(out/"sft.approved.jsonl",train)
    dump_jsonl(out/"preferences.approved.jsonl",prefs)
    dump_jsonl(out/"heldout.approved.jsonl",held)

    receipt={
        "schema":"crow.writer-harvest-export/v0.1",
        "seed":seed,
        "holdout_percent":holdout_percent,
        "records_total":len(rows),
        "approved_total":len(approved),
        "not_approved_total":len(pending),
        "sft_train":len(train),
        "preferences_train":len(prefs),
        "heldout":len(held),
        "heldout_ids":[x["id"] for x in held],
    }
    (out/"export-receipt.json").write_text(json.dumps(receipt,indent=2),encoding="utf-8")
    print(json.dumps({"event":"export_complete",**receipt}))

def review(path: Path, rid: str, decision: str, note: str | None) -> None:
    if decision not in DECISIONS:
        raise SystemExit(f"invalid decision: {decision}")
    rows=load_jsonl(path)
    found=False
    for r in rows:
        if r.get("id")==rid:
            r["author_decision"]=decision
            if note is not None:
                r["author_note"]=note
            found=True
            break
    if not found:
        raise SystemExit(f"record not found: {rid}")
    dump_jsonl(path,rows)
    print(json.dumps({"event":"review_updated","id":rid,"decision":decision}))

def stats(rows: list[dict]) -> None:
    from collections import Counter
    print(json.dumps({
        "records":len(rows),
        "decisions":Counter(r.get("author_decision","missing") for r in rows),
        "modes":Counter(r.get("mode","missing") for r in rows),
        "projects":Counter(r.get("project","missing") for r in rows),
    }, default=dict, indent=2))

def main():
    ap=argparse.ArgumentParser()
    sub=ap.add_subparsers(dest="cmd",required=True)

    p=sub.add_parser("validate")
    p.add_argument("queue",type=Path)

    p=sub.add_parser("stats")
    p.add_argument("queue",type=Path)

    p=sub.add_parser("review")
    p.add_argument("queue",type=Path)
    p.add_argument("--id",required=True)
    p.add_argument("--decision",required=True,choices=sorted(DECISIONS))
    p.add_argument("--note")

    p=sub.add_parser("export")
    p.add_argument("queue",type=Path)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--seed",default="rowan-crow-v01")
    p.add_argument("--holdout-percent",type=int,default=20,choices=range(15,21),metavar="15..20")

    a=ap.parse_args()
    rows=load_jsonl(a.queue)

    if a.cmd=="validate":
        validate(rows)
    elif a.cmd=="stats":
        stats(rows)
    elif a.cmd=="review":
        review(a.queue,a.id,a.decision,a.note)
    elif a.cmd=="export":
        export(rows,a.out,a.seed,a.holdout_percent)

if __name__=="__main__":
    main()
