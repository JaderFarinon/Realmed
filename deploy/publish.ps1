param([string]$PuttyDirectory = 'C:\Users\jader\AppData\Local\Microsoft\WinGet\Packages\PuTTY.PuTTY_Microsoft.Winget.Source_8wekyb3d8bbwe')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskRelease = Get-Date -Format 'yyyyMMdd-HHmmss'
$taskWork = Join-Path $taskRoot '.deployment'
$taskPlink = Join-Path $PuttyDirectory 'PLINK.EXE'
$taskPscp = Join-Path $PuttyDirectory 'PSCP.EXE'
New-Item -ItemType Directory -Force -Path $taskWork | Out-Null
$taskOldApiUrl = $env:VITE_API_URL
try {
    $env:VITE_API_URL = 'https://realmedapi.qyvia.com.br'
    Push-Location (Join-Path $taskRoot 'frontend')
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' } } finally { Pop-Location }
} finally { $env:VITE_API_URL = $taskOldApiUrl }
$taskArchive = Join-Path $taskWork "$taskRelease.tar.gz"
Push-Location $taskRoot
try {
    tar -czf $taskArchive --exclude=node_modules --exclude='.env*' --exclude='*.tsbuildinfo' backend frontend integrations deploy docs AGENTS.md
    if ($LASTEXITCODE -ne 0) { throw 'Packaging failed' }
} finally { Pop-Location }
& $taskPscp -batch -agent -P 3022 $taskArchive '225881-2628@gate.paas.saveincloud.net.br:/qyvia/realmed/shared/'
if ($LASTEXITCODE -ne 0) { throw 'Upload failed; ensure the SSH key is unlocked in Pageant' }
$taskCommand = Join-Path $taskWork 'publish-command.txt'
[IO.File]::WriteAllText($taskCommand, "set -e`nmkdir -p /qyvia/realmed/shared/deploy-staging`ntar -xzf /qyvia/realmed/shared/$taskRelease.tar.gz -C /qyvia/realmed/shared/deploy-staging deploy/release.sh`nsh /qyvia/realmed/shared/deploy-staging/deploy/release.sh $taskRelease`n")
& $taskPlink -batch -agent -ssh -P 3022 -m $taskCommand '225881-2628@gate.paas.saveincloud.net.br'
if ($LASTEXITCODE -ne 0) { throw 'Publication failed; review Realmed logs and previous release' }
