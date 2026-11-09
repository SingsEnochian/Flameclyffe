# Generate a fresh House Steward credential and cookie signing key locally.
# This script never prints the signing key or sends either secret to GitHub.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $root 'apps/starwell-server/.env'
$envDir = Split-Path -Parent $envPath
if (-not (Test-Path $envDir)) { throw 'Wayglass host directory not found.' }

function New-Secret([int]$byteCount) {
  $bytes = New-Object byte[] $byteCount
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

$steward = New-Secret 32
$signing = New-Secret 48
$lines = if (Test-Path $envPath) { @(Get-Content -LiteralPath $envPath) } else { @() }
# The local server uses a simple KEY=VALUE reader; preserve unrelated settings.
$updated = New-Object 'System.Collections.Generic.List[string]'
foreach ($line in $lines) {
  if ($line -match '^\s*(ARCSWEEP_STEWARD_KEY|HOUSE_SESSION_SECRET)\s*=') { continue }
  $updated.Add($line)
}
$updated.Add('ARCSWEEP_STEWARD_KEY=' + $steward)
$updated.Add('HOUSE_SESSION_SECRET=' + $signing)
$temp = Join-Path $envDir ('.env.' + [Guid]::NewGuid().ToString('N') + '.tmp')
try {
  [System.IO.File]::WriteAllText($temp, (($updated -join [Environment]::NewLine) + [Environment]::NewLine), (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temp -Destination $envPath -Force
} finally {
  if (Test-Path $temp) { Remove-Item -LiteralPath $temp -Force }
}
Write-Host ''
Write-Host 'House Steward credential has been configured in the private local .env file.' -ForegroundColor Green
Write-Host 'Restart the local Wayglass/STARWELL server before signing in.'
Write-Host 'Save this credential in your password manager. It will not be shown again by this script.'
Write-Host ''
Write-Host ('HOUSE STEWARD CODE: ' + $steward) -ForegroundColor Yellow
Write-Host ''
Write-Host 'The separate cookie signing secret was saved without displaying it.'
Write-Host 'Earlier House sessions using the old signing key are now invalid.'
