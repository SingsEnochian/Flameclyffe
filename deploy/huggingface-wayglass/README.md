---
title: Wayglass Kernel Entrance
emoji: 💎
colorFrom: blue
colorTo: green
sdk: gradio
app_file: app.py
pinned: false
---
# Wayglass kernel entrance
This is a *deployment candidate*, not an active kernel. Configure Space secrets `WAYGLASS_GATEWAY_URL` and `WAYGLASS_GATEWAY_TOKEN`. The private gateway must implement POST /api/wayglass/ask with an authenticated, attributed kernel response: `{"source":"wayglass-kernel","receipt_id":"...","reply":"..."}`. Do not publish owner-only access without a separate identity gate. Never return simulated Wayglass speech.
