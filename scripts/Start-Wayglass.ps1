# Install missing locked dependencies and launch local Wayglass Observer on Windows.
param([switch]$Doctor)
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
    if ($Doctor) { node scripts/wayglass-local.mjs --doctor }
    else { node scripts/wayglass-local.mjs }
    if ($LASTEXITCODE -ne 0) { throw "Launcher exited with code $LASTEXITCODE." }
} finally { Pop-Location }
