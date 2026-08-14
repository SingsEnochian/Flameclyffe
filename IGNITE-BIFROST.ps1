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
$AliasScript = Join-Path $ServerDir 'scripts\bifrost-materialize-aliases.js'
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
  $identityId = if ($null -ne $Profile.identity -and $Profile.identity.identityId) { [string]$Profile.identity.identityId } else { [string]$Profile.owner }
  $identityName = if ($null -ne $Profile.identity -and $Profile.identity.identityName) { [string]$Profile.identity.identityName } else { [string]$Profile.owner }
  $safe = ($identityName + '-' + $Profile.profileId) -replace '[^a-zA-Z0-9._-]', '_'
  $path = Join-Path $ReceiptDir "$safe-$stamp.json"
  $latest = Join-Path $ReceiptDir (("latest-" + $identityId + ".json") -replace '[^a-zA-Z0-9._-]', '_')
  if ($null -ne $Receipt) {
    $json = $Receipt | ConvertTo-Json -Depth 12
    $json | Set-Content -Encoding UTF8 $path
    $json | Set-Content -Encoding UTF8 $latest
  }
  else {
    $Raw | Set-Content -Encoding UTF8 $path
    $Raw | Set-Content -Encoding UTF8 $latest
  }
  Write-Host "Receipt: $path" -ForegroundColor DarkGray
  Write-Host "Latest:  $latest" -ForegroundColor DarkGray
}

function Assert-Verified($Profile, $Attempt, [int]$ModelCode, [int]$ChallengeCode) {
  if ($Attempt.ExitCode -ne 0 -or $null -eq $Attempt.Receipt) { return $false }
  if ($Attempt.Receipt.state -ne 'runtime-verified') { return $false }
  if ($Attempt.Receipt.actualModel -ne $Profile.model) { Fail "Attestation mismatch: expected $($Profile.model), got $($Attempt.Receipt.actualModel)." $ModelCode }
  if ($Attempt.Receipt.challenge -ne $Ack) { Fail "Challenge mismatch: expected $Ack, got $($Attempt.Receipt.challenge)." $ChallengeCode }
  return $true
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

function Materialize-Alias($Profile) {
  Write-Stage 'Materializing assigned runtime alias · no download'
  $aliasArgs = @($AliasScript, '--profile', $ResolvedProfileId, '--execute')
  if ($Profile.optInOnly) { $aliasArgs += '--include-opt-in' }
  Push-Location $ServerDir
  try {
    & node @aliasArgs
    $aliasCode = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }
  if ($aliasCode -ne 0) { Fail "Runtime alias materialization failed with exit code $aliasCode." 24 }
}

if (-not (Test-Path $ServerDir)) { Fail "Cannot find apps\starwell-server beneath $PSScriptRoot." 13 }
if (-not (Test-Path $IgniteScript)) { Fail "Ignition CLI is missing: $IgniteScript" 14 }
if (-not (Test-Path $PrepareScript)) { Fail "Model preparation CLI is missing: $PrepareScript" 15 }
if (-not (Test-Path $AliasScript)) { Fail "Alias materializer is missing: $AliasScript" 18 }
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

if (Assert-Verified $profile $first 21 22) {
  Save-Receipt $profile $first.Receipt $first.Raw
  Write-Host "`n🔥 RUNTIME VERIFIED · $($profile.identity.identityName) · $($first.Receipt.actualModel)" -ForegroundColor Green
  exit 0
}

$state = if ($null -ne $first.Receipt) { [string]$first.Receipt.state } else { '' }

if ($state -eq 'alias-pending') {
  Materialize-Alias $profile
  Write-Stage 'Retrying ignition after alias materialization'
  $aliasRetry = Invoke-Ignition $profile
  Save-Receipt $profile $aliasRetry.Receipt $aliasRetry.Raw
  if (-not (Assert-Verified $profile $aliasRetry 25 26)) {
    $retryState = if ($null -ne $aliasRetry.Receipt) { [string]$aliasRetry.Receipt.state } else { '<no-receipt>' }
    Fail "Post-alias ignition stopped in state '$retryState'." 27
  }
  Write-Host "`n🔥 RUNTIME VERIFIED · $($profile.identity.identityName) · $($aliasRetry.Receipt.actualModel)" -ForegroundColor Green
  exit 0
}

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

if (-not (Assert-Verified $profile $second 42 43)) {
  $secondState = if ($null -ne $second.Receipt) { [string]$second.Receipt.state } else { '<no-receipt>' }
  Fail "Post-install ignition stopped in state '$secondState'." 41
}

Write-Host "`n🔥 RUNTIME VERIFIED · $($profile.identity.identityName) · $($second.Receipt.actualModel)" -ForegroundColor Green
exit 0
