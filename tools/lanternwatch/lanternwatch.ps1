param(
  [string]$ConfigPath = "$PSScriptRoot/config.json",
  [string]$LogDirectory = "$PSScriptRoot/logs",
  [int]$IntervalSeconds = 5,
  [switch]$Once
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-LanternwatchConfig {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Lanternwatch config not found: $Path. Copy config.example.json to config.json first."
  }

  Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Get-ProcessNameSafe {
  param([int]$ProcessId)

  try {
    return (Get-Process -Id $ProcessId -ErrorAction Stop).ProcessName
  }
  catch {
    return 'unknown'
  }
}

function Test-MatchAny {
  param(
    [string]$Value,
    [object[]]$Patterns
  )

  foreach ($pattern in $Patterns) {
    if ($Value -like [string]$pattern) { return $true }
  }
  return $false
}

function Get-Classification {
  param(
    [string]$ProcessName,
    [string]$RemoteAddress,
    [int]$RemotePort,
    [object]$Config
  )

  $knownProcesses = @($Config.known_processes)
  $ignoredAddresses = @($Config.ignored_remote_addresses)
  $developerPorts = @($Config.developer_ports | ForEach-Object { [int]$_ })

  if (Test-MatchAny -Value $RemoteAddress -Patterns $ignoredAddresses) {
    return 'local-or-ignored'
  }

  if (Test-MatchAny -Value $ProcessName -Patterns $knownProcesses) {
    return 'expected-process'
  }

  if ($developerPorts -contains $RemotePort) {
    return 'expected-port'
  }

  return 'review'
}

function Get-LanternwatchSnapshot {
  param([object]$Config)

  $timestamp = (Get-Date).ToUniversalTime().ToString('o')
  $connections = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue

  foreach ($connection in $connections) {
    $processName = Get-ProcessNameSafe -ProcessId $connection.OwningProcess
    $classification = Get-Classification `
      -ProcessName $processName `
      -RemoteAddress $connection.RemoteAddress `
      -RemotePort $connection.RemotePort `
      -Config $Config

    [pscustomobject]@{
      timestamp_utc  = $timestamp
      computer       = $env:COMPUTERNAME
      process        = $processName
      process_id     = $connection.OwningProcess
      local_address  = $connection.LocalAddress
      local_port     = $connection.LocalPort
      remote_address = $connection.RemoteAddress
      remote_port    = $connection.RemotePort
      state          = $connection.State
      classification = $classification
    }
  }
}

$config = Get-LanternwatchConfig -Path $ConfigPath
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
$logPath = Join-Path $LogDirectory ("lanternwatch-{0}.jsonl" -f (Get-Date -Format 'yyyy-MM-dd'))

Write-Host "Lanternwatch is observing established TCP connections."
Write-Host "Log: $logPath"
Write-Host "Press Ctrl+C to stop."

$seen = @{}

do {
  foreach ($entry in Get-LanternwatchSnapshot -Config $config) {
    $key = '{0}|{1}|{2}|{3}|{4}' -f $entry.process_id, $entry.local_port, $entry.remote_address, $entry.remote_port, $entry.classification

    if (-not $seen.ContainsKey($key)) {
      $seen[$key] = $entry.timestamp_utc
      $entry | ConvertTo-Json -Compress | Add-Content -LiteralPath $logPath -Encoding utf8

      $marker = switch ($entry.classification) {
        'review' { '[REVIEW]' }
        'expected-process' { '[KNOWN]' }
        'expected-port' { '[PORT]' }
        default { '[LOCAL]' }
      }

      Write-Host ("{0} {1,-9} {2,-20} -> {3}:{4}" -f (Get-Date -Format 'HH:mm:ss'), $marker, $entry.process, $entry.remote_address, $entry.remote_port)
    }
  }

  if (-not $Once) { Start-Sleep -Seconds $IntervalSeconds }
} while (-not $Once)
