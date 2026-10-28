param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$gameUrl = 'http://127.0.0.1:8766/BlockTown/menu.html'
$healthUrl = 'http://127.0.0.1:8766/__blocktown_health'
function Get-GameHealth {
    try { return Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 } catch { return $null }
}
$gameHealth = Get-GameHealth
if ($null -eq $gameHealth) {
    $pythonPath = (Get-Command python -ErrorAction Stop).Source
    $serverPath = Join-Path $PSScriptRoot 'tools\blocktown_server.py'
    $logDirectory = Join-Path $PSScriptRoot '.local'
    New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
    $serverArguments = @('-u', ('"' + $serverPath + '"'), '--directory', ('"' + $gameRoot + '"'), '--port', '8766')
    $gameProcess = Start-Process -FilePath $pythonPath -ArgumentList $serverArguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'blocktown-server.log') -RedirectStandardError (Join-Path $logDirectory 'blocktown-server-error.log')
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        Start-Sleep -Milliseconds 200
        $gameHealth = Get-GameHealth
        if ($null -ne $gameHealth) { break }
        if ($gameProcess.HasExited) { throw 'BlockTown server could not start. Check .local/blocktown-server-error.log; port 8766 may already be in use.' }
    }
}
if ($null -eq $gameHealth -or $gameHealth.app -ne 'blocktown' -or $gameHealth.root -ne $gameRoot) {
    throw 'Port 8766 is unavailable or serves a different game folder. No existing process was stopped.'
}
Write-Output ('BlockTown ready: ' + $gameUrl)
if (-not $NoBrowser) { Start-Process $gameUrl }
