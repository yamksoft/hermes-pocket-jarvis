$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
if (-not (Test-Path .\.venv\Scripts\python.exe)) { throw 'Run scripts\setup.ps1 first.' }
Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=][^=]*)=(.*)$') { Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim() } }
& uv run python agent\agent.py dev
