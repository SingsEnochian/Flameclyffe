# STARWELL Developer Interface v0.1

Laptop-local developer workbench for Yggdrasil.

This interface is intentionally a UI shell first. It provides visible panels for direct chat preview, router command listing, adapter status, Action Ledger preview, Bridgehall group chat participants, Router Trace, and Patch Tray.

Guardrails:

- No background model calls.
- No hidden persistence.
- No browser-held private configuration.
- No write actions from chat mode.
- No public deploy assumptions.

Named local routes for the next backend pass:

- Chat
- Router
- Command list
- Adapter status
- Ledger
