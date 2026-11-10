# Install missing locked dependencies and launch local Wayglass Observer on Windows.
param([switch]$Doctor, [switch]$Tailnet)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $Root
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 first.' }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm not found.' }
    $Major = [int]((node --version).TrimStart('v').Split('.')[0])
    if ($Major -lt 24) { throw 'Node.js 24 or newer is required.' }
    if (-not (Test-Path 'node_modules/vite/bin/vite.js')) {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw 'Root npm ci failed.' }
    }
    if (-not (Test-Path 'apps/starwell-server/node_modules/express')) {
        npm ci --prefix apps/starwell-server
        if ($LASTEXITCODE -ne 0) { throw 'Hearthgate npm ci failed.' }
    }
    if ($Tailnet) {
        if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) { throw 'Tailscale CLI not found. Install/connect Tailscale on this Windows machine.' }
        $statusJson = & tailscale status --json
        if ($LASTEXITCODE -ne 0) { throw 'Tailscale is not connected. Log in with the Tailscale app first.' }
        $tail = ($statusJson | Out-String | ConvertFrom-Json)
        $dns = [string]$tail.Self.DNSName
        $dns = $dns.TrimEnd('.')
        if ($dns -notmatch '^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.ts\.net
    if ($LASTEXITCODE -ne 0) { throw "Launcher exited with code $LASTEXITCODE." }
} finally { Pop-Location }
) { throw 'No valid Tailscale MagicDNS name found.' }
        $origin = "https://$dns"
        $env:WAYGLASS_TAILNET_ORIGIN = $origin
        $origins = @(([string]$env:HEARTHGATE_ALLOWED_ORIGINS).Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        if ($origins -notcontains $origin) { $origins += $origin }
        $env:HEARTHGATE_ALLOWED_ORIGINS = ($origins -join ',')
        $orion = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M'
        if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw 'Ollama is not installed or not on PATH.' }
        & ollama show $orion | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'The exact local Orion model was not found. Check ollama list before launching.' }
        # The three environment names are legacy-compatible aliases of ONE model.
        $env:WAYGLASS_SPINE_MODEL = $orion
        $env:WAYGLASS_SHIP_MODEL = $orion
        $env:WAYGLASS_AMBER_MODEL = $orion
        if (-not $Doctor) {
            npm run wayglass:deploy:server
            if ($LASTEXITCODE -ne 0) { throw 'Wayglass web build or host stage failed. Tailnet Serve was not started.' }
        }
    }
    if ($Doctor) { node scripts/wayglass-local.mjs --doctor }
    elseif ($Tailnet) { node scripts/wayglass-local.mjs --tailnet }
    else { node scripts/wayglass-local.mjs }
    if ($LASTEXITCODE -ne 0) { throw "Launcher exited with code $LASTEXITCODE." }
} finally { Pop-Location }
