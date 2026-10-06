$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logs = Join-Path $root '.runtime-logs'
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Force $logs | Out-Null }

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "         CloudPay -- Starting Up                " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Test-Listening([int]$port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Port([int]$port, [int]$maxSeconds = 120, [string]$label = "service") {
    Write-Host "  Waiting for $label on port $port..." -ForegroundColor Yellow
    $elapsed = 0
    while (-not (Test-Listening $port) -and $elapsed -lt $maxSeconds) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "     ($elapsed s / $maxSeconds s)" -ForegroundColor DarkGray
    }
    if (Test-Listening $port) {
        Write-Host "  OK: $label is ready!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  WARNING: $label did not start within $maxSeconds seconds" -ForegroundColor Red
        Write-Host "  Check logs in .runtime-logs\" -ForegroundColor Red
        return $false
    }
}

# -- 1. Check .env.local --
$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.local not found. Create it from .env.example first." -ForegroundColor Red
    exit 1
}

# -- 2. Load environment variables --
Write-Host "Loading environment variables..." -ForegroundColor Cyan
Get-Content $envFile | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    if ($parts.Length -eq 2) {
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

# -- 3. Start Backend (Spring Boot) --
if (-not (Test-Listening 8080)) {
    Write-Host ""
    Write-Host "Starting Spring Boot backend..." -ForegroundColor Cyan

    $backendDir = Join-Path $root 'backend'
    $mvnwCmd = Join-Path $backendDir 'mvnw.cmd'
    if (-not (Test-Path $mvnwCmd)) {
        Write-Host "  mvnw.cmd not found, trying system mvn..." -ForegroundColor Yellow
        $mvnCmd = 'mvn'
    } else {
        $mvnCmd = $mvnwCmd
    }

    $envContent = @{}
    Get-Content $envFile | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) { $envContent[$parts[0].Trim()] = $parts[1].Trim() }
    }

    $subUrl  = $envContent['SUPABASE_URL']
    $subKey  = $envContent['SUPABASE_PUBLISHABLE_KEY']
    $subSec  = $envContent['SUPABASE_SECRET_KEY']
    $subJwks = $envContent['SUPABASE_JWKS_URL']
    $subIss  = $envContent['SUPABASE_ISSUER_URI']
    $dbUrl   = $envContent['SUPABASE_DB_URL']
    $dbUser  = $envContent['SUPABASE_DB_USER']
    $dbPass  = $envContent['SUPABASE_DB_PASSWORD']
    $corsOri = $envContent['CORS_ALLOWED_ORIGINS']
    $jwtSec  = $envContent['JWT_SECRET']

    $jvmArgs = "-DSUPABASE_URL=$subUrl -DSUPABASE_PUBLISHABLE_KEY=$subKey -DSUPABASE_SECRET_KEY=$subSec -DSUPABASE_JWKS_URL=$subJwks -DSUPABASE_ISSUER_URI=$subIss -DSUPABASE_DB_URL=$dbUrl -DSUPABASE_DB_USER=$dbUser -DSUPABASE_DB_PASSWORD=$dbPass -DCORS_ALLOWED_ORIGINS=$corsOri -DJWT_SECRET=$jwtSec -DSPRING_PROFILES_ACTIVE=dev"

    Start-Process -FilePath $mvnCmd `
        -ArgumentList @('spring-boot:run', "-Dspring-boot.run.jvmArguments=$jvmArgs") `
        -WorkingDirectory $backendDir `
        -RedirectStandardOutput (Join-Path $logs 'backend.out.log') `
        -RedirectStandardError  (Join-Path $logs 'backend.err.log') `
        -WindowStyle Hidden

    Wait-Port -port 8080 -maxSeconds 180 -label "Spring Boot Backend"
} else {
    Write-Host "  OK: Backend already running on port 8080" -ForegroundColor Green
}

# -- 4. Start Frontend (Next.js) --
if (-not (Test-Listening 3000)) {
    Write-Host ""
    Write-Host "Starting Next.js frontend..." -ForegroundColor Cyan

    Start-Process -FilePath 'pnpm.cmd' `
        -ArgumentList @('run', 'dev') `
        -WorkingDirectory $root `
        -RedirectStandardOutput (Join-Path $logs 'frontend.out.log') `
        -RedirectStandardError  (Join-Path $logs 'frontend.err.log') `
        -WindowStyle Hidden `
        -PassThru | Out-Null

    Wait-Port -port 3000 -maxSeconds 60 -label "Next.js Frontend"
} else {
    Write-Host "  OK: Frontend already running on port 3000" -ForegroundColor Green
}

# -- 5. Done --
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "         CloudPay is LIVE!                      " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  App:      http://localhost:3000               " -ForegroundColor Green
Write-Host "  API:      http://localhost:8080               " -ForegroundColor Green
Write-Host "  Swagger:  http://localhost:8080/swagger-ui.html" -ForegroundColor Green
Write-Host "  Logs:     .runtime-logs\                      " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:3000"
