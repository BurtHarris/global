# RunspacePool.ps1 — client functions for the background runspace-pool server
# (Server.ps1 in this same folder). Dot-sourced by Profile.ps1.
#
#   Start-RunspacePoolServer   — launch the background server if not already running
#   Stop-RunspacePoolServer    — ask it to shut down
#   Test-RunspacePoolServer    — is it listening?
#   Get-RunspacePoolStatus     — query pool utilization
#   Invoke-PooledScript        — run a script in the pool (parallel-safe) or the
#                                persistent "primary" session (keeps variables/cwd)

$script:RunspacePoolRoot = $PSScriptRoot
$script:RunspacePoolPipeName = "copilot-devdrive-pool-$env:USERNAME"

function Test-RunspacePoolServer {
    [CmdletBinding()]
    param([int]$TimeoutMs = 250)
    $client = [System.IO.Pipes.NamedPipeClientStream]::new('.', $script:RunspacePoolPipeName, [System.IO.Pipes.PipeDirection]::InOut)
    try {
        $client.Connect($TimeoutMs)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Start-RunspacePoolServer {
    [CmdletBinding()]
    param(
        [int]$MaxRunspaces = 5,
        [int]$IdleTimeoutMinutes = 30,
        [switch]$Force
    )
    if (-not $Force -and (Test-RunspacePoolServer)) {
        Write-Verbose 'Runspace pool server already running.'
        return
    }
    $serverScript = Join-Path $script:RunspacePoolRoot 'Server.ps1'
    Start-Process -FilePath (Get-Process -Id $PID).Path `
        -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-File', "`"$serverScript`"",
                        '-MaxRunspaces', $MaxRunspaces, '-IdleTimeoutMinutes', $IdleTimeoutMinutes) `
        -WindowStyle Hidden

    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline) {
        if (Test-RunspacePoolServer) { return }
        Start-Sleep -Milliseconds 200
    }
    throw 'Runspace pool server did not start within 10 seconds. Check ~\.copilot\runspacepool\server.log'
}

function Send-RunspacePoolRequest {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][hashtable]$Request,
        [int]$ConnectTimeoutMs = 3000
    )
    $client = [System.IO.Pipes.NamedPipeClientStream]::new('.', $script:RunspacePoolPipeName, [System.IO.Pipes.PipeDirection]::InOut)
    try {
        $client.Connect($ConnectTimeoutMs)
        $writer = [System.IO.StreamWriter]::new($client)
        $writer.AutoFlush = $true
        $reader = [System.IO.StreamReader]::new($client)

        $writer.WriteLine(($Request | ConvertTo-Json -Compress -Depth 6))

        while ($true) {
            $line = $reader.ReadLine()
            if ($null -eq $line) { break }
            $msg = $line | ConvertFrom-Json
            switch ($msg.Stream) {
                'output' { Write-Output $msg.Data }
                'error'  { Write-Error $msg.Data -ErrorAction Continue }
                'result' { Write-Output $msg.Data }
                'done'   { return }
            }
        }
    } finally {
        $client.Dispose()
    }
}

function Invoke-PooledScript {
    <#
    .SYNOPSIS
        Runs a script via the background runspace-pool server.
    .PARAMETER Session
        'pool' (default) — a fresh isolated runspace, safe to run many of these
        concurrently. 'primary' — the one persistent runspace: variables, cwd,
        and imported modules persist across calls.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)][string]$Script,
        [ValidateSet('pool', 'primary')][string]$Session = 'pool',
        [switch]$AutoStart = $true
    )
    if ($AutoStart -and -not (Test-RunspacePoolServer)) {
        Start-RunspacePoolServer
    }
    Send-RunspacePoolRequest -Request @{ Script = $Script; Session = $Session }
}

function Get-RunspacePoolStatus {
    [CmdletBinding()]
    param()
    if (-not (Test-RunspacePoolServer)) {
        Write-Warning 'Runspace pool server is not running.'
        return
    }
    Send-RunspacePoolRequest -Request @{ Cmd = 'status' }
}

function Stop-RunspacePoolServer {
    [CmdletBinding()]
    param()
    if (-not (Test-RunspacePoolServer)) {
        Write-Verbose 'Runspace pool server is not running.'
        return
    }
    Send-RunspacePoolRequest -Request @{ Cmd = 'shutdown' } | Out-Null
}
