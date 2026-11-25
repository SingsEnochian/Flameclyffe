#Requires -Version 5.1
#Requires -RunAsAdministrator
[CmdletBinding()]
param([switch]$Rollback)

$ErrorActionPreference = 'Stop'
$domain = 'wayglass.world'
$public = "https://$domain"
$origin = 'http://127.0.0.1:3000'
$gateway = 'http://127.0.0.1:32861'
$name = 'Wayglass'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$state = Join-Path $env:ProgramData 'WayglassCloudflare'
$receipt = Join-Path $state 'deployment.json'
$tokenFile = Join-Path $state 'connector.token'
$serviceName = 'Cloudflared'
$addedRecord = $null
$startedGateway = $null
$startedOrigin = $null
$keepProcesses = $false
$environmentBefore = @{}
foreach ($key in @('WAYGLASS_ACCESS_ISSUER', 'WAYGLASS_ACCESS_AUDIENCE', 'WAYGLASS_ACCESS_OWNER_EMAIL',
    'WAYGLASS_ACCESS_PUBLIC_ORIGIN', 'WAYGLASS_TAILNET_ORIGIN', 'HEARTHGATE_ALLOWED_ORIGINS')) {
    $environmentBefore[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}

Add-Type -AssemblyName System.Net.Http
$transport = New-Object Net.Http.HttpClientHandler
$transport.AllowAutoRedirect = $false
$transport.UseCookies = $false
$http = New-Object Net.Http.HttpClient($transport)
$http.Timeout = [TimeSpan]::FromSeconds(15)

function Request([string]$method, [string]$url, $body, [hashtable]$headers = @{}) {
    $message = New-Object Net.Http.HttpRequestMessage([Net.Http.HttpMethod]::new($method), $url)
    try {
        foreach ($key in $headers.Keys) {
            if ($key -eq 'Host') { $message.Headers.Host = $headers[$key] }
            else { $null = $message.Headers.TryAddWithoutValidation($key, $headers[$key]) }
        }
        if ($null -ne $body) {
            $message.Content = [Net.Http.StringContent]::new(
                (ConvertTo-Json -InputObject $body -Depth 20 -Compress), [Text.Encoding]::UTF8, 'application/json')
        }
        $response = $http.SendAsync($message).GetAwaiter().GetResult()
        try {
            [pscustomobject]@{
                Status = [int]$response.StatusCode
                Body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                Cookies = if ($response.Headers.Contains('Set-Cookie')) { @($response.Headers.GetValues('Set-Cookie')) } else { @() }
                Enabled = $response.Headers.Contains('X-Wayglass-Access-Gate') -and
                    ($response.Headers.GetValues('X-Wayglass-Access-Gate') -contains 'enabled')
            }
        } finally { $response.Dispose() }
    } catch { throw 'HTTPS or loopback request failed.' }
    finally { $message.Dispose() }
}

function Cloudflare([string]$method, [string]$path, $data = $null) {
    $response = Request $method "https://api.cloudflare.com/client/v4$path" $data @{
        Authorization = "Bearer $($apiCredential.Password)"
    }
    try { $parsed = $response.Body | ConvertFrom-Json }
    catch { throw "Cloudflare ${method} failed (HTTP $($response.Status)); check account and token permissions." }
    if ($response.Status -notin (200..299) -or -not $parsed.success) {
        $codes = @($parsed.errors | ForEach-Object { $_.code }) -join ', '
        # Avoid echoing API response text or resource paths containing private configuration.
        throw "Cloudflare ${method} failed (HTTP $($response.Status), codes: $codes); check account and token permissions."
    }
    $parsed
}

function CloudflareList([string]$path) {
    $joiner = if ($path.Contains('?')) { '&' } else { '?' }
    # A short page with no total is conclusive only if the API honors pagination.
    for ($page = 1; $page -le 100; $page++) {
        $result = Cloudflare GET "$path${joiner}per_page=50&page=$page"
        foreach ($item in $result.result) { if ($null -ne $item) { $item } }
        if ($result.result_info.total_pages) {
            if ($page -ge $result.result_info.total_pages) { return }
        } elseif (@($result.result).Count -lt 50) { return }
    }
    throw 'Cloudflare resource enumeration was incomplete.'
}

function Initialize-State {
    # Protect the directories before any connector credential is written.
    foreach ($folder in @($state)) {
        $item = [IO.Directory]::CreateDirectory($folder)
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Deployment state cannot be a link.' }
        $acl = New-Object Security.AccessControl.DirectorySecurity
        $acl.SetAccessRuleProtection($true, $false)
        $acl.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
        foreach ($sid in @('S-1-5-18', 'S-1-5-32-544')) {
            $identity = New-Object Security.Principal.SecurityIdentifier($sid)
            $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
                $identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
        }
        Set-Acl -LiteralPath $folder -AclObject $acl
    }
    foreach ($file in @($receipt, $tokenFile)) {
        if ((Test-Path -LiteralPath $file) -and
            ((Get-Item -LiteralPath $file -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'Deployment state cannot contain linked files.'
        }
    }
}

function Write-Receipt($details) {
    $temporary = Join-Path $state ([Guid]::NewGuid().ToString('N') + '.tmp')
    $backup = $temporary + '.bak'
    try {
        [IO.File]::WriteAllText($temporary, (ConvertTo-Json -InputObject $details -Depth 5))
        if ([IO.File]::Exists($receipt)) { [IO.File]::Replace($temporary, $receipt, $backup) }
        else { [IO.File]::Move($temporary, $receipt) }
    } finally {
        foreach ($file in @($temporary, $backup)) {
            if ([IO.File]::Exists($file)) { [IO.File]::Delete($file) }
        }
    }
}

function Read-Apex {
    @(CloudflareList "$zonePath/dns_records?name=$domain" | Where-Object { $_.name -eq $domain })
}

function Assert-Level([bool]$condition, [string]$failure) {
    if (-not $condition) { throw $failure }
}

function Assert-IntegrationHead {
    Push-Location $root
    try {
        $sha = & git rev-parse HEAD
        Assert-Level ($LASTEXITCODE -eq 0 -and $sha -match '^[a-f0-9]{40}$') 'Cannot identify the local commit.'
        $dirty = & git status --porcelain --untracked-files=no
        Assert-Level ($LASTEXITCODE -eq 0 -and -not $dirty) 'Commit or restore tracked local changes before deploying.'
    } finally { Pop-Location }
    $github = 'https://api.github.com/repos/SingsEnochian/Flameclyffe'
    $headers = @{ 'User-Agent' = 'Wayglass-Deployment'; Accept = 'application/vnd.github+json' }
    $pr = Request GET "$github/pulls/661" $null $headers
    Assert-Level ($pr.Status -eq 200 -and ($pr.Body | ConvertFrom-Json).head.sha -eq $sha) 'The checkout must match the published head of PR #661.'
    $runs = Request GET "$github/actions/runs?head_sha=$sha&event=pull_request&per_page=100" $null $headers
    Assert-Level ($runs.Status -eq 200) 'Cannot verify exact-head GitHub Actions runs.'
    $ci = $runs.Body | ConvertFrom-Json
    Assert-Level ($ci.total_count -le 100) 'GitHub Actions evidence exceeds the verification page.'
    $latest = @($ci.workflow_runs | Where-Object head_sha -EQ $sha |
        Sort-Object run_number,run_attempt -Descending | Group-Object workflow_id | ForEach-Object { $_.Group[0] })
    foreach ($required in @('Wayglass Check', 'Wayglass First Contact Browser', 'Gate 7 · Cold Return Continuity',
        'Wayglass Nikola Eightfold Return Gate', 'Hearthgate Windows Installer', 'One Ship change-impact contract')) {
        Assert-Level (@($latest | Where-Object { $_.name -eq $required -and $_.conclusion -eq 'success' }).Count -eq 1) "Missing successful exact-head workflow: $required."
    }
    Assert-Level (@($latest | Where-Object { $_.conclusion -notin @('success', 'skipped') }).Count -eq 0) 'An exact-head workflow is unfinished or unsuccessful.'
    Write-Host "Verified GitHub Actions for $sha"
    return $sha
}

function Install-Connector([string]$accountPath, [string]$tunnelId) {
    $existing = Get-CimInstance Win32_Service -Filter "Name='$serviceName'"
    if ($existing) {
        Assert-Level ($existing.PathName -match [regex]::Escape("--token-file `"$tokenFile`"") -and
            (Test-Path -LiteralPath $tokenFile)) 'An existing Cloudflared service belongs to another configuration.'
        $executable = [regex]::Match($existing.PathName, '^"([^"]+)"').Groups[1].Value
        Assert-Level ([IO.File]::Exists($executable) -and $existing.StartMode -eq 'Auto') 'The existing managed Cloudflared service is not configured for automatic startup.'
        if ($existing.State -ne 'Running') { Start-Service $serviceName }
        return $executable
    }
    $machineFolders = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ }
    $installPaths = @($machineFolders | ForEach-Object { Join-Path $_ 'cloudflared\cloudflared.exe' })
    $exe = $installPaths | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if (-not $exe) {
        & winget.exe install --id Cloudflare.cloudflared --exact --source winget --scope machine --installer-type wix --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Host
        Assert-Level ($LASTEXITCODE -eq 0) 'Cloudflared installation failed.'
        $exe = $installPaths | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    }
    # LocalSystem must only execute a binary from the protected machine install.
    Assert-Level ([bool]$exe) 'Install cloudflared for all users under Program Files before configuring the service.'
    $helpText = (& $exe tunnel run --help | Out-String)
    Assert-Level ($helpText -match '--token-file') 'Update cloudflared to a version supporting --token-file.'
    if (Test-Path -LiteralPath $tokenFile) {
        throw 'A connector credential exists without the managed service. Review the protected deployment directory before retrying.'
    }
    $connector = (Cloudflare GET "$accountPath/cfd_tunnel/$tunnelId/token").result
    Assert-Level ($connector -is [string] -and $connector.Length -gt 20) 'Cloudflare did not provide a connector credential.'
    try {
        $stream = [IO.File]::Open($tokenFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try {
            $writer = [IO.StreamWriter]::new($stream)
            $writer.Write($connector)
            $writer.Dispose()
        } finally { $stream.Dispose() }
        New-Service -Name $serviceName -BinaryPathName "`"$exe`" --no-autoupdate tunnel run --token-file `"$tokenFile`"" -StartupType Automatic | Out-Null
    } catch {
        if (-not (Get-Service $serviceName -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $tokenFile -ErrorAction SilentlyContinue }
        throw 'Unable to register the Cloudflared Windows service.'
    } finally { $connector = $null }
    Start-Service $serviceName
    return $exe
}

function Wait-Loopback([scriptblock]$test, [Diagnostics.Process]$process, [string]$failure) {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        try { if (& $test) { return } } catch {}
        if ($process -and $process.HasExited) { break }
        Start-Sleep -Milliseconds 500
    }
    throw $failure
}

function Test-Health($response) {
    if ($response.Status -ne 200) { return $false }
    $health = $response.Body | ConvertFrom-Json
    $health.schema -eq 'wayglass.host-health/v0.1' -and $health.status -eq 'ready'
}

function Assert-LoopbackListener([int]$port) {
    $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    Assert-Level ($listeners.Count -gt 0 -and @($listeners | Where-Object LocalAddress -NE '127.0.0.1').Count -eq 0) "Port $port must listen exclusively on IPv4 loopback."
}

function Get-OverlappingApps {
    @(CloudflareList "$accountPath/access/apps" | Where-Object {
        $app = $_
        $targets = @($app.domain) + @($app.self_hosted_domains) + @($app.destinations | ForEach-Object { $_.uri })
        @($targets | Where-Object {
            if ($_) {
                $targetHost = ($_ -replace '^https?://', '' -split '/', 2)[0]
                $domain -like $targetHost
            }
        }).Count -gt 0
    })
}

function Assert-OwnerApp($candidate, [string]$ownerEmail, [string]$providerId) {
    Assert-Level ($candidate.type -eq 'self_hosted' -and $candidate.domain -eq $domain -and
        @($candidate.self_hosted_domains | Where-Object { $_ -and $_ -ne $domain }).Count -eq 0 -and
        @($candidate.destinations | Where-Object { $_ -and ($_.uri -ne $domain -or @($_.overrides | Where-Object { $_ }).Count) }).Count -eq 0 -and
        $candidate.aud -match '^[a-f0-9]{64}$' -and
        @($candidate.allowed_idps).Count -eq 1 -and $candidate.allowed_idps[0] -eq $providerId) 'Existing Access app does not match the dedicated hostname and GitHub identity provider.'
    $policies = @(CloudflareList "$accountPath/access/apps/$($candidate.id)/policies")
    $policy = $policies | Select-Object -First 1
    Assert-Level ($policies.Count -eq 1 -and $policy.decision -eq 'allow' -and
        @($policy.include).Count -eq 1 -and @($policy.include[0].PSObject.Properties.Name).Count -eq 1 -and
        $policy.include[0].email.email -eq $ownerEmail) 'Access policy must grant a single exact owner email with no other grants.'
}

$lease = New-Object Threading.Mutex($false, 'Global\WayglassWorldDeployment')
$locked = $false
try {
    try { $locked = $lease.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
    Assert-Level $locked 'Another Wayglass deployment is in progress.'
    if (-not $Rollback) { $verifiedCommit = Assert-IntegrationHead }
    Initialize-State
    $saved = if (Test-Path -LiteralPath $receipt) { Get-Content -LiteralPath $receipt -Raw | ConvertFrom-Json }
    $secret = Read-Host 'Cloudflare API token' -AsSecureString
    $apiCredential = [Net.NetworkCredential]::new('', $secret)
    $verification = Cloudflare GET '/user/tokens/verify'
    Assert-Level ($verification.result.status -eq 'active') 'Cloudflare API token is inactive.'
    $zones = @(CloudflareList "/zones?name=$domain" | Where-Object { $_.name -eq $domain -and $_.status -eq 'active' })
    Assert-Level ($zones.Count -eq 1) 'The token must access exactly one active wayglass.world zone.'
    $zone = $zones[0]
    $zonePath = "/zones/$($zone.id)"
    $accountPath = "/accounts/$($zone.account.id)"
    if ($saved) {
        Assert-Level ($saved.zoneId -eq $zone.id -and $saved.accountId -eq $zone.account.id) 'Local deployment state refers to a different Cloudflare zone.'
    }

    if ($Rollback) {
        Assert-Level ($saved -and $saved.dnsComment) 'No launcher-owned DNS configuration is recorded for rollback.'
        $record = @(Read-Apex | Where-Object { $_.id -eq $saved.dnsId -or $_.comment -ceq $saved.dnsComment })
        Assert-Level ($record.Count -le 1) 'Multiple DNS records match the local deployment receipt.'
        if ($record.Count) {
            Assert-Level ($record[0].type -eq 'CNAME' -and $record[0].content -eq "$($saved.tunnelId).cfargotunnel.com" -and
                $record[0].comment -ceq $saved.dnsComment) 'Recorded DNS entry has changed. Inspect it before making any changes.'
            $null = Cloudflare DELETE "$zonePath/dns_records/$($record[0].id)"
        }
        Assert-Level (@(Read-Apex | Where-Object { $_.id -eq $saved.dnsId -or $_.comment -ceq $saved.dnsComment }).Count -eq 0) 'Rollback deletion could not be verified.'
        Write-Host 'Verified removal of the launcher-owned DNS route. Access and tunnel configuration remain staged for reuse.'
        return
    }

    $delegated = @(Resolve-DnsName $domain -Type NS -DnsOnly | Where-Object Type -EQ 'NS' |
        ForEach-Object { $_.NameHost.TrimEnd('.').ToLowerInvariant() } | Sort-Object -Unique)
    $expected = @($zone.name_servers | ForEach-Object { $_.TrimEnd('.').ToLowerInvariant() } | Sort-Object -Unique)
    Assert-Level ($delegated.Count -gt 0 -and $expected.Count -gt 0 -and
        ($delegated -join ',') -ceq ($expected -join ',')) 'Public DNS delegation does not match the active Cloudflare zone.'
    $apex = @(Read-Apex | Where-Object { $_.type -in @('A', 'AAAA', 'CNAME') })
    Assert-Level ($apex.Count -le 1 -and (-not $apex.Count -or ($apex[0].type -eq 'CNAME' -and
        $apex[0].proxied -and $apex[0].content -match '^[a-f0-9-]{36}\.cfargotunnel\.com$'))) 'The apex already has an unrelated web record.'
    $organization = (Cloudflare GET "$accountPath/access/organizations").result
    $issuer = ([string]$organization.auth_domain).TrimEnd('/')
    Assert-Level ($issuer -match '^https://[a-z0-9-]+\.cloudflareaccess\.com$') 'Set up the account Zero Trust team domain first.'
    $providers = @(CloudflareList "$accountPath/access/identity_providers" | Where-Object type -EQ 'github')
    Assert-Level ($providers.Count -eq 1) 'The account must have exactly one configured GitHub Access identity provider.'
    $providerId = $providers[0].id
    $apps = @(Get-OverlappingApps)
    Assert-Level ($apps.Count -le 1) 'Multiple Access applications overlap wayglass.world.'
    Assert-Level (-not $apex.Count -or $apps.Count -eq 1) 'Existing public DNS requires an already verified owner-only Access app.'
    $ownerEmail = [string]$env:WAYGLASS_ACCESS_OWNER_EMAIL
    if (-not $ownerEmail -and $saved) { $ownerEmail = [string]$saved.ownerEmail }
    if (-not $ownerEmail) { $ownerEmail = Read-Host 'Exact verified owner email on the GitHub account with 2FA enabled' }
    $ownerEmail = $ownerEmail.Trim().ToLowerInvariant()
    Assert-Level ($ownerEmail -match '^[^\s@*]+@[^\s@*]+\.[^\s@*]+$') 'A single verified email is required.'
    $tunnels = @(foreach ($existingTunnel in (CloudflareList "$accountPath/cfd_tunnel?is_deleted=false")) {
        if ($existingTunnel.name -eq $name -or $existingTunnel.id -eq $saved.tunnelId -or
            ($apex.Count -and "$($existingTunnel.id).cfargotunnel.com" -eq $apex[0].content)) {
            $existingTunnel
        } elseif ($existingTunnel.config_src -eq 'cloudflare' -or $existingTunnel.remote_config -eq $true) {
            $otherConfig = (Cloudflare GET "$accountPath/cfd_tunnel/$($existingTunnel.id)/configurations").result.config
            if (@($otherConfig.ingress | Where-Object { $_.hostname -and $domain -like $_.hostname }).Count) {
                $existingTunnel
            }
        }
    })
    Assert-Level ($tunnels.Count -le 1) 'Different existing Cloudflare tunnels match the deployment. Resolve the conflict first.'
    if ($apex.Count) {
        Assert-Level ($tunnels.Count -eq 1 -and "$($tunnels[0].id).cfargotunnel.com" -eq $apex[0].content) 'Existing DNS does not match the selected tunnel.'
    }
    if ($apps.Count) {
        $app = $apps[0]
        Assert-OwnerApp $app $ownerEmail $providerId
    } else {
        $app = (Cloudflare POST "$accountPath/access/apps" @{
            name = $name; type = 'self_hosted'; domain = $domain; allowed_idps = @($providerId); session_duration = '8h'
            destinations = @(@{ type = 'public'; uri = $domain })
            policies = @(@{ name = 'Wayglass owner'; decision = 'allow'; include = @(@{ email = @{ email = $ownerEmail } }) })
        }).result
    }
    $apps = @(Get-OverlappingApps)
    Assert-Level ($apps.Count -eq 1 -and $apps[0].id -eq $app.id) 'Could not read back the dedicated Access application.'
    $app = $apps[0]
    Assert-OwnerApp $app $ownerEmail $providerId
    Write-Host 'Verified exact-email GitHub Access policy. GitHub 2FA is managed by the owner account.'

    $env:WAYGLASS_ACCESS_ISSUER = $issuer
    $env:WAYGLASS_ACCESS_AUDIENCE = $app.aud
    $env:WAYGLASS_ACCESS_OWNER_EMAIL = $ownerEmail
    $env:WAYGLASS_ACCESS_PUBLIC_ORIGIN = $public
    if (-not $env:WAYGLASS_TAILNET_ORIGIN) {
        $tailscale = Get-Command tailscale.exe -ErrorAction SilentlyContinue
        if ($tailscale) {
            $tailOutput = & $tailscale.Source status --json
            if ($LASTEXITCODE -eq 0) {
                $tail = $tailOutput | ConvertFrom-Json
                if ($tail.BackendState -eq 'Running' -and $tail.Self.DNSName -match '^[a-zA-Z0-9.-]+\.ts\.net\.?$') {
                    $env:WAYGLASS_TAILNET_ORIGIN = 'https://' + $tail.Self.DNSName.TrimEnd('.')
                }
            }
        }
    }
    $allowedOrigins = $env:HEARTHGATE_ALLOWED_ORIGINS
    $localSettings = Join-Path $root 'apps/starwell-server/.env'
    if (-not $allowedOrigins -and (Test-Path -LiteralPath $localSettings -PathType Leaf)) {
        $configuredOrigin = Select-String -LiteralPath $localSettings -Pattern '^\s*HEARTHGATE_ALLOWED_ORIGINS\s*=(.*)$' |
            Select-Object -First 1
        if ($configuredOrigin) { $allowedOrigins = $configuredOrigin.Matches[0].Groups[1].Value.Trim() }
    }
    $env:HEARTHGATE_ALLOWED_ORIGINS = (@($allowedOrigins -split ',') + @($public, $env:WAYGLASS_TAILNET_ORIGIN) |
        Where-Object { $_ } | Select-Object -Unique) -join ','
    $node = (Get-Command node.exe).Source
    Assert-Level ([int]((& $node --version).TrimStart('v').Split('.')[0]) -ge 24) 'Node.js 24 or newer is required.'
    if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
        Push-Location $root
        try {
            if (-not (Test-Path (Join-Path $root 'node_modules/vite'))) {
                & npm.cmd ci --no-audit --no-fund
                Assert-Level ($LASTEXITCODE -eq 0) 'Wayglass build dependency installation failed.'
            }
            if (-not (Test-Path (Join-Path $root 'apps/starwell-server/node_modules/express'))) {
                $electronSetting = $env:ELECTRON_SKIP_BINARY_DOWNLOAD
                try {
                    $env:ELECTRON_SKIP_BINARY_DOWNLOAD = '1'
                    & npm.cmd --prefix apps/starwell-server ci --no-audit --no-fund
                    Assert-Level ($LASTEXITCODE -eq 0) 'Hearthgate dependency installation failed.'
                } finally {
                    $env:ELECTRON_SKIP_BINARY_DOWNLOAD = $electronSetting
                }
            }
            & npm.cmd run wayglass:deploy:server
            Assert-Level ($LASTEXITCODE -eq 0) 'Wayglass build and staging failed. Install the existing repository dependencies first.'
        } finally { Pop-Location }
        $startedOrigin = Start-Process $node -ArgumentList 'server-secure.js' -WorkingDirectory (Join-Path $root 'apps\starwell-server') -PassThru
    }
    Wait-Loopback { Test-Health (Request GET "$origin/api/v1/wayglass/healthz" $null) } $startedOrigin 'The existing Hearthgate origin is not healthy.'
    Assert-LoopbackListener 3000
    $localHouse = Request POST "$origin/api/v1/house/session/access" @{} @{ Host = $domain; Origin = $public }
    Assert-Level ($localHouse.Status -eq 401) 'Restart Hearthgate with the existing House session secret and the Wayglass Access configuration.'
    if (-not (Get-NetTCPConnection -LocalPort 32861 -State Listen -ErrorAction SilentlyContinue)) {
        $startedGateway = Start-Process $node -ArgumentList @('scripts/wayglass-tailnet-serve.mjs', '--gateway-only') -WorkingDirectory $root -PassThru
    }
    Wait-Loopback { Test-Health (Request GET "$gateway/api/v1/wayglass/healthz" $null) } $startedGateway 'The existing restricted gateway is not healthy.'
    Assert-LoopbackListener 32861
    Assert-Level ((Request GET "$gateway/wayglass/" $null).Body -match '<div id="app"') 'Full Wayglass UI is not staged.'
    Assert-Level ((Request GET "$gateway/api/v1/house/session" $null).Status -eq 401) 'House Steward anonymous rejection failed.'
    Assert-Level ((Request GET "$gateway/mcp" $null).Status -eq 404) 'The gateway does not isolate unrelated services.'
    foreach ($path in @('/', '/wayglass/', '/api/v1/house/session')) {
        $denied = Request GET "$gateway$path" $null @{ Host = $domain; 'Cf-Access-Jwt-Assertion' = 'forged.token.value' }
        Assert-Level ($denied.Status -eq 401 -and $denied.Enabled) 'The existing gateway must be restarted with the Access-enabled launcher.'
    }

    $tunnel = if ($tunnels.Count) { $tunnels[0] } else {
        (Cloudflare POST "$accountPath/cfd_tunnel" @{ name = $name; config_src = 'cloudflare' }).result
    }
    Assert-Level ($tunnel.config_src -eq 'cloudflare' -or $tunnel.remote_config -eq $true) 'Existing tunnel is locally managed. Review its configuration before reuse.'
    $tunnelPath = "$accountPath/cfd_tunnel/$($tunnel.id)"
    $team = ([uri]$issuer).Host.Split('.')[0]
    $ingress = @(
        @{ hostname = $domain; service = $gateway; originRequest = @{
            httpHostHeader = $domain; access = @{ required = $true; teamName = $team; audTag = @($app.aud) }
        } },
        @{ service = 'http_status:404' }
    )
    $config = (Cloudflare GET "$tunnelPath/configurations").result.config
    if (-not $config.ingress -or (@($config.ingress).Count -eq 1 -and $config.ingress[0].service -eq 'http_status:404')) {
        Assert-Level (-not $apex.Count) 'The existing DNS route points to a tunnel without the verified ingress.'
        Assert-Level (-not $config.'warp-routing'.enabled) 'Existing tunnel serves a private network and requires manual review.'
        if (-not $config) { $config = [pscustomobject]@{} }
        $config | Add-Member -NotePropertyName ingress -NotePropertyValue $ingress -Force
        $null = Cloudflare PUT "$tunnelPath/configurations" @{ config = $config }
    }
    $config = (Cloudflare GET "$tunnelPath/configurations").result.config
    Assert-Level (@($config.ingress).Count -eq 2) 'The tunnel must have one restricted route and a fallback.'
    $route = $config.ingress[0]
    Assert-Level (@($config.ingress).Count -eq 2 -and $route.hostname -eq $domain -and -not $route.path -and
        $route.service -eq $gateway -and $route.originRequest.httpHostHeader -eq $domain -and
        $route.originRequest.access.required -eq $true -and $route.originRequest.access.teamName -eq $team -and
        @($route.originRequest.access.audTag).Count -eq 1 -and $route.originRequest.access.audTag[0] -eq $app.aud -and
        -not $config.ingress[1].hostname -and -not $config.ingress[1].path -and
        $config.ingress[1].service -eq 'http_status:404' -and -not $config.'warp-routing'.enabled) 'Existing tunnel configuration differs from the restricted Wayglass route.'

    if ($saved) {
        Assert-Level ($saved.tunnelId -eq $tunnel.id) 'Local deployment state belongs to another tunnel.'
    } else {
        Assert-Level (-not (Test-Path -LiteralPath $tokenFile)) 'A connector token exists without verifiable local deployment state.'
        $saved = [pscustomobject]@{
            zoneId = $zone.id; accountId = $zone.account.id; tunnelId = $tunnel.id; dnsId = $null; ownerEmail = $ownerEmail
            dnsComment = 'Wayglass Windows launcher ' + [Guid]::NewGuid().ToString('N')
        }
        Write-Receipt $saved
    }
    $cloudflared = Install-Connector $accountPath $tunnel.id
    $connected = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if ((Cloudflare GET $tunnelPath).result.status -eq 'healthy') { $connected = $true; break }
        Start-Sleep -Seconds 3
    }
    Assert-Level $connected 'Cloudflare has not confirmed a healthy tunnel connector.'
    $apps = @(Get-OverlappingApps)
    Assert-Level ($apps.Count -eq 1 -and $apps[0].id -eq $app.id -and $apps[0].aud -eq $app.aud) 'Access configuration changed before publication.'
    Assert-OwnerApp $apps[0] $ownerEmail $providerId
    $target = "$($tunnel.id).cfargotunnel.com"
    $currentApex = @(Read-Apex | Where-Object { $_.type -in @('A', 'AAAA', 'CNAME') })
    if (-not $currentApex.Count -and -not $apex.Count) {
        $addedRecord = (Cloudflare POST "$zonePath/dns_records" @{
            type = 'CNAME'; name = $domain; content = $target; proxied = $true; ttl = 1; comment = $saved.dnsComment
        }).result
        $saved.dnsId = $addedRecord.id
        Write-Receipt $saved
        $currentApex = @(Read-Apex | Where-Object { $_.type -in @('A', 'AAAA', 'CNAME') })
    }
    Assert-Level ($currentApex.Count -eq 1 -and $currentApex[0].type -eq 'CNAME' -and $currentApex[0].proxied -and
        $currentApex[0].content -eq $target) 'DNS readback did not verify the protected tunnel target.'
    $edge = $false
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        if (Resolve-DnsName $domain -Type A -DnsOnly -ErrorAction SilentlyContinue) {
            & $node (Join-Path $root 'scripts/wayglass-cloudflare-preflight.mjs') --url $public
            if ($LASTEXITCODE -eq 0) { $edge = $true; break }
        }
        Start-Sleep -Seconds 5
    }
    Assert-Level $edge 'Public DNS, trusted HTTPS, and the anonymous Access challenge could not be verified.'
    Write-Host 'Complete the GitHub Access sign-in in the browser opened by cloudflared.'
    # Capture stdout. Cloudflared manages its CLI session cache outside the checkout.
    $browserToken = @(& $cloudflared access token --app $public 2>$null |
        Where-Object { $_ -cmatch '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' })
    Assert-Level ($LASTEXITCODE -eq 0 -and $browserToken.Count -eq 1) 'Could not obtain an authenticated Access session.'
    $accessHeaders = @{ 'Cf-Access-Token' = $browserToken[0] }
    $livePage = Request GET "$public/wayglass/" $null $accessHeaders
    Assert-Level ($livePage.Status -eq 200 -and $livePage.Body -match '<div id="app"') 'The authenticated request did not reach the Wayglass UI.'
    Assert-Level (Test-Health (Request GET "$public/api/v1/wayglass/healthz" $null $accessHeaders)) 'Authenticated Wayglass runtime health failed.'
    Assert-Level ((Request GET "$public/mcp" $null $accessHeaders).Status -eq 404) 'Authenticated request reached an unrelated route.'
    $accessHeaders.Origin = $public
    $exchange = Request POST "$public/api/v1/house/session/access" @{} $accessHeaders
    $house = $exchange.Body | ConvertFrom-Json
    Assert-Level ($exchange.Status -eq 201 -and $house.connected -eq $true -and $house.role -eq 'steward' -and
        $house.mode -eq 'cloudflare-access') 'The existing House Steward Access exchange failed.'
    $cookies = @($exchange.Cookies | Where-Object { $_ -clike '__Host-*=*' -and $_ -match ';\s*Secure(?:;|$)' })
    Assert-Level ($cookies.Count -eq 1) 'House Steward did not issue a Secure host cookie.'
    $accessHeaders.Cookie = ($cookies[0] -split ';', 2)[0]
    $session = Request GET "$public/api/v1/house/session" $null $accessHeaders
    Assert-Level ($session.Status -eq 200 -and ($session.Body | ConvertFrom-Json).role -eq 'steward') 'House Steward session continuity failed.'
    $saved | Add-Member -NotePropertyName verifiedCommit -NotePropertyValue $verifiedCommit -Force
    $saved | Add-Member -NotePropertyName verifiedAt -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
    $saved.ownerEmail = $ownerEmail
    Write-Receipt $saved
    $keepProcesses = $true
    Start-Process "$public/wayglass/" -ErrorAction SilentlyContinue
    Write-Host "Wayglass: $public/wayglass/"
    Write-Host 'Cloudflared starts with Windows. Hearthgate and its loopback gateway must also be running for Wayglass to respond.'
} catch {
    if ($addedRecord) {
        try {
            $unchanged = @(Read-Apex | Where-Object id -EQ $addedRecord.id)
            if ($unchanged.Count) {
                Assert-Level ($unchanged[0].type -eq 'CNAME' -and $unchanged[0].content -eq $target -and
                    $unchanged[0].comment -ceq $saved.dnsComment) 'DNS record changed after publication.'
                $null = Cloudflare DELETE "$zonePath/dns_records/$($addedRecord.id)"
            }
            Assert-Level (@(Read-Apex | Where-Object id -EQ $addedRecord.id).Count -eq 0) 'DNS record still present.'
            Write-Warning 'Removed and verified the DNS route created by this run.'
        } catch { Write-Warning 'Could not verify DNS rollback. Run this launcher with -Rollback and inspect the apex record.' }
    }
    throw
} finally {
    if (-not $keepProcesses) {
        foreach ($process in @($startedGateway, $startedOrigin)) {
            if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue }
        }
    }
    $accessHeaders = $browserToken = $exchange = $session = $cookies = $null
    $apiCredential = $null
    if ($secret) { $secret.Dispose() }
    foreach ($key in $environmentBefore.Keys) {
        [Environment]::SetEnvironmentVariable($key, $environmentBefore[$key], 'Process')
    }
    $http.Dispose()
    if ($locked) { $lease.ReleaseMutex() }
    $lease.Dispose()
}
