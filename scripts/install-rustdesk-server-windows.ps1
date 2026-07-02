# Download and start RustDesk hbbs/hbbr on Windows (no Docker).
param(
  [string]$RelayHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path $PSScriptRoot -Parent
$BIN = Join-Path $ROOT "deploy\rustdesk\bin"
$DATA = Join-Path $ROOT "deploy\rustdesk\data"
$ZIP = Join-Path $env:TEMP "rustdesk-server-windows-x86_64-unsigned.zip"
$URL = "https://github.com/rustdesk/rustdesk-server/releases/download/1.1.15/rustdesk-server-windows-x86_64-unsigned.zip"

New-Item -ItemType Directory -Force -Path $BIN, $DATA | Out-Null

if (-not (Test-Path (Join-Path $BIN "hbbs.exe"))) {
  Write-Host "[rustdesk] Downloading server binaries..."
  Invoke-WebRequest -Uri $URL -OutFile $ZIP -UseBasicParsing
  $extractTmp = Join-Path $env:TEMP "rustdesk-server-extract"
  if (Test-Path $extractTmp) { Remove-Item $extractTmp -Recurse -Force }
  Expand-Archive -Path $ZIP -DestinationPath $extractTmp -Force
  $hbbsSrc = Get-ChildItem -Path $extractTmp -Filter "hbbs.exe" -Recurse | Select-Object -First 1
  $hbbrSrc = Get-ChildItem -Path $extractTmp -Filter "hbbr.exe" -Recurse | Select-Object -First 1
  if (-not $hbbsSrc -or -not $hbbrSrc) { throw "hbbs.exe/hbbr.exe not found inside zip" }
  Copy-Item $hbbsSrc.FullName, $hbbrSrc.FullName -Destination $BIN -Force
  Remove-Item $ZIP -Force -ErrorAction SilentlyContinue
  Remove-Item $extractTmp -Recurse -Force -ErrorAction SilentlyContinue
}

# Stop existing
Get-Process hbbs, hbbr -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "[rustdesk] Starting hbbr..."
Start-Process -FilePath (Join-Path $BIN "hbbr.exe") -WorkingDirectory $DATA -WindowStyle Hidden
Start-Sleep -Seconds 2

Write-Host "[rustdesk] Starting hbbs (-r ${RelayHost}:21117)..."
Start-Process -FilePath (Join-Path $BIN "hbbs.exe") -ArgumentList "-r", "${RelayHost}:21117" -WorkingDirectory $DATA -WindowStyle Hidden
Start-Sleep -Seconds 3

$pub = Join-Path $DATA "id_ed25519.pub"
if (-not (Test-Path $pub)) {
  throw "Key not found at $pub - hbbs may have failed to start."
}
$key = (Get-Content $pub -Raw).Trim()
Write-Host "[rustdesk] Public key: $($key.Substring(0, [Math]::Min(40, $key.Length)))..."

# Update .env
$envPath = Join-Path $ROOT ".env"
$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^192\.168\.' } | Select-Object -First 1).IPAddress
if (-not $lan) { $lan = "127.0.0.1" }

$entries = @{
  "PROMIX_APP_HOST" = "app.automatix.online"
  "PROMIX_RUSTDESK_ID_SERVER" = "${lan}:21116"
  "PROMIX_RUSTDESK_RELAY_SERVER" = "${lan}:21117"
  "PROMIX_RUSTDESK_KEY" = $key
  "PROMIX_RUSTDESK_VIEWER_PATH" = "C:\Program Files\RustDesk\rustdesk.exe"
}

$raw = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { "" }
foreach ($k in $entries.Keys) {
  $v = $entries[$k]
  if ($raw -match "(?m)^$k=.*$") { $raw = $raw -replace "(?m)^$k=.*$", "$k=$v" }
  else { $raw = "$raw`n$k=$v" }
}
Set-Content -Path $envPath -Value $raw.TrimEnd() -Encoding utf8

Write-Host "[rustdesk] Updated .env - LAN ID server: ${lan}:21116"
Write-Host "[rustdesk] Run: npm run support:prepare-bundle"
