# RunspacePool.psm1 — client functions for the background runspace-pool server
# (Server.ps1 in this same folder). Imported by Profile.ps1 via RunspacePool.psd1.
#
#   Start-RunspacePoolServer   — launch the background server if not already running
#   Stop-RunspacePoolServer    — ask it to shut down
#   Test-RunspacePoolServer    — is it listening?
#   Get-RunspacePoolStatus     — query pool utilization
#   Invoke-PooledScript        — run a script in the pool (parallel-safe) or the
#                                persistent "primary" session (keeps variables/cwd)
#   Set-RunspacePoolPipeName   — override the pipe name (mainly for test isolation)
#   Get-RunspacePoolSeed       — snapshot of this session's modules/location, used
#                                to seed freshly spawned runspaces so they start
#                                out already looking like the parent session
#                                instead of a blank default state.

$script:RunspacePoolRoot = $PSScriptRoot
$script:RunspacePoolPipeName = "copilot-devdrive-pool-$env:USERNAME"

function Set-RunspacePoolPipeName {
    <#
    .SYNOPSIS
        Overrides the named pipe used to talk to the pool server. Mainly for
        test isolation (each test run gets its own pipe/server).
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Name)
    $script:RunspacePoolPipeName = $Name
}

function Get-RunspacePoolSeed {
    <#
    .SYNOPSIS
        Captures a lightweight snapshot of the calling session — its imported
        module names and current location — so a spawned runspace can quickly
        mimic that setup instead of starting from a blank default state.
    .NOTES
        Only module *names* are captured (re-imported by name on the server
        side via PSModulePath), not full state — cheap to compute and to pass
        as command-line arguments.
    #>
    [CmdletBinding()]
    param()
    [PSCustomObject]@{
        Modules  = @(Get-Module | Where-Object { $_.Path } | Select-Object -ExpandProperty Name -Unique)
        Location = (Get-Location).Path
    }
}

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
        [switch]$Force,
        [switch]$NoSeed
    )
    # Guard the check-then-start sequence with a cross-process mutex so
    # concurrent callers (e.g. several parallel Invoke-PooledScript calls that
    # each see "not running yet") can't race and spawn duplicate servers on
    # the same pipe.
    $mutex = [System.Threading.Mutex]::new($false, "Local\RunspacePoolServer-$($script:RunspacePoolPipeName)")
    try {
        if (-not $mutex.WaitOne([TimeSpan]::FromSeconds(15))) {
            throw 'Timed out waiting to start runspace pool server (another process is starting it).'
        }
        try {
            if (-not $Force -and (Test-RunspacePoolServer)) {
                Write-Verbose 'Runspace pool server already running.'
                return
            }
            $serverScript = Join-Path $script:RunspacePoolRoot 'Server.ps1'
            $argList = @('-NoProfile', '-WindowStyle', 'Hidden', '-File', "`"$serverScript`"",
                         '-PipeName', $script:RunspacePoolPipeName,
                         '-MaxRunspaces', $MaxRunspaces, '-IdleTimeoutMinutes', $IdleTimeoutMinutes)
            if (-not $NoSeed) {
                # Mimic the parent (calling) runspace's setup: freshly created pool/primary
                # runspaces on the server start with these modules already imported and
                # this location already set, instead of a blank default state.
                $seed = Get-RunspacePoolSeed
                if ($seed.Modules.Count -gt 0) {
                    $argList += @('-SeedModules', ($seed.Modules -join ','))
                }
                $argList += @('-SeedLocation', $seed.Location)
            }
            Start-Process -FilePath (Get-Process -Id $PID).Path -ArgumentList $argList -WindowStyle Hidden

            $deadline = (Get-Date).AddSeconds(10)
            while ((Get-Date) -lt $deadline) {
                if (Test-RunspacePoolServer) { return }
                Start-Sleep -Milliseconds 200
            }
            throw 'Runspace pool server did not start within 10 seconds. Check ~\.copilot\runspacepool\server.log'
        } finally {
            $mutex.ReleaseMutex()
        }
    } finally {
        $mutex.Dispose()
    }
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

Export-ModuleMember -Function @(
    'Test-RunspacePoolServer',
    'Start-RunspacePoolServer',
    'Invoke-PooledScript',
    'Get-RunspacePoolStatus',
    'Stop-RunspacePoolServer',
    'Set-RunspacePoolPipeName',
    'Get-RunspacePoolSeed'
)
