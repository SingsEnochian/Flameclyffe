# Wayglass full-ship private Tailscale Serve entrance for Windows.
# Read-only by default. No Funnel, router port opening, public preview or credentials.
# Tailscale Serve is tailnet-private, not automatically owner-only: verify ACLs first.
[CmdletBinding()]
param(
    [switch]$Publish,
    [switch]$OwnerOnlyAclReviewed
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Origin = 'http://127.0.0.1:3000'
$WayglassPath = '/wayglass/'
$Tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $Tailscale) { throw 'Tailscale CLI not found on this Windows computer.' }

function Read-TailscaleJson([string[]]$Arguments) {
    $output = & tailscale @Arguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw ('Tailscale command failed: ' + ($Arguments -join ' ') + '. ' + $output.Trim()) }
    try { return ($output | ConvertFrom-Json) }
    catch { throw ('Tailscale returned unreadable JSON for ' + ($Arguments -join ' ')) }
}
function Read-LocalHealth {
    try {
        $health = Invoke-RestMethod -Uri "$Origin/api/v1/wayglass/healthz" -TimeoutSec 5
        return ($health.schema -eq 'wayglass.host-health/v0.1' -and $health.status -eq 'ready')
    } catch { return $false }
}
function Assert-FullShip {
    if (-not (Read-LocalHealth)) {
        throw 'Hearthgate Wayglass backend is not healthy on 127.0.0.1:3000. Nothing has been shared.'
    }
    try {
        $page = Invoke-WebRequest -Uri "$Origin$WayglassPath" -TimeoutSec 5 -UseBasicParsing
        if ($page.StatusCode -ne 200 -or $page.Content -notmatch '<div id="app"') {
            throw 'Full Wayglass staged HTML not detected'
        }
    } catch {
        throw 'The full Wayglass UI is not staged at localhost:3000/wayglass/. Nothing has been shared.'
    }
}
function Get-ServeConfig {
    # Status JSON may have an empty TCP/Web map. Refuse to modify an existing
    # Serve/Funnel configuration rather than clobbering another application.
    $raw = & tailscale serve status --json 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        if ($raw -match 'No serve config|No serve configuration') { return $null }
        throw ('Cannot verify existing Tailscale Serve/Funnel configuration: ' + $raw.Trim())
    }
    if (-not $raw.Trim()) { return $null }
    try { return ($raw | ConvertFrom-Json) }
    catch { throw 'Cannot parse Tailscale Serve status; refusing to modify it.' }
}
function Assert-NoExistingShare($config) {
    if ($null -eq $config) { return }
    $properties = @($config.PSObject.Properties.Name)
    if (($properties -contains 'AllowFunnel') -and $config.AllowFunnel) {
        throw 'A Funnel configuration is present. Refusing to alter or publish it.'
    }
    if (($properties -contains 'Web') -and $null -ne $config.Web -and
        @($config.Web.PSObject.Properties).Count -gt 0) {
        throw 'Tailscale already serves another web route. Refusing to overwrite it.'
    }
    if (($properties -contains 'TCP') -and $null -ne $config.TCP -and
        @($config.TCP.PSObject.Properties).Count -gt 0) {
        throw 'Tailscale already has a TCP Serve/Funnel route. Refusing to overwrite it.'
    }
}
$status = Read-TailscaleJson -Arguments @('status','--json')
if ($status.BackendState -ne 'Running' -or -not $status.Self.DNSName) {
    throw 'Tailscale must be signed in and connected on this Windows machine.'
}
$hostname = [string]$status.Self.DNSName
$hostname = $hostname.TrimEnd('.')
if ($hostname -notmatch '^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+\.ts\.net$') {
    throw 'Tailscale did not provide a valid tailnet HTTPS DNS name.'
}
$privateUrl = "https://$hostname$WayglassPath"
$existing = Get-ServeConfig
Write-Host '[Wayglass] Tailnet connected. Local host:' $hostname
Write-Host '[Wayglass] Full ship healthy:' (Read-LocalHealth)
if (-not $Publish) {
    Write-Host '[Wayglass] Doctor mode. No Tailscale configuration changed.'
    Write-Host '[Wayglass] Proposed tailnet URL (not yet verified live):' $privateUrl
    Write-Host '[Wayglass] Publish only after owner-only tailnet ACL review.'
    exit 0
}
if (-not $OwnerOnlyAclReviewed) {
    throw 'Owner-only access rules have not been confirmed. Run with -OwnerOnlyAclReviewed only after verifying tailnet grants access exclusively to your intended identity/devices.'
}
Assert-NoExistingShare $existing
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required.' }
$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 24) { throw 'Node.js 24 or newer is required.' }
Push-Location $Root
try {
    Write-Host '[Wayglass] Building and staging the complete Wayglass UI on the local host.'
    & npm run wayglass:deploy:server
    if ($LASTEXITCODE -ne 0) { throw 'Wayglass staging failed. Nothing has been shared.' }
    Assert-FullShip
    Write-Host '[Wayglass] Staged full ship verified; enabling private Tailscale Serve.'
    & tailscale serve --bg 3000
    if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve failed; check Tailscale HTTPS/MagicDNS setup.' }
    $current = Get-ServeConfig
    if ($null -eq $current -or -not (@($current.PSObject.Properties.Name) -contains 'Web')) {
        throw 'Tailscale Serve did not return a verifiable web configuration.'
    }
    # Tailscale CLI is the authority for the URL; never publish via Funnel.
    Write-Host '[Wayglass] Private tailnet route configured:' $privateUrl
    Write-Host '[Wayglass] Open on iPad with Tailscale connected. This does not yet prove iPad acceptance.'
    Write-Host '[Wayglass] To disable this dedicated Serve route: tailscale serve --https=443 off'
} finally {
    Pop-Location
}
