# Wayglass Video Atelier × LTX Desktop (2026-10-08)

Status: **implemented in draft branch; local GPU execution not yet observed**.
Owner: Rowan/Rarity, Wayglass media organ.
External upstream: https://github.com/Lightricks/LTX-Desktop (read-only, beta).
Reference surfaces: upstream README, LICENSE.txt, backend/api_types.py, backend/_routes/{generation,health,runtime_policy,settings}.py, backend/app_factory.py, backend/state/app_settings.py.
Upstream application licence: Apache-2.0. Model weights and third-party resources have separate terms; users must accept relevant Hugging Face licences before local downloads.

## Whole-system end state

Wayglass needs a replaceable media organ able to prepare and render cinematic transformations without impersonating participants, modifying the continuity kernel, or making billed API calls silently. The chosen boundary is **Wayglass Video Atelier → exported scene job → opt-in local companion → authenticated LTX Desktop backend → verified video asset + non-canonical receipt**. LTX remains a GPU engine, never Wayglass identity/canon authority.

This implementation deliberately does not clone/copy LTX application code or weights. It uses the observed FastAPI routes via a loopback-only client, maintaining distinct ownership and attribution. No Vercel dependency.

### Component responsibilities

| Owner | Public interface | Responsibility and authority |
| --- | --- | --- |
| apps/wayglass/src/ltx-desktop-bridge.js | WayglassVideoAtelier.prepare, validateVideoHandoff, LtxDesktopLocalClient.probe/render | Scene job contract, strict local-mode checks, render request and engine receipt. No durable identity or canon changes. |
| apps/wayglass/src/surfaces/video-atelier.js | mountWayglassVideoAtelier | Accessible room navigation, editable crossing prompt, explicit export and copy. No credentials, generation, automatic upload or hidden billing. |
| apps/wayglass/scripts/ltx-desktop-render.mjs | CLI with optional --render, --start, --end | Local filesystem ownership, opt-in generation, path verification, non-overwriting receipt file. |
| LTX Desktop | GET /api/runtime-policy, GET /api/settings, GET /health, POST /api/generate | Authentication, GPU model loading, rendering and engine-produced asset. Third-party runtime owns these effects. |
| Wayglass kernel | Existing participant and continuation contracts | Identity, continuity and canon stay untouched. An image/video appearance does not become a declaration. |

### Journey and failure behaviour

1. Open Video Atelier from Writing Room or Organs. Edit the Twilight glass-crossing prompt, export wayglass-twilight-mirror.ltx.json. It remains a **prepared** job.
2. Inspect source and edit the prompt. For a controlled pony → human crossing, prepare separate opening and final images; the optional CLI --start and --end pass absolute paths only with the user's explicit action.
3. Open LTX Desktop on the **same machine**. On Windows, local generation needs NVIDIA CUDA, at least 16 GB VRAM, 16 GB RAM (32 GB recommended), and approximately 160 GB free storage. Obtain the per-launch bearer token from the LTX Desktop Logs footer token control as described in upstream performance docs. Do not copy it into Wayglass source, chat, scene JSON or remote hosting.
4. Execute the companion. By default it is a dry run and sends **zero network requests**. With --render it checks loopback origin, backend authentication, forced cloud policy and saved preference; unknown or cloud-preferred settings refuse before submitting the video POST.
5. The engine responds synchronously. The companion verifies the returned local video file is present and nonempty, then writes a sidecar JSON receipt using exclusive create (existing receipts are not overwritten). LTX's HTTP success alone is **not** proof the local video file exists.
6. If the user lacks suitable GPU/resources, keep the prepared scene. Never invoke the LTX paid API as a fallback. Video file, participant canon, model weights, Wayglass deployment and other applications are not mutated by a dry run.

### Windows PowerShell usage

From the Flameclyffe repository root:

~~~powershell
npm run wayglass:dev
# Open Video Atelier, export the scene job, then stop or leave the UI open.

# Launch LTX Desktop separately; ensure Settings > Models has local weights ready.
# Copy the per-launch session token from LTX Desktop Logs footer.
$env:WAYGLASS_LTX_SESSION_TOKEN = Read-Host 'LTX Desktop session token'
# Default backend port is 41954; only change this if the local LTX process uses a different port.
$env:WAYGLASS_LTX_ENDPOINT = 'http://127.0.0.1:41954'

# Safe inspection: no rendering, no calls to LTX.
node apps/wayglass/scripts/ltx-desktop-render.mjs .\wayglass-twilight-mirror.ltx.json

# Explicitly render on local GPU, no billed API fallback:
node apps/wayglass/scripts/ltx-desktop-render.mjs .\wayglass-twilight-mirror.ltx.json --render

# Optional frame-anchored transformation:
node apps/wayglass/scripts/ltx-desktop-render.mjs .\wayglass-twilight-mirror.ltx.json --start 'C:\art\pony.png' --end 'C:\art\human.png' --render

# Remove the shell variable afterward:
Remove-Item Env:WAYGLASS_LTX_SESSION_TOKEN
~~~

The exported handoff is a Wayglass job, **not** a file LTX Desktop itself imports. The companion translates it to the strict LTX GenerateVideoRequest including imagePath/lastImagePath if supplied. LTX app updates may require adapter changes: this is a beta integration.

## Persistence, authority, security and reversibility

- Wayglass UI only downloads a user-reviewed JSON job. It has no LTX token and does not open remote endpoints.
- The companion accepts only plain HTTP loopback and an explicitly supplied bearer token; no scraping or reading of LTX credential storage. Auth errors block. GET /api/settings must explicitly report cloud preference **false**, and GET /api/runtime-policy must explicitly report forced cloud mode **false**. Both checks precede any POST.
- Neither a render nor a prompt is an identity declaration, participation claim, or canon grant. Source provenance is separate from output. Rendering tools cannot answer emergence questions on behalf of characters.
- Remote/Mac/iPad Wayglass can prepare and export jobs but cannot run local Windows GPU rendering through a remote web deployment. Later a separately authorised local companion transport could carry them after review, without exposing a LAN service or browser token.
- The scene job can be reconstructed or discarded. Existing Wayglass worlds and storage require no schema migration. The local render is replaceable with another engine behind the Video Atelier contract.
- Feather/Icarus before generation simply means **do not pass --render**. Once generation starts, this companion does not yet expose a live cancellation control; use LTX Desktop's own cancellation UI. This is a stated limitation, not claimed support.

## Verification and limits

Synthetic Node tests cover scene-job validation, malformed inputs, loopback-only transport, missing credentials, paid mode, cloud preference, a successful LTX response, optional frames, cancellation and receipt status. GitHub CI is the engineering gate, not Vercel. A real video requires installed LTX Desktop, accepted model-weight terms, compatible GPU, valid per-launch token, a successful engine response and a nonempty output file; **none are claimed by this PR alone**.

Next integration boundary: after a verified local render, extend Wayglass's existing attachment/provenance mechanisms to register the output as media without modifying the authoritative participant record; implement controllable progress/cancellation and a user-approved local companion lifecycle. Avoid a second persona system or hidden auto-cloud billing.
