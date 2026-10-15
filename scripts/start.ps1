param([switch]$Lan)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Install Node.js 24 LTS or newer, then open PowerShell again.'
}
$nodeMajor = [int](& node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 24) { throw 'BuyMe requires Node.js 24 or newer.' }
Push-Location (Join-Path $PSScriptRoot '..')
try {
    if ($Lan) { $env:HOST = '0.0.0.0' } else { $env:HOST = '127.0.0.1' }
    if (-not $env:PORT) { $env:PORT = '3000' }
    Write-Host "Starting BuyMe on port $env:PORT. Stop with Ctrl+C."
    if ($Lan) { Write-Host 'LAN mode: use this computer IPv4 address from a phone on the same trusted Wi-Fi. Do not forward this HTTP port to the internet.' }
    & node server.mjs
    if ($LASTEXITCODE -ne 0) { throw 'BuyMe stopped with an error.' }
} finally { Pop-Location }
