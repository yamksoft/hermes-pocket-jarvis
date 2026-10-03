# هذا السكربت يقوم بتشغيل المنظومة كاملة داخل بيئة WSL في 4 نوافذ منبثقة
$projectDir = "~/Projects/hermes-pocket-jarvis"

Write-Host "Starting LiveKit Server..." -ForegroundColor Cyan
Start-Process wsl.exe -ArgumentList "-- bash -c 'cd $projectDir && echo `"Starting LiveKit...`" && ./scripts/start_livekit.sh; exec bash'"

Write-Host "Starting Backend API..." -ForegroundColor Cyan
Start-Process wsl.exe -ArgumentList "-- bash -c 'cd $projectDir && echo `"Starting Backend...`" && ./scripts/start.sh; exec bash'"

Write-Host "Starting AI Agent..." -ForegroundColor Cyan
Start-Process wsl.exe -ArgumentList "-- bash -c 'cd $projectDir && echo `"Starting Agent...`" && ./scripts/agent.sh; exec bash'"

Write-Host "Starting Frontend (Dashboard)..." -ForegroundColor Cyan
Start-Process wsl.exe -ArgumentList "-- bash -c 'cd $projectDir/frontend && echo `"Starting Frontend...`" && npm run dev; exec bash'"

Write-Host "All services have been launched in separate windows!" -ForegroundColor Green
