[CmdletBinding()]
param(
  [switch]$DeployVercel
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path 'package.json')) {
  throw "Run this script from the CloudPay repository."
}

$trackedEnv = git ls-files --error-unmatch .env.local 2>$null
if ($LASTEXITCODE -eq 0 -and $trackedEnv) {
  throw '.env.local is tracked by Git. Remove it from Git and rotate every credential in it before deploying.'
}

Write-Host 'Installing locked dependencies...' -ForegroundColor Cyan
pnpm install --frozen-lockfile

Write-Host 'Running the production build...' -ForegroundColor Cyan
pnpm run build

if (-not $DeployVercel) {
  Write-Host ''
  Write-Host 'Build completed. To deploy the Next.js app to Vercel, run:' -ForegroundColor Green
  Write-Host '  .\scripts\deploy-free.ps1 -DeployVercel'
  Write-Host ''
  Write-Host 'The optional Spring Boot service is configured by render.yaml. Import this repository in Render and create the Blueprint; enter its sync:false secrets in the dashboard.'
  exit 0
}

Write-Host 'Starting Vercel deployment. Vercel will ask you to log in and choose a project if needed.' -ForegroundColor Cyan
pnpm dlx vercel@latest --prod
