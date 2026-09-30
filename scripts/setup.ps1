$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } else { 'python' }
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { & $python -m pip install --user uv }
& uv sync --all-groups
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Write-Host 'Ready. Edit .env, then run scripts\start.ps1 and scripts\agent.ps1.'
