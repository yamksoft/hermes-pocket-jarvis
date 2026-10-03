$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } else { 'python' }
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { & $python -m pip install --user uv }
& uv sync --all-groups
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

$localEnv = @"
# Backend LiveKit Server Config (Local Mode)
LIVEKIT_URL=http://127.0.0.1:7880
LIVEKIT_PUBLIC_URL=http://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Frontend LiveKit Server Config
NEXT_PUBLIC_LIVEKIT_URL=ws://127.0.0.1:7880
NEXT_PUBLIC_APP_CONFIG_ENDPOINT=/api/livekit/config
"@

$cloudEnv = @"
# Backend LiveKit Server Config (Cloud Mode)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_PUBLIC_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Frontend LiveKit Server Config
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_APP_CONFIG_ENDPOINT=/api/livekit/config
"@

if (-not (Test-Path .env.local)) { Set-Content -Path .env.local -Value $localEnv }
if (-not (Test-Path .env.cloud)) { Set-Content -Path .env.cloud -Value $cloudEnv }

if (-not (Test-Path frontend)) { New-Item -ItemType Directory -Path frontend | Out-Null }
if (-not (Test-Path frontend\.env.local)) { Copy-Item .env.local frontend\.env.local }
if (-not (Test-Path frontend\.env.cloud)) { Copy-Item .env.cloud frontend\.env.cloud }

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. (Optional) If you want to use a Local LiveKit server (Offline Mode)," -ForegroundColor White
Write-Host "   run the following command to install it via WSL:" -ForegroundColor White
Write-Host "   wsl -e bash -l -c `"./scripts/setup_livekit.sh`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Edit your environment variables in the following 5 files:" -ForegroundColor White
Write-Host "   Backend (Main Folder):" -ForegroundColor White
Write-Host "   notepad $project\.env" -ForegroundColor Cyan
Write-Host "   notepad $project\.env.local" -ForegroundColor Cyan
Write-Host "   notepad $project\.env.cloud" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Frontend (frontend Folder):" -ForegroundColor White
Write-Host "   notepad $project\frontend\.env.local" -ForegroundColor Cyan
Write-Host "   notepad $project\frontend\.env.cloud" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Register your agent with the Hermes API by running:" -ForegroundColor White
Write-Host "   .\scripts\register-hermes.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. To start the system, open 3 separate PowerShell windows and run:" -ForegroundColor White
Write-Host "   Terminal 1 (Backend) : .\scripts\start.ps1" -ForegroundColor Cyan
Write-Host "   Terminal 2 (AI Agent): .\scripts\agent.ps1" -ForegroundColor Cyan
Write-Host "   Terminal 3 (Frontend): cd frontend ; npm run dev" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
