# Run Wayglass directly in Hearthgate

From the Flameclyffe repository root, with Node 24 and local Ollama running:

```powershell
git fetch origin
git switch rarity/wayglass-inheritance-host-v1
git pull --ff-only
npm ci
npm ci --prefix apps/starwell-server
$env:WAYGLASS_LOCAL_MODEL = 'ornith-1.5'
npm run wayglass:hearthgate
```

Use the exact installed Ollama model tag if different. Open http://127.0.0.1:3000/wayglass/ and choose Local Model. The command builds/stages the browser and shared runtime, then starts the existing loopback-hardened Hearthgate core. No Vercel connection is needed. Stop with Ctrl+C.

The desktop build and electron:dev now stage Wayglass first. Router runtime modules are copied inside the Hearthgate package and unpacked alongside the server. Hearthgate navigation includes Wayglass. Existing installations need an updated package; this source change does not update an installed Windows executable remotely.

Verification: 65 focused tests pass, including loading the packaged router from an isolated directory without repository siblings. Browser build and server staging pass. A Windows installer build and Rowan's live Ollama turn have not been executed here. Accepted evidence and authenticated inbox adapters remain host configuration requirements; starting the local UI does not silently install those adapters or manufacture accepted deeds.
