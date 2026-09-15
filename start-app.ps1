tskill "powershell.exe"

# Caminho base
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Backend
$backendPath = Join-Path $root "backend"
Start-Process "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm install; node app.js"

# Frontend
$frontendPath = Join-Path $root "frontend"
Start-Process "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm install; npm run dev"

