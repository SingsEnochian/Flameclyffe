# Wayglass Living Observer: Windows local launch

Source: PR #446, stacked above Video Atelier #445. Runs locally, not on GitHub Pages.

From the Flameclyffe repository root in PowerShell:

    git fetch origin
    git switch rarity/wayglass-living-observer-20261008
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Wayglass.ps1

Open http://127.0.0.1:5186/?room=observer on that computer.
Node.js 24 is required. The PowerShell script installs missing locked dependencies, starts a loopback-only
Hearthgate server on port 3000 and Vite on 5186. It probes Ollama on 11434 and automatically
uses an installed Ornith model first, Codebooga if present, or another reported local model.
Set WAYGLASS_LOCAL_MODEL to override explicitly. No inference runs until the user submits a Writing Room turn.

Non-mutating health check after installing dependencies:

    node scripts/wayglass-local.mjs --doctor

Smoke: open Observer, select nine channels, rotate glass, test Low Stim and Sound, change rooms.
Then check the Writing Room route catalogue and explicitly submit one harmless local model turn.
Use Send reading to Writing Room, review and edit the packet before submitting.
The visual instrument works without Ollama. A registered route is not proof that it responds.

Do not claim remote deployment, a trained native LLM, or real GPU-backed video rendering.
GitHub Pages only publishes main; this draft stays on its review branch.
