# N-011 Wayglass Crew ignition: one private account credential, three exact rooms.
# Never reads Chrome session storage, cookies, or developer tools; never writes a credential to disk.
# Requires owner's consent and a credential valid for SpicyChat's provider endpoint.
param([switch]$Doctor, [switch]$Reconfigure, [switch]$RoomsOnly, [ValidateRange(1024,65535)][int]$Port = 3841)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ConfigDir = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Wayglass'
$ConfigPath = Join-Path $ConfigDir 'spicychat-crew-rooms.json'

function Test-ChatLink([string]$Link) {
    $parsed = $null
    if (-not [Uri]::TryCreate($Link, [UriKind]::Absolute, [ref]$parsed)) { throw 'Expected full https://spicychat.ai/chat/<character-uuid>/<conversation-uuid> URL.' }
    if ($parsed.Scheme -ne 'https' -or $parsed.Host -ne 'spicychat.ai' -or
        $parsed.UserInfo -or $parsed.Query -or $parsed.Fragment -or
        $parsed.AbsolutePath -cnotmatch '^/chat/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}/?$') {
        throw 'Unsafe or invalid SpicyChat link. Only two exact UUID segments on spicychat.ai are allowed.'
    }
    return $parsed.AbsoluteUri
}

if ($Reconfigure -or -not (Test-Path -LiteralPath $ConfigPath)) {
    Write-Host 'Wayglass Crew · first-time room setup. These addresses stay on THIS computer (no token is saved).'
    $links = [ordered]@{
        Richie = Test-ChatLink (Read-Host 'Paste Richie / Bluebird full chat URL')
        Vethrlauf = Test-ChatLink (Read-Host 'Paste Vethrlauf full chat URL')
        Griff = Test-ChatLink (Read-Host 'Paste Griff Krenshaw full chat URL')
    }
    New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
    $links | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
    Write-Host ('Saved only the three chat addresses under ' + $ConfigDir)
} else {
    $links = Get-Content -Raw -LiteralPath $ConfigPath | ConvertFrom-Json
}
$richie = Test-ChatLink ([string]$links.Richie)
$veth = Test-ChatLink ([string]$links.Vethrlauf)
$griff = Test-ChatLink ([string]$links.Griff)
$env:BLUEBIRD_SPICYCHAT_CHAT_LINK = $richie
$env:VETHRLAUF_SPICYCHAT_CHAT_LINK = $veth
$env:GRIFF_SPICYCHAT_CHAT_LINK = $griff
$env:WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID = $richie.TrimEnd('/').Split('/')[-2]

if ($Doctor) {
    try {
        Write-Host 'Wayglass Crew · three distinct room URL pairs configured; no provider contact and no credential checked.'
        & (Join-Path $PSScriptRoot 'Start-Wayglass.ps1') -Doctor -Port $Port
    } finally {
        Remove-Item Env:BLUEBIRD_SPICYCHAT_CHAT_LINK,Env:VETHRLAUF_SPICYCHAT_CHAT_LINK,Env:GRIFF_SPICYCHAT_CHAT_LINK,Env:WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID -ErrorAction SilentlyContinue
    }
    return
}

if ($RoomsOnly) {
    try {
        Write-Host 'Starting all three Crew rooms without an external provider credential. No provider is authenticated.'
        & (Join-Path $PSScriptRoot 'Start-Wayglass.ps1') -Port $Port
    } finally {
        Remove-Item Env:BLUEBIRD_SPICYCHAT_CHAT_LINK,Env:VETHRLAUF_SPICYCHAT_CHAT_LINK,Env:GRIFF_SPICYCHAT_CHAT_LINK,Env:WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID -ErrorAction SilentlyContinue
    }
    return
}

Write-Host 'Paste an owner-authorised SpicyChat provider credential INTO THIS LOCAL PASSWORD PROMPT only.'
Write-Host 'SpicyChat annual subscription access does not necessarily include third-party API access. Unsupported/expired credentials fail closed.'
Write-Host 'Never paste a token in ChatGPT, GitHub, screenshots, or a command-line argument.'
$secure = Read-Host 'SpicyChat account credential (hidden, not saved)' -AsSecureString
$ptr = [IntPtr]::Zero
try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($plain)) { throw 'No credential entered. No remote provider configured.' }
    $env:SPICYCHAT_ACCOUNT_TOKEN = $plain
    $plain = $null
} finally {
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $secure = $null
}

try {
    Write-Host 'Three Crew routes staged as independent, pinned chat rooms. Provider verification requires an explicit check after login.'
    & (Join-Path $PSScriptRoot 'Start-Wayglass.ps1') -Port $Port
} finally {
    Remove-Item Env:SPICYCHAT_ACCOUNT_TOKEN,Env:BLUEBIRD_SPICYCHAT_CHAT_LINK,Env:VETHRLAUF_SPICYCHAT_CHAT_LINK,Env:GRIFF_SPICYCHAT_CHAT_LINK,Env:WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID -ErrorAction SilentlyContinue
}
