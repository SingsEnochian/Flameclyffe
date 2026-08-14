[CmdletBinding()]
param(
  [switch]$InstallIfMissing,
  [switch]$NoPrompt
)

$Generic = Join-Path $PSScriptRoot 'IGNITE-BIFROST.ps1'
if (-not (Test-Path $Generic)) {
  Write-Host "Generic Bifröst ignition key is missing: $Generic" -ForegroundColor Red
  exit 12
}

$argsList = @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Generic, '-ProfileId', 'lioreal:qwen3-14b-abliterated-v1')
if ($InstallIfMissing) { $argsList += '-InstallIfMissing' }
if ($NoPrompt) { $argsList += '-NoPrompt' }

& powershell.exe @argsList
exit $LASTEXITCODE
