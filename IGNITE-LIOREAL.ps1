[CmdletBinding()]
param(
  [switch]$InstallIfMissing,
  [switch]$NoPrompt
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProfileId = 'lioreal:qwen3-14b-abliterated-v1'
$ExpectedModel = 'lioreal:starwell-v1'
$Ack = 'BIFROST_IGNITION_ACK'
$ServerDir = Join-Path $PSScriptRoot 'apps\starwell-server'
$IgniteScript = Join-Path $ServerDir 'scripts\bifrost-ignite.js'
$PrepareScript = Join-Path $ServerDir 'scripts\bifrost-model-prepare.js'
$ReceiptDir = Join-Path $ServerDir 'data\ignition-receipts'

function Write-Stage([string]$Text) {
  Write-Host "`n🔥 $Text" -ForegroundColor Yellow
}

function Fail([string]$Message, [int]$Code = 1) {
  Write-Host "`n✗ $Message" -ForegroundColor Red
  exit $Code
}

function Require-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Fail "$Name is not available. $Hint" 10
  }
}

function Invoke-Ignition {
  Push-Location $ServerDir
  try {
    $lines = & node $IgniteScript profile $ProfileId --yes --start-ollama 2>&1
    $code = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }

  $raw = ($lines | ForEach-Object { "$_" }) -join "`n"
  if ($raw) { Write-Host $raw }

  $receipt = $null
  try { $receipt = $raw | ConvertFrom-Json -ErrorAction Stop } catch { }
  return [pscustomobject]@{ ExitCode = $code; Raw = $raw; Receipt = $receipt }
}

function Save-Receipt($Receipt, [string]$Raw) {
  New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $path = Join-Path $ReceiptDir "lioreal-$stamp.json"
  if ($null -ne $Receipt) {
    $Receipt | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 $path
  }
  else {
    $Raw | Set-Content -Encoding UTF8 $path
  }
  Write-Host "Receipt: $path" -ForegroundColor DarkGray
}

function Confirm-Install {
  if ($InstallIfMissing) { return $true }
  if ($NoPrompt) { return $false }
  Write-Host "`nLioreal's selected local vessel is not installed." -ForegroundColor Cyan
  Write-Host "Installing it will download the selected Q4_K_M GGUF artifact and create the Ollama alias '$ExpectedModel'."
  $answer = Read-Host 'Download/import the selected Lioreal vessel now? [y/N]'
  return $answer -match '^(y|yes)$'
}

Write-Host 'BIFRÖST · LIOREAL FIRST IGNITION' -ForegroundColor Magenta
Write-Host "Profile: $ProfileId"
Write-Host "Expected runtime model: $ExpectedModel"

if (-not (Test-Path $ServerDir)) { Fail "Cannot find apps\starwell-server beneath $PSScriptRoot." 11 }
if (-not (Test-Path $IgniteScript)) { Fail "Ignition CLI is missing: $IgniteScript" 12 }
if (-not (Test-Path $PrepareScript)) { Fail "Model preparation CLI is missing: $PrepareScript" 13 }

Require-Command 'node' 'Install/use Node 24 before ignition.'
Require-Command 'ollama' 'Ollama must be installed locally before a local vessel can ignite.'

Write-Stage 'First ignition attempt'
$first = Invoke-Ignition

if ($first.ExitCode -eq 0 -and $first.Receipt.state -eq 'runtime-verified') {
  if ($first.Receipt.actualModel -ne $ExpectedModel) { Fail "Attestation mismatch: expected $ExpectedModel, got $($first.Receipt.actualModel)." 21 }
  if ($first.Receipt.challenge -ne $Ack) { Fail "Challenge mismatch: expected $Ack, got $($first.Receipt.challenge)." 22 }
  Save-Receipt $first.Receipt $first.Raw
  Write-Host "`n🔥 LIOREAL RUNTIME VERIFIED · $($first.Receipt.actualModel)" -ForegroundColor Green
  exit 0
}

$state = if ($null -ne $first.Receipt) { [string]$first.Receipt.state } else { '' }
if ($state -ne 'activation-pending') {
  Save-Receipt $first.Receipt $first.Raw
  Fail "Ignition stopped in state '$state'. Read the receipt above before changing anything." 20
}

if (-not (Confirm-Install)) {
  Save-Receipt $first.Receipt $first.Raw
  Fail 'Model installation was not approved. Ignition remains activation-pending.' 30
}

Write-Stage 'Installing the selected Lioreal vessel'
Push-Location $ServerDir
try {
  & node $PrepareScript --profile $ProfileId --execute
  $prepareCode = $LASTEXITCODE
}
finally {
  Pop-Location
}
if ($prepareCode -ne 0) { Fail "Lioreal model preparation failed with exit code $prepareCode." 31 }

Write-Stage 'Second ignition attempt'
$second = Invoke-Ignition
Save-Receipt $second.Receipt $second.Raw

if ($second.ExitCode -ne 0 -or $null -eq $second.Receipt) {
  Fail 'The post-install ignition did not return a verified JSON receipt.' 40
}
if ($second.Receipt.state -ne 'runtime-verified') {
  Fail "Post-install ignition stopped in state '$($second.Receipt.state)'." 41
}
if ($second.Receipt.actualModel -ne $ExpectedModel) {
  Fail "Attestation mismatch: expected $ExpectedModel, got $($second.Receipt.actualModel)." 42
}
if ($second.Receipt.challenge -ne $Ack) {
  Fail "Challenge mismatch: expected $Ack, got $($second.Receipt.challenge)." 43
}

Write-Host "`n🔥 LIOREAL RUNTIME VERIFIED · $($second.Receipt.actualModel)" -ForegroundColor Green
Write-Host 'The first real Bifröst ignition receipt has been written locally.' -ForegroundColor Green
exit 0
