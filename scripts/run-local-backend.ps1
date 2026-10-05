$ErrorActionPreference = 'Stop'

function Read-EnvValue([string]$name) {
    $line = Get-Content (Join-Path $PSScriptRoot '..\.env.local') |
        Where-Object { $_ -like "$name=*" } |
        Select-Object -First 1
    if (-not $line) { return $null }
    return $line.Substring($line.IndexOf('=') + 1).Trim()
}

$publishableKeyName = 'SUPABASE' + '_PUBLISHABLE_' + 'KEY'
[Environment]::SetEnvironmentVariable($publishableKeyName, (Read-EnvValue 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), 'Process')
$env:SUPABASE_URL = Read-EnvValue 'NEXT_PUBLIC_SUPABASE_URL'
$env:SUPABASE_JWKS_URL = "$($env:SUPABASE_URL)/auth/v1/.well-known/jwks.json"
$preferredJava = 'C:\Users\LABH\.jdks\temurin-21.0.12'
if (Test-Path $preferredJava) { $env:JAVA_HOME = $preferredJava }
$env:DB_HOST = 'localhost'
$env:DB_PORT = '5433'
$env:DB_NAME = 'cloudpay'
$env:DB_USER = 'cloudpay'
$env:DB_PASSWORD = 'cloudpay_secret'
$env:SUPABASE_DB_URL = Read-EnvValue 'SUPABASE_DB_URL'
$env:SUPABASE_DB_USER = Read-EnvValue 'SUPABASE_DB_USER'
$env:SUPABASE_DB_PASSWORD = Read-EnvValue 'SUPABASE_DB_PASSWORD'

$maven = (Get-Command mvn.cmd -ErrorAction SilentlyContinue).Source
if (-not $maven) { $maven = 'C:\Users\LABH\.m2\wrapper\dists\apache-maven-3.9.12-bin\5nmfsn99br87k5d4ajlekdq10k\apache-maven-3.9.12\bin\mvn.cmd' }
if (-not (Test-Path $maven)) { throw 'Maven was not found. Install Maven 3.9+ or add mvn.cmd to PATH.' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
New-Item -ItemType Directory -Force (Join-Path $root '.runtime-logs') | Out-Null
Start-Process -FilePath $maven -ArgumentList '-q', 'spring-boot:run' -WorkingDirectory (Join-Path $root 'backend') -RedirectStandardOutput (Join-Path $root '.runtime-logs\backend.out.log') -RedirectStandardError (Join-Path $root '.runtime-logs\backend.err.log') -WindowStyle Hidden
