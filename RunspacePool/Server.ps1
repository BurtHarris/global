#Requires -Version 7.0
<#
.SYNOPSIS
    Background PowerShell runspace-pool server. Listens on a named pipe,
    dispatches incoming script requests to either:
      - the "pool"    session: a fresh runspace from a RunspacePool (isolated,
                       safe for concurrent/parallel jobs).
      - the "primary" session: one dedicated, long-lived runspace whose
                       variables/cwd/modules persist across calls (like a
                       normal interactive shell).

    Not meant to be run directly by a human — started on-demand by
    RunspacePool.ps1's Start-RunspacePoolServer. Exits automatically after
    -IdleTimeoutMinutes of no requests.
#>
[CmdletBinding()]
param(
    [string]$PipeName = "copilot-devdrive-pool-$env:USERNAME",
    [int]$MaxRunspaces = 5,
    [int]$IdleTimeoutMinutes = 30
)

$ErrorActionPreference = 'Stop'

$LogDir = Join-Path $env:USERPROFILE '.copilot\runspacepool'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$LogPath = Join-Path $LogDir 'server.log'

function Write-Log([string]$Message) {
    "$(Get-Date -Format o) [$PID] $Message" | Add-Content -LiteralPath $LogPath
}

Write-Log "Starting. Pipe=$PipeName MaxRunspaces=$MaxRunspaces IdleTimeoutMinutes=$IdleTimeoutMinutes"

# --- Shared pool for isolated/parallel work ----------------------------------
$iss = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
$pool = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspacePool(1, $MaxRunspaces, $iss, $Host)
$pool.ThreadOptions = [System.Management.Automation.Runspaces.PSThreadOptions]::UseNewThread
$pool.Open()

# --- Dedicated persistent runspace for stateful ("primary") requests --------
$primaryRunspace = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace($iss)
$primaryRunspace.Open()
$primaryPs = [PowerShell]::Create()
$primaryPs.Runspace = $primaryRunspace
$primaryLock = [object]::new()

$script:LastActivity = Get-Date
$script:ShouldStop = $false
$script:PendingHandlers = [System.Collections.Generic.List[object]]::new()

# Script executed inside a pool runspace to service one already-connected pipe client.
$HandlerScript = {
    param($PipeServer, $PrimaryPs, $PrimaryLock, $Pool, $LogPath)

    function Write-HandlerLog([string]$Message) {
        "$(Get-Date -Format o) [$PID/handler] $Message" | Add-Content -LiteralPath $LogPath
    }
    function Send-Line($Writer, $Obj) {
        $Writer.WriteLine(($Obj | ConvertTo-Json -Compress -Depth 6 -WarningAction SilentlyContinue))
    }

    try {
        $reader = [System.IO.StreamReader]::new($PipeServer)
        $writer = [System.IO.StreamWriter]::new($PipeServer)
        $writer.AutoFlush = $true

        $line = $reader.ReadLine()
        if (-not $line) { return $null }
        $req = $line | ConvertFrom-Json

        if ($req.Cmd -eq 'shutdown') {
            Send-Line $writer @{ Stream = 'done'; Data = 'shutting down' }
            return 'shutdown'
        }
        if ($req.Cmd -eq 'status') {
            Send-Line $writer @{ Stream = 'result'; Data = @{ AvailablePoolRunspaces = $Pool.GetAvailableRunspaces() } }
            Send-Line $writer @{ Stream = 'done' }
            return $null
        }

        # PowerShell.Invoke() throws a .NET exception (rather than just populating
        # the Error stream) when the script hits an uncaught terminating error
        # (e.g. `throw`). Use the PSDataCollection overload so any output already
        # produced before the failure is preserved, and catch the exception so one
        # bad script can't kill the connection/handler.
        $result = $null
        $terminatingError = $null
        $psOutput = [System.Management.Automation.PSDataCollection[psobject]]::new()

        if ($req.Session -eq 'primary') {
            [System.Threading.Monitor]::Enter($PrimaryLock)
            try {
                $PrimaryPs.Commands.Clear()
                $PrimaryPs.Streams.ClearStreams()
                $PrimaryPs.AddScript($req.Script) | Out-Null
                try {
                    $PrimaryPs.Invoke($null, $psOutput) | Out-Null
                } catch {
                    $terminatingError = $_.Exception.Message
                }
                $result = [PSCustomObject]@{ Output = $psOutput; Errors = $PrimaryPs.Streams.Error; HadErrors = ($PrimaryPs.HadErrors -or $terminatingError) }
            } finally {
                [System.Threading.Monitor]::Exit($PrimaryLock)
            }
        } else {
            $ps = [PowerShell]::Create()
            try {
                $ps.RunspacePool = $Pool
                $ps.AddScript($req.Script) | Out-Null
                try {
                    $ps.Invoke($null, $psOutput) | Out-Null
                } catch {
                    $terminatingError = $_.Exception.Message
                }
                $result = [PSCustomObject]@{ Output = $psOutput; Errors = $ps.Streams.Error; HadErrors = ($ps.HadErrors -or $terminatingError) }
            } finally {
                $ps.Dispose()
            }
        }

        foreach ($o in $result.Output) {
            Send-Line $writer @{ Stream = 'output'; Data = (Out-String -InputObject $o).TrimEnd() }
        }
        foreach ($e in $result.Errors) {
            Send-Line $writer @{ Stream = 'error'; Data = $e.ToString() }
        }
        if ($terminatingError) {
            Send-Line $writer @{ Stream = 'error'; Data = $terminatingError }
        }
        Send-Line $writer @{ Stream = 'done'; HadErrors = [bool]$result.HadErrors }
    } catch {
        try { Write-HandlerLog "Error: $_" } catch {}
    } finally {
        try { $PipeServer.Dispose() } catch {}
    }
    return $null
}

