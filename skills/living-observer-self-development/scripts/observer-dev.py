#!/usr/bin/env python3
import argparse
import json
import os
import sys
from urllib import request, error, parse

BASE = os.environ.get(
    "OBSERVER_DEV_BASE_URL",
    "http://127.0.0.1:3000/api/v1/wayglass/observer/self-development",
).rstrip("/")

def call(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Observer self-development {exc.code}: {body}")
    except OSError as exc:
        raise SystemExit(f"Observer self-development unavailable: {exc}")

def main():
    parser = argparse.ArgumentParser(prog="observer-dev.py")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list")

    p = sub.add_parser("review")
    p.add_argument("--proposal", required=True)
    p.add_argument("--decision", choices=["approve-for-build", "keep-open", "reject"], required=True)
    p.add_argument("--notes", default="")

    args = parser.parse_args()
    if args.command == "list":
        result = call("GET", "/proposals")
    else:
        result = call(
            "POST",
            "/proposals/" + parse.quote(args.proposal, safe="") + "/review",
            {"decision": args.decision, "notes": args.notes},
        )
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")

if __name__ == "__main__":
    main()
