# Shaandar CRM — Interactive Supabase .env.local setup (Windows)
# Run: npm run setup:supabase
# Does NOT print your keys back to the terminal after saving.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env.local"

Write-Host ""
Write-Host "=== Shaandar CRM — Supabase Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Get keys from: https://supabase.com/dashboard"
Write-Host "  Project Settings -> API -> Project URL, anon key, service_role key"
Write-Host "  Project Settings -> Database -> Database password (required for attendance tables)"
Write-Host ""
Write-Host "Env file: $envFile"
Write-Host ""

$url = Read-Host "Paste Project URL (https://xxxxx.supabase.co)"
$anon = Read-Host "Paste anon public key"
$service = Read-Host "Paste service_role key (secret)"
$dbPassword = Read-Host "Paste database password (Supabase -> Settings -> Database -> Database password)"

if ($url -match "YOUR_PROJECT_REF|your-") {
  Write-Host "ERROR: URL still looks like a placeholder." -ForegroundColor Red
  exit 1
}
if ($service -match "your-service-role-key-here") {
  Write-Host "ERROR: service_role key still looks like a placeholder." -ForegroundColor Red
  exit 1
}
if ($url -notmatch "^https://[a-z0-9-]+\.supabase\.co/?$") {
  Write-Host "ERROR: URL format invalid. Example: https://abcdefgh.supabase.co" -ForegroundColor Red
  exit 1
}
if (-not $dbPassword.Trim()) {
  Write-Host "ERROR: Database password is required — attendance tables cannot be created without it." -ForegroundColor Red
  Write-Host "Find it in Supabase Dashboard -> Project Settings -> Database -> Database password" -ForegroundColor Yellow
  exit 1
}

$content = @"
# Supabase — Shaandar CRM (configured $(Get-Date -Format "yyyy-MM-dd HH:mm"))
NEXT_PUBLIC_SUPABASE_URL=$($url.TrimEnd('/'))
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service
SUPABASE_DB_PASSWORD=$dbPassword
"@

Set-Content -Path $envFile -Value $content -Encoding UTF8
Write-Host ""
Write-Host "Saved .env.local" -ForegroundColor Green
Write-Host "Running connection check..." -ForegroundColor Yellow
Write-Host ""

Set-Location $root
npm run check:supabase

Write-Host ""
Write-Host "Applying attendance schema migration (011)..." -ForegroundColor Yellow
Write-Host ""
npm run migrate:attendance
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "WARNING: Attendance migration failed — run npm run migrate:attendance manually or paste supabase/migrations/011_ensure_attendance_tables.sql in Supabase SQL Editor." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Setup complete — attendance tables are ready." -ForegroundColor Green
Write-Host "Restart dev server (npm run dev) if it is already running." -ForegroundColor Yellow
Write-Host ""
