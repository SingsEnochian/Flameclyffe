#!/usr/bin/env python3
"""Crow Trainer / Hermes connection doctor.

Read-only diagnostics. It never prints API keys, tokens, passwords, or full config files.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

TIMEOUT = 20
HOME = Path.home()
HERMES_HOME = Path(os.environ.get("HERMES_HOME", HOME / ".hermes"))
LOG = HERMES_HOME / "logs" / "agent.log"

def run(label: str, args: list[str], *, required: bool = False) -> dict:
    try:
        proc = subprocess.run(args, text=True, capture_output=True, timeout=TIMEOUT, check=False)
        output = "\n".join(part for part in (proc.stdout.strip(), proc.stderr.strip()) if part)
        return {"label": label, "ok": proc.returncode == 0, "required": required, "code": proc.returncode, "output": output[-4000:]}
    except FileNotFoundError:
        return {"label": label, "ok": False, "required": required, "code": None, "output": "command not found"}
    except subprocess.TimeoutExpired:
        return {"label": label, "ok": False, "required": required, "code": None, "output": f"timed out after {TIMEOUT}s"}

def classify_log(text: str) -> list[dict]:
    findings = []
    patterns = [
        (r"Could not open a stream to\s+(\S+)\s+after\s+(\d+)\s+attempt", "stream-connect-failed",
         "Endpoint could not produce a stream event. If a fresh short chat works but a long session fails, compress context; otherwise verify the configured base URL and retry."),
        (r"(?i)401|invalid credentials|unauthori[sz]ed", "authentication",
         "The contacted service rejected authentication. Re-check the selected provider/account rather than rotating unrelated credentials."),
        (r"(?i)connection refused|timed out|timeout|name or service not known|temporary failure in name resolution", "transport",
         "Transport/DNS endpoint reachability failed. Verify the selected base URL, network/VPN/firewall, then retry."),
        (r"(?i)request.*(?:KB|MB)|payload.*(?:large|size)|body.*(?:large|limit)", "request-size",
         "The request may be too large for the endpoint/proxy. A short new chat is the useful control; compress a long session before retrying."),
        (r"(?i)computer.use|cua-driver", "computer-use",
         "Computer-use surfaced in recent logs. Compare with the dedicated computer-use doctor below."),
    ]
    for regex, kind, advice in patterns:
        match = re.search(regex, text)
        if match:
            findings.append({"kind": kind, "evidence": match.group(0)[:180], "advice": advice})
    return findings

def main() -> int:
    hermes = shutil.which("hermes")
    report = {
        "schema": "crow-trainer.hermes-connection-doctor/v0.1",
        "hermes_executable": hermes,
        "hermes_home_exists": HERMES_HOME.exists(),
        "checks": [],
        "recent_log_findings": [],
    }

    if not hermes:
        report["checks"].append({"label": "Hermes executable", "ok": False, "required": True, "output": "hermes is not on PATH"})
    else:
        report["checks"].extend([
            run("Hermes version", [hermes, "--version"], required=True),
            run("Enabled tools", [hermes, "tools", "--summary"], required=True),
            run("Computer-use status", [hermes, "computer-use", "status"]),
            run("Computer-use doctor", [hermes, "computer-use", "doctor", "--json"]),
        ])

    if LOG.exists():
        try:
            lines = LOG.read_text(encoding="utf-8", errors="replace").splitlines()[-500:]
            report["recent_log_findings"] = classify_log("\n".join(lines))
            report["log_path"] = str(LOG)
            report["log_lines_inspected"] = len(lines)
        except OSError as exc:
            report["recent_log_findings"] = [{"kind": "log-read-error", "evidence": str(exc), "advice": "Inspect the Hermes log manually."}]
    else:
        report["log_path"] = str(LOG)
        report["log_lines_inspected"] = 0

    print(json.dumps(report, indent=2))
    failed = [item for item in report["checks"] if item.get("required") and not item.get("ok")]
    return 1 if hermes and failed else 0

if __name__ == "__main__":
    raise SystemExit(main())
