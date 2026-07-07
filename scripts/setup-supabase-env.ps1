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
Write-Host ""
Write-Host "Env file: $envFile"
Write-Host ""

$url = Read-Host "Paste Project URL (https://xxxxx.supabase.co)"
$anon = Read-Host "Paste anon public key"
$service = Read-Host "Paste service_role key (secret)"
$dbPassword = Read-Host "Paste database password (Supabase -> Settings -> Database -> Database password) [optional, press Enter to skip]"

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

$content = @"
# Supabase — Shaandar CRM (configured $(Get-Date -Format "yyyy-MM-dd HH:mm"))
NEXT_PUBLIC_SUPABASE_URL=$($url.TrimEnd('/'))
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service
"@

if ($dbPassword.Trim()) {
  $content += "`nSUPABASE_DB_PASSWORD=$dbPassword"
}

Set-Content -Path $envFile -Value $content -Encoding UTF8
Write-Host ""
Write-Host "Saved .env.local" -ForegroundColor Green
Write-Host "Running connection check..." -ForegroundColor Yellow
Write-Host ""

Set-Location $root
npm run check:supabase
