# Lanternwatch

Lanternwatch is a small, local-first Windows network observer for GABRIEL. It does not disable Xfinity security, alter the router, intercept packet contents, or transmit telemetry. It records new established TCP connections and maps them to the Windows process that opened them.

Its first job is simple: when Xfinity sends an alert to Dad's phone, compare the alert time with Lanternwatch's log and identify what GABRIEL was actually doing.

## What it records

Each JSONL entry contains:

- UTC timestamp
- computer name
- process name and PID
- local address and port
- remote address and port
- connection state
- a lightweight classification

Classifications are:

- `expected-process`: a configured development program such as Node, Git, Ollama, Python, Docker, or VS Code
- `expected-port`: traffic on a configured development/service port
- `local-or-ignored`: loopback, private-LAN, or another ignored address
- `review`: not yet recognised and worth examining

A classification is context, not proof that a connection is safe. Lanternwatch deliberately keeps the human in the loop.

## Setup

From PowerShell in the Flameclyffe repository:

```powershell
cd tools/lanternwatch
Copy-Item config.example.json config.json
```

Edit `config.json` to match the programs GABRIEL actually uses. Do not add an unfamiliar executable merely to silence a warning.

Run one snapshot:

```powershell
powershell -ExecutionPolicy Bypass -File .\lanternwatch.ps1 -Once
```

Run continuously every five seconds:

```powershell
powershell -ExecutionPolicy Bypass -File .\lanternwatch.ps1
```

Use a different interval:

```powershell
powershell -ExecutionPolicy Bypass -File .\lanternwatch.ps1 -IntervalSeconds 10
```

Administrator PowerShell may provide more complete process visibility. Lanternwatch should still run without elevation, though some process names may appear as `unknown`.

## Correlating an Xfinity alert

1. Dad opens the Xfinity notification and records or screenshots the exact local time, device, destination/domain/IP, and threat description.
2. Convert the alert time to UTC if needed. In PowerShell:

```powershell
(Get-Date '2026-07-11 08:30').ToUniversalTime()
```

3. Search that day's log around the timestamp:

```powershell
Get-Content .\logs\lanternwatch-2026-07-11.jsonl |
  ConvertFrom-Json |
  Where-Object { $_.timestamp_utc -ge '2026-07-11T12:29:00Z' -and $_.timestamp_utc -le '2026-07-11T12:31:00Z' } |
  Format-Table timestamp_utc, process, remote_address, remote_port, classification
```

4. Compare the destination with the activity underway at that moment, such as an Ollama model pull, Git operation, package install, Supabase request, or browser download.

## Limits

Lanternwatch v0.1 observes established TCP connections visible to Windows. It may miss very short-lived connections between polling intervals, UDP traffic, domain names hidden behind cached DNS, browser tabs sharing one process, or traffic inside some virtual machines/containers.

Future steps can add Windows DNS-client events, Defender and Firewall event logs, signed-process verification, reverse-DNS enrichment, a local dashboard, and an optional timestamp button labelled `Xfinity complained now`.

## Security posture

Lanternwatch is an observatory, not a blindfold. Keep Windows Defender and the Windows Firewall enabled. Do not permanently disable Xfinity Advanced Security until the exact blocked destination and reason have been reviewed.
