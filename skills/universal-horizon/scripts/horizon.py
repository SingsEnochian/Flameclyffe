#!/usr/bin/env python3
import argparse
import json
import os
import sys
from urllib import parse, request, error

BASE = os.environ.get("HORIZON_BASE_URL", "http://127.0.0.1:3000/api/v1/wayglass/horizon").rstrip("/")

def call(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Horizon {exc.code}: {body}")
    except OSError as exc:
        raise SystemExit(f"Horizon unavailable: {exc}")

def main():
    parser = argparse.ArgumentParser(prog="horizon.py")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("search")
    p.add_argument("query", nargs="?", default="")
    p.add_argument("--claim-type", default="")
    p.add_argument("--record-type", default="")
    p.add_argument("--limit", type=int, default=20)

    p = sub.add_parser("propose")
    p.add_argument("--from", dest="from_id", required=True)
    p.add_argument("--to", dest="to_id", required=True)
    p.add_argument("--relation", required=True)
    p.add_argument("--summary", required=True)
    p.add_argument("--proposer", default="Hermes")
    p.add_argument("--evidence", action="append", default=[])

    p = sub.add_parser("review")
    p.add_argument("--proposal", required=True)
    p.add_argument("--decision", choices=["accept", "reject", "keep-open"], required=True)
    p.add_argument("--reviewer", default="Hermes")
    p.add_argument("--notes", default="")
    p.add_argument("--evidence", action="append", default=[])

    sub.add_parser("status")
    sub.add_parser("proposals")

    args = parser.parse_args()
    if args.command == "search":
        query = parse.urlencode({"q": args.query, "claim_type": args.claim_type, "record_type": args.record_type, "limit": args.limit})
        result = call("GET", "/search?" + query)
    elif args.command == "propose":
        result = call("POST", "/proposals", {
            "from_id": args.from_id, "to_id": args.to_id, "relation_type": args.relation,
            "summary": args.summary, "proposer": args.proposer, "evidence_refs": args.evidence,
        })
    elif args.command == "review":
        result = call("POST", "/reviews", {
            "proposal_id": args.proposal, "decision": args.decision,
            "reviewer": args.reviewer, "notes": args.notes, "evidence_refs": args.evidence,
        })
    elif args.command == "proposals":
        result = call("GET", "/proposals")
    else:
        result = call("GET", "/status")
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")

if __name__ == "__main__":
    main()
