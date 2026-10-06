param(
    [ValidateSet('preview', 'sandbox')]
    [string]$Environment = 'preview'
)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$credentialName = if ($Environment -eq 'sandbox') { 'HUMAIN_NODE_SANDBOX_KEY' } else { 'HUMAIN_NODE_KEY' }
$currentKey = [Environment]::GetEnvironmentVariable($credentialName, 'Process')
if ([string]::IsNullOrWhiteSpace($currentKey)) {
    $credential = Read-Host "HUMAIN $Environment API key" -AsSecureString
    $currentKey = [System.Net.NetworkCredential]::new('', $credential).Password
    Remove-Variable credential
    if ([string]::IsNullOrWhiteSpace($currentKey)) { throw 'An API key is required.' }
    [Environment]::SetEnvironmentVariable($credentialName, $currentKey, 'Process')
}
Remove-Variable currentKey
if (-not $env:PORT) { $env:PORT = '3841' }
if (-not $env:WAYGLASS_LOCAL_MODEL) { $env:WAYGLASS_LOCAL_MODEL = 'ornith-1.5:9b' }
Write-Host "Starting Hearthgate with HUMAIN $Environment credentials in this process only."
Write-Host 'Select the matching HUMAIN route in the Writing Room.'
npm run wayglass:hearthgate
if ($LASTEXITCODE -ne 0) { throw "Hearthgate exited with code $LASTEXITCODE" }
