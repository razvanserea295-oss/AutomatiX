# Stop Automatix node on :3500 and start fresh with .env
$ErrorActionPreference = "Stop"
$ROOT = Split-Path $PSScriptRoot -Parent
Set-Location $ROOT

$lines = netstat -ano | Select-String ":3500\s+.*LISTENING"
foreach ($line in $lines) {
  if ($line -match '\s+(\d+)\s*$') {
    $listenPid = [int]$Matches[1]
    if ($listenPid -gt 0) {
      Write-Host "[restart] Stopping PID $listenPid on :3500"
      taskkill /F /PID $listenPid 2>$null | Out-Null
    }
  }
}

Start-Sleep -Seconds 2
$lock = Join-Path $ROOT "data\promix.db.lock"
if (Test-Path $lock) { Remove-Item $lock -Force }

Write-Host "[restart] Starting server..."
Start-Process -FilePath "node" -ArgumentList "--env-file-if-exists=.env","dist-server/server/index.js" -WorkingDirectory $ROOT -WindowStyle Hidden
Start-Sleep -Seconds 3
$check = netstat -ano | Select-String ":3500\s+.*LISTENING"
if ($check) { Write-Host "[restart] Server listening on :3500" } else { Write-Host "[restart] WARN: port 3500 not listening yet" }
