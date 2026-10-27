# Wayglass N-010 canonical Hearthgate portal. No Vercel, no legacy Vite 5186 server.
# Stages the latest local Wayglass build into Hearthgate and serves ONE origin for UI + API.
param(
  [switch]$Doctor,
  [ValidateRange(1024,65535)][int]$Port = 3841
)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Url = "http://127.0.0.1:$Port/wayglass/?room=observer"
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
    $taken = $false
    $socket = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $socket.BeginConnect('127.0.0.1', $Port, $null, $null)
        if ($connect.AsyncWaitHandle.WaitOne(400)) {
            try { $socket.EndConnect($connect); $taken = $true } catch { $taken = $false }
        }
    } finally { $socket.Close() }
    if ($taken) {
        throw "Port $Port is already occupied. Stop the existing host before launching this verified N-010 Wayglass. Do not silently reuse an old portal."
    }
    if ($Doctor) {
        Write-Host "[Wayglass] N-010 Hearthgate portal is ready to stage. Port $Port is free."
        Write-Host "[Wayglass] Target: $Url"
        return
    }
    Write-Host '[Wayglass] Building and staging N-010 into local Hearthgate. Bluebird authorisation is not required to enter the Observer.'
    npm run wayglass:deploy:server
    if ($LASTEXITCODE -ne 0) { throw 'Wayglass build/stage failed; server not launched.' }
    $builtIndex = Join-Path $Root 'apps/starwell-server/public/wayglass/index.html'
    if (-not (Test-Path $builtIndex)) { throw 'Staged Wayglass index missing.' }
    if (-not (Select-String -Path $builtIndex -Pattern 'name="wayglass-ui-revision" content="living-observer-n010"' -SimpleMatch -Quiet)) {
        throw 'Staged portal does not contain the N-010 revision marker. Refusing to launch a legacy site.'
    }
    if (-not (Select-String -Path $builtIndex -Pattern 'name="wayglass-ui-capabilities" content="n012-three-hud-geometry-invariants-crew"' -SimpleMatch -Quiet)) {
        throw 'Staged Wayglass is missing the N-012 Three.js + invariant-trial capability marker. Refusing to launch stale UI.'
    }
    Write-Host '[Wayglass] Verified staged N-012 optical deck + geometry invariants + named Crew.'
    if (-not (Select-String -Path $builtIndex -Pattern 'name="wayglass-ui-generation" content="n013-unified-hull-spatial-classic-inheritance-fix"' -SimpleMatch -Quiet)) {
        throw 'Staged portal does not have the N-013 shared optical design and route repair marker. Refusing stale startup.'
    }
    Write-Host '[Wayglass] N-013 integrated ship design and host route fix marker verified.'
    if (-not (Select-String -Path $builtIndex -Pattern 'name="wayglass-ui-voyage-status" content="n014-optional-host-capability-no-fake-messages"' -SimpleMatch -Quiet)) {
        throw 'Staged Wayglass is missing N-014 truthful Voyage messaging capability diagnostics. Refusing stale UI.'
    }
    Write-Host '[Wayglass] N-014 optional Voyage service status marker verified.'
    if (-not (Select-String -Path $builtIndex -Pattern 'name="wayglass-ui-motion" content="n015-threejs-spline-docking-optin-bloom-feather"' -SimpleMatch -Quiet)) {
        throw 'Staged portal is missing N-015 Three.js animation and Feather integration. Refusing stale UI.'
    }
    Write-Host '[Wayglass] N-015 spatial motion, optional glow, and shared Feather marker verified.'
    $env:PORT = [string]$Port
    Write-Host ''
    Write-Host '[Wayglass] N-010 HEARTGATE PORTAL (local, no Vercel):'
    Write-Host $Url
    Write-Host '[Wayglass] Keep this PowerShell window open. Ctrl+C stops this host.'
    npm --prefix apps/starwell-server run start:core
    if ($LASTEXITCODE -ne 0) { throw "Hearthgate exited with code $LASTEXITCODE." }
} finally { Pop-Location }
