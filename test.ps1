$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverLog = Join-Path $root 'test-api-server.log'
$serverErrLog = Join-Path $root 'test-api-server.err.log'
$workerLog = Join-Path $root 'test-api-worker.log'
$workerErrLog = Join-Path $root 'test-api-worker.err.log'

function Write-Section([string]$title) {
  Write-Host "`n===== $title =====" -ForegroundColor Cyan
}

function Print-LogTail([string]$filePath, [int]$lineCount = 40) {
  if (Test-Path $filePath) {
    Get-Content $filePath -Tail $lineCount
  }
}

Push-Location $root

if (Test-Path $serverLog) { Remove-Item $serverLog -Force }
if (Test-Path $serverErrLog) { Remove-Item $serverErrLog -Force }
if (Test-Path $workerLog) { Remove-Item $workerLog -Force }
if (Test-Path $workerErrLog) { Remove-Item $workerErrLog -Force }

$serverProc = $null
$workerProc = $null

try {
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCmd) {
    Write-Section 'Starting Redis (docker compose up -d redis)'
    docker compose up -d redis
  }
  else {
    Write-Section 'Docker not found (skipping redis startup)'
  }

  $env:REDIS_URL = 'redis://127.0.0.1:6379'

  Write-Section 'Starting API server (npm run dev)'
  $serverProc = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev' -WorkingDirectory $root -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrLog -PassThru

  Write-Section 'Starting workers (npm run workers)'
  $workerProc = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'workers' -WorkingDirectory $root -RedirectStandardOutput $workerLog -RedirectStandardError $workerErrLog -PassThru

  Write-Section 'Waiting for health endpoint'
  $deadline = (Get-Date).AddSeconds(45)
  $healthy = $false

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-RestMethod -Method Get -Uri 'http://localhost:8000/health' -TimeoutSec 2
      if ($response.ok -eq $true) {
        $healthy = $true
        break
      }
    }
    catch {
      # Ignore until timeout.
    }

    Start-Sleep -Milliseconds 600
  }

  if (-not $healthy) {
    throw 'Health endpoint did not become ready at http://localhost:8000/health within 45 seconds.'
  }

  Write-Section 'Running API test (npm run test:api)'
  & npm.cmd run test:api
  $testExitCode = $LASTEXITCODE

  Write-Section 'Server log tail'
  Print-LogTail -filePath $serverLog

  Write-Section 'Server error log tail'
  Print-LogTail -filePath $serverErrLog

  Write-Section 'Worker log tail'
  Print-LogTail -filePath $workerLog

  Write-Section 'Worker error log tail'
  Print-LogTail -filePath $workerErrLog

  exit $testExitCode
}
finally {
  Write-Section 'Stopping background processes'

  if ($workerProc -and -not $workerProc.HasExited) {
    Stop-Process -Id $workerProc.Id -Force
  }

  if ($serverProc -and -not $serverProc.HasExited) {
    Stop-Process -Id $serverProc.Id -Force
  }

  Pop-Location
}
