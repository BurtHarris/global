# RunspacePool.psm1 — client functions for the background runspace-pool server
# (Server.ps1 in this same folder). Imported by Profile.ps1 via RunspacePool.psd1.
#
#   Start-Pool                 — launch the background server if not already running
#   Stop-Pool                  — ask it to shut down
#   Test-Pool                  — is it listening?
#   Get-Pool                   — query the current pool configuration and utilization
#   Invoke-PooledScript        — run a script in the pool (parallel-safe) or the
#                                persistent "primary" session (keeps variables/cwd)
#   Set-Pool                   — update pool properties such as the pipe name
#   (private) Get-PoolSeed     — snapshot of this session's modules/location, used
#                                to seed freshly spawned runspaces so they start
#                                out already looking like the parent session
#                                instead of a blank default state.

$script:RunspacePoolRoot = $PSScriptRoot
$script:RunspacePoolPipeName = "copilot-devdrive-pool-$env:USERNAME"

function Get-RunspacePoolPipeOptions {
    [System.IO.Pipes.PipeOptions]::CurrentUserOnly
}

function Get-RunspacePoolServerArguments {
    param(
        [int]$MaxRunspaces,
        [int]$IdleTimeoutMinutes,
        [switch]$NoSeed
    )

    $serverScript = Join-Path $script:RunspacePoolRoot 'Server.ps1'
    $argList = @('-NoProfile', '-File', $serverScript,
        '-PipeName', $script:RunspacePoolPipeName,
        '-MaxRunspaces', $MaxRunspaces, '-IdleTimeoutMinutes', $IdleTimeoutMinutes)
    if (-not $NoSeed) {
        # Mimic the parent (calling) runspace's setup: freshly created pool/primary
        # runspaces on the server start with these modules already imported and
        # this location already set, instead of a blank default state.
        $seed = Get-PoolSeed
        if ($seed.Modules.Count -gt 0) {
            $argList += @('-SeedModules', ($seed.Modules -join ','))
        }
        $argList += @('-SeedLocation', $seed.Location)
    }

    $argList
}

function Get-PoolSeed {
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

function Test-Pool {
    [CmdletBinding()]
    param([int]$TimeoutMs = 250)
    $client = [System.IO.Pipes.NamedPipeClientStream]::new(
        '.',
        $script:RunspacePoolPipeName,
        [System.IO.Pipes.PipeDirection]::InOut,
        (Get-RunspacePoolPipeOptions))
    try {
        $client.Connect($TimeoutMs)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Start-Pool {
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
        try {
            $hasLock = $mutex.WaitOne([TimeSpan]::FromSeconds(15))
        } catch [System.Threading.AbandonedMutexException] {
            $hasLock = $true
        }
        if (-not $hasLock) {
            throw 'Timed out waiting to start runspace pool server (another process is starting it).'
        }
        try {
            if (-not $Force -and (Test-Pool)) {
                Write-Verbose 'Runspace pool server already running.'
                return
            }
            $argList = Get-RunspacePoolServerArguments -MaxRunspaces $MaxRunspaces -IdleTimeoutMinutes $IdleTimeoutMinutes -NoSeed:$NoSeed
            $startProcessParams = @{
                FilePath     = (Get-Process -Id $PID).Path
                ArgumentList = $argList
            }
            if ($IsWindows) {
                $startProcessParams.WindowStyle = 'Hidden'
            }
            Start-Process @startProcessParams | Out-Null

            $deadline = (Get-Date).AddSeconds(10)
            while ((Get-Date) -lt $deadline) {
                if (Test-Pool) { return }
                Start-Sleep -Milliseconds 200
            }
            throw 'Runspace pool server did not start within 10 seconds. Check ~/.copilot/runspacepool/server.log'
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
    $client = [System.IO.Pipes.NamedPipeClientStream]::new(
        '.',
        $script:RunspacePoolPipeName,
        [System.IO.Pipes.PipeDirection]::InOut,
        (Get-RunspacePoolPipeOptions))
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
    if ($AutoStart -and -not (Test-Pool)) {
        Start-Pool
    }
    Send-RunspacePoolRequest -Request @{ Script = $Script; Session = $Session }
}

function Get-Pool {
    [CmdletBinding()]
    param()

    $isRunning = Test-Pool
    $pool = [ordered]@{
        PipeName  = $script:RunspacePoolPipeName
        IsRunning = $isRunning
    }

    if ($isRunning) {
        $status = Send-RunspacePoolRequest -Request @{ Cmd = 'status' }
        foreach ($property in $status.PSObject.Properties) {
            $pool[$property.Name] = $property.Value
        }
    }

    [PSCustomObject]$pool
}

function Set-Pool {
    <#
    .SYNOPSIS
        Updates pool properties. Currently supports overriding the named pipe
        used to talk to the pool server, mainly for test isolation.
    #>
    [CmdletBinding()]
    param([string]$PipeName)

    if ($PSBoundParameters.ContainsKey('PipeName')) {
        $script:RunspacePoolPipeName = $PipeName
    }
}

function Stop-Pool {
    [CmdletBinding()]
    param()
    if (-not (Test-Pool)) {
        Write-Verbose 'Runspace pool server is not running.'
        return
    }
    Send-RunspacePoolRequest -Request @{ Cmd = 'shutdown' } | Out-Null
}

Export-ModuleMember -Function @(
    'Test-Pool',
    'Start-Pool',
    'Invoke-PooledScript',
    'Get-Pool',
    'Set-Pool',
    'Stop-Pool'
)
