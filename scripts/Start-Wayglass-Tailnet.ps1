# Wayglass full-ship private Tailscale Serve entrance for Windows.
# Read-only by default. No Funnel, router port opening, public preview or credentials.
# Tailscale Serve is tailnet-private, not automatically owner-only: verify ACLs first.
# Route through the dedicated Wayglass gate, NEVER expose all of STARWELL.
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
    # A configured House session returns 401 without credentials. A 503 means
    # no Steward secret is configured, so the private remote sign-in is unusable.
    $houseCode = 0
    try {
        $house = Invoke-WebRequest -Uri "$Origin/api/v1/house/session" -TimeoutSec 5 -UseBasicParsing
        $houseCode = [int]$house.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $houseCode = [int]$_.Exception.Response.StatusCode
        }
    }
    if ($houseCode -ne 401) {
        throw 'House Steward sign-in is not ready (expected an unauthenticated 401). Nothing has been shared.'
    }
}
function Assert-AllowedTailnetOrigin([string]$expectedOrigin) {
    # CORS preflight proves an existing host actually started with the verified
    # tailnet origin. It does not authenticate anyone.
    try {
        $headers = @{
            Origin = $expectedOrigin
            'Access-Control-Request-Method' = 'POST'
            'Access-Control-Request-Headers' = 'content-type'
        }
        $response = Invoke-WebRequest -Uri "$Origin/api/v1/house/session" -Method OPTIONS -Headers $headers -TimeoutSec 5 -UseBasicParsing
        $actual = [string]$response.Headers['Access-Control-Allow-Origin']
        if ($actual -ne $expectedOrigin) { throw 'Tailnet origin not allowed by the running host.' }
    } catch {
        throw 'The existing host does not admit the verified Tailnet HTTPS origin. Restart the host with this Tailnet launcher before publishing.'
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
    $env:WAYGLASS_TAILNET_ORIGIN = "https://$hostname"
    $env:HEARTHGATE_ALLOWED_ORIGINS = ((@($env:HEARTHGATE_ALLOWED_ORIGINS -split ',') |
        Where-Object { $_ -and $_.Trim() }) + @($env:WAYGLASS_TAILNET_ORIGIN) | Select-Object -Unique) -join ','
    Write-Host '[Wayglass] Building and staging the complete Wayglass UI on the local host.'
    & npm run wayglass:deploy:server
    if ($LASTEXITCODE -ne 0) { throw 'Wayglass staging failed. Nothing has been shared.' }
    if (Read-LocalHealth) {
        Assert-AllowedTailnetOrigin $env:WAYGLASS_TAILNET_ORIGIN
    } else {
        $serverDir = Join-Path $Root 'apps/starwell-server'
        if (-not (Test-Path (Join-Path $serverDir 'node_modules/express'))) {
            throw 'Hearthgate dependencies missing. Nothing has been shared.'
        }
        Write-Host '[Wayglass] Starting secure Hearthgate on loopback with the verified Tailnet origin.'
        $hostProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'server-secure.js' -WorkingDirectory $serverDir -PassThru
        $ready = $false
        for ($attempt=0; $attempt -lt 40; $attempt++) {
            if (Read-LocalHealth) { $ready = $true; break }
            if ($hostProcess.HasExited) { break }
            Start-Sleep -Milliseconds 350
        }
        if (-not $ready) {
            if (-not $hostProcess.HasExited) { Stop-Process -Id $hostProcess.Id -Force }
            throw 'Secure Hearthgate did not become healthy. Nothing has been shared.'
        }
        Assert-AllowedTailnetOrigin $env:WAYGLASS_TAILNET_ORIGIN
    }
    Assert-FullShip
    Write-Host '[Wayglass] Staged full ship verified. Starting the restricted Wayglass gateway.'
    Write-Host '[Wayglass] No unrelated STARWELL API, MCP, Ollama or filesystem routes are exposed.'
    & node scripts/wayglass-tailnet-serve.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve exited with an error. Nothing is verified live.' }
} finally {
    Pop-Location
}
