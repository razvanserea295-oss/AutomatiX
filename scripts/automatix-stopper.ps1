# automatix-stopper.ps1
#
# Stops every service started by automatix-launcher.ps1. Safe to run
# repeatedly. Looks at logs/automatix.pids.json first; falls back to
# port-and-process-name scanning so it works even if the PID file is
# missing or stale.

$ErrorActionPreference = 'SilentlyContinue'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $ProjectRoot 'logs\automatix.pids.json'

Clear-Host
Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '         A U T O M A T I X   S T O P          ' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''

$stopped = @()

# 1. Stop by recorded PID (preferred — exact targeting).
if (Test-Path $PidFile) {
  try {
    $pids = Get-Content $PidFile -Raw | ConvertFrom-Json
    foreach ($name in 'ai_service', 'node', 'cloudflared') {
      $pid_ = $pids.$name
      if ($pid_) {
        try {
          $p = Get-Process -Id $pid_ -ErrorAction Stop
          Stop-Process -Id $pid_ -Force
          $stopped += "$name (PID $pid_)"
        } catch { }
      }
    }
  } catch {
    Write-Host 'PID file corupt - ignor.' -ForegroundColor DarkGray
  }
}

# 2. Sweep by port (catches detached children whose PID was lost).
foreach ($port in 3500, 8100) {
  $conns = Get-NetTCPConnection -LocalPort $port | Where-Object { $_.State -eq 'Listen' }
  foreach ($c in $conns) {
    try {
      $p = Get-Process -Id $c.OwningProcess
      Stop-Process -Id $c.OwningProcess -Force
      $stopped += "$($p.ProcessName) :$port (PID $($c.OwningProcess))"
    } catch { }
  }
}

# 3. Sweep cloudflared by name (no port to grep against).
foreach ($p in Get-Process -Name 'cloudflared') {
  Stop-Process -Id $p.Id -Force
  $stopped += "cloudflared (PID $($p.Id))"
}

# Clean up the PID file so a re-run doesn't claim things.
if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

if ($stopped.Count -eq 0) {
  Write-Host 'Nu rula nimic. Toate serviciile sunt deja oprite.' -ForegroundColor Yellow
} else {
  Write-Host 'Oprite:' -ForegroundColor Green
  $stopped | Sort-Object -Unique | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
}
Write-Host ''
Start-Sleep -Seconds 2
