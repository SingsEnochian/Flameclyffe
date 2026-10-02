#!/usr/bin/env python3
"""Crow Trainer / Hermes connection doctor.

Read-only diagnostics. It never prints API keys, tokens, passwords, or full config files.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

TIMEOUT = 20
PROBE_TIMEOUT = 45
HOME = Path.home()
HERMES_HOME = Path(os.environ.get("HERMES_HOME", HOME / ".hermes"))
LOG = HERMES_HOME / "logs" / "agent.log"

def scrub_output(text: str) -> str:
    """Redact likely secrets before diagnostic command output is emitted."""
    redactions = [
        (r"(?i)(authorization:\\s*bearer\\s+)[^\\s]+", r"\\1<redacted>"),
        (r"(?i)((?:api[_-]?key|token|password|secret)\\s*[:=]\\s*)[^\\s,;]+", r"\\1<redacted>"),
        (r"\\bsk-[A-Za-z0-9_-]{12,}\\b", "<redacted-key>"),
        (r"\\b(?:hf_|ghp_|github_pat_)[A-Za-z0-9_-]{12,}\\b", "<redacted-token>"),
        (r"(https?://)[^/@\\s:]+:[^/@\\s]+@", r"\\1<redacted>@"),
    ]
    clean = text
    for pattern, replacement in redactions:
        clean = re.sub(pattern, replacement, clean)
    return clean

def run(label: str, args: list[str], *, required: bool = False, timeout: int = TIMEOUT) -> dict:
    try:
        proc = subprocess.run(args, text=True, capture_output=True, timeout=timeout, check=False)
        output = "\n".join(part for part in (proc.stdout.strip(), proc.stderr.strip()) if part)
        return {"label": label, "ok": proc.returncode == 0, "required": required, "code": proc.returncode, "output": scrub_output(output[-4000:])}
    except FileNotFoundError:
        return {"label": label, "ok": False, "required": required, "code": None, "output": "command not found"}
    except subprocess.TimeoutExpired:
        return {"label": label, "ok": False, "required": required, "code": None, "output": f"timed out after {timeout}s"}

def classify_log(text: str) -> list[dict]:
    findings = []
    patterns = [
        (r"Could not open a stream to\s+(\S+)\s+after\s+(\d+)\s+attempt", "stream-connect-failed",
         "Endpoint could not produce a stream event. If a fresh short chat works but a long session fails, compress context; otherwise verify the configured base URL and retry."),
        (r"(?i)401|invalid credentials|unauthori[sz]ed", "authentication",
         "The contacted service rejected authentication. Re-check the selected provider/account rather than rotating unrelated credentials."),
        (r"(?i)403|forbidden|permission denied", "authorization",
         "Authentication reached the service but the selected account/model/route was not authorised. Verify provider/model entitlement and the active Hermes auth profile."),
        (r"(?i)429|rate.?limit|too many requests|quota", "rate-limit",
         "The provider is reachable but throttling or quota-limiting requests. Retry after the provider window resets or choose another authorised provider/model."),
        (r"(?i)5\\d\\d|bad gateway|service unavailable|upstream.*error", "upstream",
         "The route reached an upstream service that failed. A short fresh query helps distinguish transient provider failure from session-specific failure."),
        (r"(?i)ssl|tls|certificate verify|certificate.*failed", "tls",
         "TLS/certificate validation failed. Check system clock, interception/VPN software, certificate store, and the configured HTTPS endpoint."),
        (r"(?i)connection refused|timed out|timeout|name or service not known|temporary failure in name resolution|dns", "transport",
         "Transport/DNS endpoint reachability failed. Verify the selected base URL, network/VPN/firewall, then retry."),
        (r"(?i)websocket|stream.*reset|connection reset|broken pipe|remote.*closed", "stream-transport",
         "The connection opened but the streaming channel was interrupted. Compare a short one-shot probe with the affected session and inspect proxies/VPNs if the probe also fails."),
        (r"(?i)context.*(?:length|window)|too many tokens|token.*limit|request.*(?:KB|MB)|payload.*(?:large|size)|body.*(?:large|limit)", "request-size",
         "The request/session may exceed the model or proxy limit. A short new chat is the useful control; compress the long session before retrying."),
        (r"(?i)404|model.*not found|unknown model|endpoint.*not found", "route-or-model",
         "The service was reached but the selected endpoint/model was not found. Verify the configured base URL and model identifier."),
        (r"(?i)computer.use|cua-driver", "computer-use",
         "Computer-use surfaced in recent logs. Compare with the dedicated computer-use doctor below."),
    ]
    for regex, kind, advice in patterns:
        match = re.search(regex, text)
        if match:
            findings.append({"kind": kind, "evidence": match.group(0)[:180], "advice": advice})
    return findings

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only Hermes/Crow Trainer connection diagnostics.")
    parser.add_argument(
        "--probe",
        action="store_true",
        help="Also send one minimal live Hermes query to distinguish provider/stream failures from local configuration failures.",
    )
    return parser.parse_args()

def main() -> int:
    args = parse_args()
    hermes = shutil.which("hermes")
    report = {
        "schema": "crow-trainer.hermes-connection-doctor/v0.1",
        "hermes_executable": hermes,
        "hermes_home_exists": HERMES_HOME.exists(),
        "checks": [],
        "recent_log_findings": [],
        "proxy_environment": {
            "HTTP_PROXY_present": bool(os.environ.get("HTTP_PROXY") or os.environ.get("http_proxy")),
            "HTTPS_PROXY_present": bool(os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")),
            "NO_PROXY_present": bool(os.environ.get("NO_PROXY") or os.environ.get("no_proxy")),
        },
        "live_probe_requested": args.probe,
    }

    if not hermes:
        report["checks"].append({"label": "Hermes executable", "ok": False, "required": True, "output": "hermes is not on PATH"})
    else:
        report["checks"].extend([
            run("Hermes version", [hermes, "--version"], required=True),
            run("Hermes doctor", [hermes, "doctor"]),
            run("Enabled tools", [hermes, "tools", "--summary"], required=True),
            run("Computer-use status", [hermes, "computer-use", "status"]),
            run("Computer-use doctor", [hermes, "computer-use", "doctor", "--json"]),
        ])
        if args.probe:
            probe = run(
                "Minimal live chat probe",
                [hermes, "chat", "-q", "Reply exactly HERMES_CONNECTION_OK and nothing else."],
                timeout=PROBE_TIMEOUT,
            )
            probe["probe"] = True
            report["checks"].append(probe)
            if not probe["ok"]:
                report["probe_findings"] = classify_log(probe.get("output", ""))

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
    probe_failed = args.probe and any(item.get("probe") and not item.get("ok") for item in report["checks"])
    if hermes and failed:
        return 1
    if probe_failed:
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
