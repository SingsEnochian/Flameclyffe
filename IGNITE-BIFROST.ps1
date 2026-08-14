[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProfileId,
  [switch]$InstallIfMissing,
  [switch]$NoPrompt,
  [switch]$AllowRemote,
  [switch]$OptIn
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Ack = 'BIFROST_IGNITION_ACK'
$ServerDir = Join-Path $PSScriptRoot 'apps\starwell-server'
$IgniteScript = Join-Path $ServerDir 'scripts\bifrost-ignite.js'
$PrepareScript = Join-Path $ServerDir 'scripts\bifrost-model-prepare.js'
$ReceiptDir = Join-Path $ServerDir 'data\ignition-receipts'
$RequestedProfileRef = $ProfileId
$ResolvedProfileId = $null

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

function Get-ProfileDefinition {
  Push-Location $ServerDir
  try {
    $json = & node -e "const {resolveProfileRef}=require('./bifrost/profile-resolution'); const r=resolveProfileRef(process.argv[1]); if(!r) process.exit(2); const p=r.profile; console.log(JSON.stringify({profileId:r.profileId,label:p.label,owner:p.owner,identity:r.identity,provider:p.runtime.provider,model:p.runtime.model,optInOnly:!!p.opt_in_only,artifact:p.artifact||null}));" $RequestedProfileRef 2>&1
    $code = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }
  if ($code -ne 0) { Fail "Unknown or unreadable Bifröst profile/identity: $RequestedProfileRef" 11 }
  try { return (($json | ForEach-Object { "$_" }) -join "`n") | ConvertFrom-Json -ErrorAction Stop }
  catch { Fail "Could not parse Bifröst profile definition for $RequestedProfileRef." 12 }
}

function Invoke-Ignition($Profile) {
  $args = @($IgniteScript, 'profile', $ResolvedProfileId, '--yes')
  if ($Profile.provider -eq 'ollama') { $args += '--start-ollama' }
  if ($AllowRemote) { $args += '--allow-remote' }
  if ($OptIn) { $args += '--opt-in' }

  Push-Location $ServerDir
  try {
    $lines = & node @args 2>&1
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

function Save-Receipt($Profile, $Receipt, [string]$Raw) {
  New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $safe = ($Profile.owner + '-' + $Profile.profileId) -replace '[^a-zA-Z0-9._-]', '_'
  $path = Join-Path $ReceiptDir "$safe-$stamp.json"
  if ($null -ne $Receipt) { $Receipt | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 $path }
  else { $Raw | Set-Content -Encoding UTF8 $path }
  Write-Host "Receipt: $path" -ForegroundColor DarkGray
}

function Confirm-Install($Profile) {
  if ($InstallIfMissing) { return $true }
  if ($NoPrompt) { return $false }
  Write-Host "`n$($Profile.label) is not installed under its assigned runtime model '$($Profile.model)'." -ForegroundColor Cyan
  if ($null -ne $Profile.artifact) {
    Write-Host "Preparation strategy: $($Profile.artifact.strategy)"
    if ($Profile.artifact.model) { Write-Host "Artifact: $($Profile.artifact.model)" }
    elseif ($Profile.artifact.repo) { Write-Host "Artifact: $($Profile.artifact.repo) · $($Profile.artifact.quant)" }
  }
  $answer = Read-Host 'Prepare the selected vessel now? [y/N]'
  return $answer -match '^(y|yes)$'
}

if (-not (Test-Path $ServerDir)) { Fail "Cannot find apps\starwell-server beneath $PSScriptRoot." 13 }
if (-not (Test-Path $IgniteScript)) { Fail "Ignition CLI is missing: $IgniteScript" 14 }
if (-not (Test-Path $PrepareScript)) { Fail "Model preparation CLI is missing: $PrepareScript" 15 }
Require-Command 'node' 'Install/use Node 24 before ignition.'

$profile = Get-ProfileDefinition
$ResolvedProfileId = [string]$profile.profileId
Write-Host 'BIFRÖST · ATTESTED PROFILE IGNITION' -ForegroundColor Magenta
Write-Host "Requested as: $RequestedProfileRef"
Write-Host "Resolved profile: $ResolvedProfileId"
if ($null -ne $profile.identity) {
  Write-Host "Identity: $($profile.identity.identityName)"
  if ($profile.identity.displayName) { Write-Host "Display: $($profile.identity.displayName)" }
  if ($profile.identity.affectionateName) { Write-Host "Affectionate alias: $($profile.identity.affectionateName)" }
  if ($profile.identity.aliases) { Write-Host "Aliases: $($profile.identity.aliases -join ', ')" }
}
Write-Host "Provider: $($profile.provider)"
Write-Host "Expected runtime model: $($profile.model)"

if ($profile.optInOnly -and -not $OptIn) {
  Fail "$ResolvedProfileId is opt-in only. Re-run with -OptIn when you deliberately want this instrument." 16
}

if ($profile.provider -eq 'ollama') {
  Require-Command 'ollama' 'Ollama must be installed locally before a local vessel can ignite.'
}
elseif (-not $AllowRemote) {
  Fail "$($profile.label) uses remote provider '$($profile.provider)'. Re-run with -AllowRemote to authorise the verification request." 17
}

Write-Stage 'First ignition attempt'
$first = Invoke-Ignition $profile

if ($first.ExitCode -eq 0 -and $null -ne $first.Receipt -and $first.Receipt.state -eq 'runtime-verified') {
  if ($first.Receipt.actualModel -ne $profile.model) { Fail "Attestation mismatch: expected $($profile.model), got $($first.Receipt.actualModel)." 21 }
  if ($first.Receipt.challenge -ne $Ack) { Fail "Challenge mismatch: expected $Ack, got $($first.Receipt.challenge)." 22 }
  Save-Receipt $profile $first.Receipt $first.Raw
  Write-Host "`n🔥 RUNTIME VERIFIED · $($profile.identity.identityName) · $($first.Receipt.actualModel)" -ForegroundColor Green
  exit 0
}

$state = if ($null -ne $first.Receipt) { [string]$first.Receipt.state } else { '' }
if ($state -ne 'activation-pending') {
  Save-Receipt $profile $first.Receipt $first.Raw
  Fail "Ignition stopped in state '$state'. Read the receipt before changing the runtime." 20
}

if ($profile.provider -ne 'ollama') {
  Save-Receipt $profile $first.Receipt $first.Raw
  Fail "Remote profile unexpectedly reported activation-pending." 23
}

if (-not (Confirm-Install $profile)) {
  Save-Receipt $profile $first.Receipt $first.Raw
  Fail 'Model preparation was not approved. Ignition remains activation-pending.' 30
}

Write-Stage 'Preparing the selected vessel'
$prepareArgs = @($PrepareScript, '--profile', $ResolvedProfileId, '--execute')
if ($profile.optInOnly) { $prepareArgs += '--include-opt-in' }
Push-Location $ServerDir
try {
  & node @prepareArgs
  $prepareCode = $LASTEXITCODE
}
finally {
  Pop-Location
}
if ($prepareCode -ne 0) { Fail "Model preparation failed with exit code $prepareCode." 31 }

Write-Stage 'Second ignition attempt'
$second = Invoke-Ignition $profile
Save-Receipt $profile $second.Receipt $second.Raw

if ($second.ExitCode -ne 0 -or $null -eq $second.Receipt) { Fail 'Post-install ignition did not return a verified JSON receipt.' 40 }
if ($second.Receipt.state -ne 'runtime-verified') { Fail "Post-install ignition stopped in state '$($second.Receipt.state)'." 41 }
if ($second.Receipt.actualModel -ne $profile.model) { Fail "Attestation mismatch: expected $($profile.model), got $($second.Receipt.actualModel)." 42 }
if ($second.Receipt.challenge -ne $Ack) { Fail "Challenge mismatch: expected $Ack, got $($second.Receipt.challenge)." 43 }

Write-Host "`n🔥 RUNTIME VERIFIED · $($profile.identity.identityName) · $($second.Receipt.actualModel)" -ForegroundColor Green
exit 0
