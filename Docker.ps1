# Docker.ps1
# Adaptive helpers to detect and (re)start Docker Desktop regardless of its
# current state (not installed / installed but not running / service stopped /
# app running but engine still warming up / fully ready).

function Test-DockerReady {
    <#
    .SYNOPSIS
        Returns $true if the Docker Engine responds to API calls right now.
    #>
    [CmdletBinding()]
    param()
    try {
        docker version --format '{{.Server.Version}}' *>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Find-DockerDesktopExe {
    [CmdletBinding()]
    param()
    $candidates = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )
    foreach ($path in $candidates) {
        if ($path -and (Test-Path $path)) { return $path }
    }
    return $null
}

function Ensure-Docker {
    <#
    .SYNOPSIS
        Ensures Docker Desktop's engine is reachable, starting it if necessary.
    .DESCRIPTION
        Adapts to whatever state Docker is currently in:
          - Not installed          -> warns and returns $false (won't auto-install a GUI app)
          - Installed, not running -> launches Docker Desktop.exe
          - Service stopped        -> attempts to start the Windows service (best-effort, needs admin)
          - Running but not ready  -> waits (polls) until the engine responds or timeout elapses
          - Already ready          -> returns immediately
    .PARAMETER TimeoutSec
        How long to wait for the engine to become responsive after launching it.
    .PARAMETER Quiet
        Suppress progress messages.
    #>
    [CmdletBinding()]
    param(
        [int]$TimeoutSec = 90,
        [switch]$Quiet
    )

    if (Test-DockerReady) {
        if (-not $Quiet) { Write-Verbose "Docker engine already responding." }
        return $true
    }

    if (-not $Quiet) { Write-Host "Docker engine not responding; attempting to bring it up..." -ForegroundColor Yellow }

    # Best-effort: nudge the privileged helper service if it exists and is stopped.
    # Docker Desktop normally manages this itself, but a stopped service can block startup.
    $svc = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne 'Running') {
        try {
            Start-Service -Name 'com.docker.service' -ErrorAction Stop
            if (-not $Quiet) { Write-Verbose "Started com.docker.service." }
        } catch {
            if (-not $Quiet) { Write-Verbose "Could not start com.docker.service (may require admin): $($_.Exception.Message)" }
        }
    }

    # Launch the Desktop app if its process isn't already up.
    if (-not (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue)) {
        $exe = Find-DockerDesktopExe
        if (-not $exe) {
            Write-Warning "Docker Desktop does not appear to be installed (no Docker Desktop.exe found). Install it with: winget install --id Docker.DockerDesktop -e"
            return $false
        }
        Start-Process -FilePath $exe | Out-Null
        if (-not $Quiet) { Write-Verbose "Launched Docker Desktop from $exe" }
    }

    $elapsed = 0
    $interval = 3
    while (-not (Test-DockerReady) -and $elapsed -lt $TimeoutSec) {
        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }

    $ready = Test-DockerReady
    if (-not $Quiet) {
        if ($ready) {
            Write-Host "Docker engine is ready." -ForegroundColor Green
        } else {
            Write-Warning "Docker engine did not become ready within $TimeoutSec seconds."
        }
    }
    return $ready
}
