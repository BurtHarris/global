#Requires -Modules Pester
<#
.SYNOPSIS
    Pester tests for the RunspacePool background server (Server.ps1) and its
    client functions (RunspacePool.ps1).

.DESCRIPTION
    Run with: Invoke-Pester D:\global\RunspacePool\RunspacePool.Tests.ps1
    For code coverage: Invoke-Pester -Path ... -CodeCoverage 'D:\global\RunspacePool\*.ps1'

    Each test uses a dedicated pipe name (via -PipeNameOverride) so runs don't
    collide with any interactively-running server, and stops its own server
    in AfterAll.
#>

BeforeAll {
    . $PSScriptRoot\RunspacePool.ps1

    # Isolate tests from any real/interactive server instance by overriding the
    # pipe name used for this test run.
    $script:TestPipeName = "copilot-devdrive-pool-test-$PID"
    $script:RunspacePoolPipeName = $script:TestPipeName

    function Start-TestServer {
        param([int]$IdleTimeoutMinutes = 30, [int]$MaxRunspaces = 5)
        $serverScript = Join-Path $PSScriptRoot 'Server.ps1'
        Start-Process -FilePath (Get-Process -Id $PID).Path `
            -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-File', "`"$serverScript`"",
                            '-PipeName', $script:TestPipeName,
                            '-MaxRunspaces', $MaxRunspaces,
                            '-IdleTimeoutMinutes', $IdleTimeoutMinutes) `
            -WindowStyle Hidden
        $deadline = (Get-Date).AddSeconds(10)
        while ((Get-Date) -lt $deadline) {
            if (Test-RunspacePoolServer) { return }
            Start-Sleep -Milliseconds 200
        }
        throw 'Test server did not start in time.'
    }
}

AfterAll {
    if (Test-RunspacePoolServer) {
        Stop-RunspacePoolServer
    }
}

Describe 'RunspacePool server' {

    Context 'Lifecycle' {
        It 'is not running before Start-TestServer is called' {
            Test-RunspacePoolServer | Should -BeFalse
        }

        It 'starts and responds to Test-RunspacePoolServer' {
            Start-TestServer
            Test-RunspacePoolServer | Should -BeTrue
        }

        It 'reports pool status' {
            $status = Get-RunspacePoolStatus
            $status.AvailablePoolRunspaces | Should -BeGreaterOrEqual 0
        }
    }

    Context 'Pool session (isolated, parallel-safe)' {
        It 'runs a simple script and returns output' {
            $result = Invoke-PooledScript -Session pool -Script "'hello-pool'"
            $result | Should -Be 'hello-pool'
        }

        It 'does not share state between separate pool calls' {
            Invoke-PooledScript -Session pool -Script '$script:leaky = "leaked"' | Out-Null
            $result = Invoke-PooledScript -Session pool -Script '"[$script:leaky]"'
            $result | Should -Be '[]'
        }

        It 'does not see primary session state' {
            Invoke-PooledScript -Session primary -Script '$script:primaryOnly = "yes"' | Out-Null
            $result = Invoke-PooledScript -Session pool -Script '"[$script:primaryOnly]"'
            $result | Should -Be '[]'
        }

        It 'surfaces script output before a thrown error, without crashing the server' {
            $output = Invoke-PooledScript -Session pool -Script 'Write-Output "before-error"; throw "boom"' -ErrorAction SilentlyContinue -ErrorVariable errRecords 2>$null
            $output | Should -Contain 'before-error'
        }

        It 'keeps serving requests after a script throws' {
            Test-RunspacePoolServer | Should -BeTrue
            $result = Invoke-PooledScript -Session pool -Script "'still-alive'"
            $result | Should -Be 'still-alive'
        }

        It 'runs concurrently: 4 sleeps of 1s each complete well under 4s serial time' {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            $jobs = 1..4 | ForEach-Object {
                $i = $_
                Start-ThreadJob -ScriptBlock {
                    param($ScriptRoot, $PipeName, $Index)
                    . (Join-Path $ScriptRoot 'RunspacePool.ps1')
                    $script:RunspacePoolPipeName = $PipeName
                    Invoke-PooledScript -Session pool -Script "Start-Sleep -Seconds 1; 'job $Index done'"
                } -ArgumentList $PSScriptRoot, $script:TestPipeName, $i
            }
            $results = $jobs | Wait-Job -Timeout 20 | Receive-Job
            $jobs | Remove-Job -Force
            $sw.Stop()

            $results.Count | Should -Be 4
            # Serial would be ~4s; concurrent execution should clearly beat that.
            $sw.Elapsed.TotalSeconds | Should -BeLessThan 3.5
        }
    }

    Context 'Primary session (persistent state)' {
        It 'persists variables across separate calls' {
            Invoke-PooledScript -Session primary -Script '$script:counter = 1' | Out-Null
            $result = Invoke-PooledScript -Session primary -Script '$script:counter++; $script:counter'
            $result | Should -Be 2
        }

        It 'persists working directory across separate calls' {
            Invoke-PooledScript -Session primary -Script 'Set-Location $env:WINDIR' | Out-Null
            $result = Invoke-PooledScript -Session primary -Script '(Get-Location).Path'
            $result | Should -Be $env:WINDIR
        }
    }

    Context 'Shutdown' {
        It 'stops the server on Stop-RunspacePoolServer' {
            Stop-RunspacePoolServer
            $deadline = (Get-Date).AddSeconds(5)
            while ((Get-Date) -lt $deadline -and (Test-RunspacePoolServer)) {
                Start-Sleep -Milliseconds 200
            }
            Test-RunspacePoolServer | Should -BeFalse
        }
    }
}