function Remove-CompletedHandlers {
    for ($i = $script:PendingHandlers.Count - 1; $i -ge 0; $i--) {
        $h = $script:PendingHandlers[$i]
        if ($h.AsyncResult.IsCompleted) {
            try {
                $out = $h.Ps.EndInvoke($h.AsyncResult)
                if ($out -contains 'shutdown') { $script:ShouldStop = $true }
            } catch {
                Write-Log "Handler error: $_"
            } finally {
                $h.Ps.Dispose()
            }
            $script:PendingHandlers.RemoveAt($i)
        }
    }
}

try {
    while (-not $script:ShouldStop) {
        if (((Get-Date) - $script:LastActivity).TotalMinutes -ge $IdleTimeoutMinutes) {
            Write-Log "Idle timeout ($IdleTimeoutMinutes min) reached. Stopping."
            break
        }

        $pipeServer = [System.IO.Pipes.NamedPipeServerStream]::new(
            $PipeName,
            [System.IO.Pipes.PipeDirection]::InOut,
            $MaxRunspaces + 2,
            [System.IO.Pipes.PipeTransmissionMode]::Byte,
            [System.IO.Pipes.PipeOptions]::Asynchronous)

        $ar = $pipeServer.BeginWaitForConnection($null, $null)
        $connected = $ar.AsyncWaitHandle.WaitOne(15000)
        if (-not $connected) {
            $pipeServer.Dispose()
            Remove-CompletedHandlers
            continue
        }
        $pipeServer.EndWaitForConnection($ar)
        $script:LastActivity = Get-Date

        $handlerPs = [PowerShell]::Create()
        $handlerPs.RunspacePool = $pool
        $handlerPs.AddScript($HandlerScript).AddArgument($pipeServer).AddArgument($primaryPs).AddArgument($primaryLock).AddArgument($pool).AddArgument($LogPath) | Out-Null
        $asyncResult = $handlerPs.BeginInvoke()
        $script:PendingHandlers.Add([PSCustomObject]@{ Ps = $handlerPs; AsyncResult = $asyncResult })

        Remove-CompletedHandlers
    }
} finally {
    foreach ($h in $script:PendingHandlers) {
        try { $h.Ps.EndInvoke($h.AsyncResult) | Out-Null } catch {}
        $h.Ps.Dispose()
    }
    $pool.Close(); $pool.Dispose()
    $primaryPs.Dispose(); $primaryRunspace.Close()
    Write-Log "Stopped."
}
