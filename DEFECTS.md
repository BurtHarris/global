# Defect Log & Priority of Fixes (`global`)

This document records the defects identified during the code review of the `global` package, categorized by priority with actionable remediation steps and code diffs.

---

## Triage & Priority Matrix

| Defect ID | Priority | Component | Defect Summary | Impact |
|---|---|---|---|---|
| **[DEF-01](#def-01-whatif-safety-bypass-with--force)** | **P0 - Critical** | `Invoke-RebootAndResume.ps1` | `-WhatIf` bypassed when `-Force` is supplied | Unintended system reboot |
| **[DEF-02](#def-02-nested-runspacepool-exhaustion--deadlock)** | **P0 - Critical** | `RunspacePool\Server.ps1` | Nested runspace acquisition causes pool deadlock | Server freeze under concurrent load |
| **[DEF-03](#def-03-registry-mutation-before-confirmation--whatif)** | **P0 - Critical** | `Invoke-RebootAndResume.ps1` | Registry written before `Read-Host` / `ShouldProcess` | Persistent RunOnce key left on abort |
| **[DEF-04](#def-04-script--path-injection-via-seedlocation)** | **P1 - High** | `RunspacePool\Server.ps1` | `$SeedLocation` string interpolated into `AddScript` | Parse error on quotes / code injection |
| **[DEF-05](#def-05-named-pipe-lacks-currentuseronly-security)** | **P1 - High** | `RunspacePool` | Named pipe allows local cross-user access | Potential unauthorized command execution |
| **[DEF-06](#def-06-premature-idle-shutdown-during-active-jobs)** | **P1 - High** | `RunspacePool\Server.ps1` | Server stops after 30 min while tasks are executing | Active workloads abruptly aborted |
| **[DEF-07](#def-07-unconditional-set-location-hijacks-working-dir)** | **P1 - High** | `Profile.ps1` | `Set-Location 'D:\'` overrides starting directory | Breaks VS Code / Terminal integration |
| **[DEF-08](#def-08-unapproved-verb-warning-on-shell-startup)** | **P2 - Medium** | `DevTools` / `Profile.ps1` | `Ensure-Docker` uses unapproved verb `Ensure` | Console warning on every shell launch |
| **[DEF-09](#def-09-powershell-51-vs-7-profile-gap-during-bootstrap)** | **P2 - Medium** | `Setup.ps1` | Bootstrapping under 5.1 leaves pwsh 7 profile unconfigured | pwsh 7 lacks profile after bootstrap |
| **[DEF-10](#def-10-missing-process-path-refresh-after-tool-install)** | **P2 - Medium** | `Setup.ps1` | Current session `$env:PATH` not updated after winget | `mise install` command-not-found failure |
| **[DEF-11](#def-11-unhandled-abandonedmutexexception)** | **P2 - Medium** | `RunspacePool\RunspacePool.psm1` | `WaitOne()` crashes on abandoned mutex | Server startup blocked after crash |
| **[DEF-12](#def-12-interactive-shell-exit-on-test-failure)** | **P2 - Medium** | `Invoke-CodeCoverage.ps1` | Uses `exit 1` on failed tests | Closes developer terminal window |
| **[DEF-13](#def-13-artificially-low-coverage-metric)** | **P3 - Low** | `Invoke-CodeCoverage.ps1` | `DevTools` measured but has no tests | Distorts code coverage metrics (~22.7%) |
| **[DEF-14](#def-14-hardcoded-drive-path-in-sandbox-config)** | **P3 - Low** | `TestInSandbox.wsb` | Hardcoded `D:\global` host mount | Portability failure if cloned elsewhere |
| **[DEF-15](#def-15-loss-of-typed-objects-and-streams)** | **P3 - Low** | `RunspacePool` | Output stringified with `Out-String`; streams discarded | Caller cannot receive objects/warnings |

---

## Detailed Defect Specifications

### DEF-01: `-WhatIf` Safety Bypass with `-Force`
- **Component:** `Invoke-RebootAndResume.ps1` (line 77)
- **Priority:** **P0 - Critical**
- **Description:**
  ```powershell
  if (-not $Force -and -not $PSCmdlet.ShouldProcess("$env:COMPUTERNAME", "Restart-Computer")) {
      return
  }
  ```
  If `-Force` is provided, `-not $Force` evaluates to `$false`. The expression short-circuits and `$PSCmdlet.ShouldProcess()` is completely bypassed.
- **Impact:**
  Executing `.\Invoke-RebootAndResume.ps1 -Force -ResumeCommand "..." -WhatIf` immediately reboots the computer instead of executing a dry-run.
- **Fix:**
  ```powershell
  # Prompt interactively if not forced
  if (-not $Force) {
      $answer = Read-Host "Restart this computer now? (y/N)"
      if ($answer -notmatch '^[Yy]') {
          Write-Host "Not restarting. The RunOnce entry above remains registered for next time you do." -ForegroundColor Yellow
          return
      }
  }

  # SupportsShouldProcess / -WhatIf must ALWAYS be evaluated
  if (-not $PSCmdlet.ShouldProcess("$env:COMPUTERNAME", "Restart-Computer")) {
      return
  }
  ```

---

### DEF-02: Nested RunspacePool Exhaustion & Deadlock
- **Component:** `RunspacePool\Server.ps1` (lines 129-144, 219-223)
- **Priority:** **P0 - Critical**
- **Description:**
  The server schedules incoming connections as `HandlerScript` on `$pool`. Inside `HandlerScript`, it creates a second `PowerShell` instance that requests an additional runspace from the *exact same* `$pool`.
- **Impact:**
  When 5 requests connect concurrently (equal to `$MaxRunspaces = 5`), all 5 available runspaces are consumed by `HandlerScript`. Each handler then executes `$ps.Invoke()`, which blocks waiting for a runspace from the exhausted pool. The server hangs permanently in a thread deadlock.
- **Fix:**
  Run the pipe connection reader/deserializer on .NET worker threads (e.g. `[System.Threading.ThreadPool]::QueueUserWorkItem` or `[System.Threading.Tasks.Task]::Run`), reserving `$pool` runspaces strictly for executing user script payloads. Alternatively, execute `$req.Script` directly within the runspace that `HandlerScript` is already occupying.

---

### DEF-03: Registry Mutation Before Confirmation & `-WhatIf`
- **Component:** `Invoke-RebootAndResume.ps1` (lines 60-63)
- **Priority:** **P0 - Critical**
- **Description:**
  `New-Item` and `Set-ItemProperty` for the `RunOnce` key are executed before the interactive `Read-Host` prompt and before `$PSCmdlet.ShouldProcess()`.
- **Impact:**
  Even if the user types `N` to abort the restart, or runs with `-WhatIf`, the command is permanently written to the registry and will execute on their next logon.
- **Fix:**
  Move the registry registration after user confirmation and guard it with `$PSCmdlet.ShouldProcess("$runOnceKey\$valueName", "Set RunOnce registry value")`.

---

### DEF-04: Script / Path Injection via `$SeedLocation`
- **Component:** `RunspacePool\Server.ps1` (line 134)
- **Priority:** **P1 - High**
- **Description:**
  ```powershell
  if ($SeedLocation) { $ps.AddScript("Set-Location -LiteralPath '$SeedLocation'") | Out-Null }
  ```
- **Impact:**
  If `$SeedLocation` contains a single quote (e.g. `D:\Burt's Projects`), the script fails with a syntax error. Any unescaped characters in folder names can inject unintended commands.
- **Fix:**
  ```powershell
  if ($SeedLocation) {
      $ps.AddCommand('Set-Location').AddParameter('LiteralPath', $SeedLocation) | Out-Null
  }
  ```

---

### DEF-05: Named Pipe Lacks `CurrentUserOnly` Security
- **Component:** `RunspacePool\Server.ps1` (lines 191-196) and `RunspacePool\RunspacePool.psm1` (lines 52, 121)
- **Priority:** **P1 - High**
- **Description:**
  The server listens on `copilot-devdrive-pool-$env:USERNAME` and executes arbitrary commands via `$ps.AddScript($req.Script)`. The stream constructors do not specify `PipeOptions.CurrentUserOnly`.
- **Impact:**
  On multi-user systems, other local accounts can connect to the pipe or squat the pipe name, leading to unauthorized local code execution.
- **Fix:**
  Pass `[System.IO.Pipes.PipeOptions]::CurrentUserOnly` to both `NamedPipeServerStream` and `NamedPipeClientStream` constructors.

---

### DEF-06: Premature Idle Shutdown During Active Jobs
- **Component:** `RunspacePool\Server.ps1` (lines 204-207)
- **Priority:** **P1 - High**
- **Description:**
  The idle timer only checks the duration since the last accepted connection (`$script:LastActivity`).
- **Impact:**
  A script running for >= 30 minutes with no other connections triggers the idle timeout. The server exits its loop and disposes the pool and runspaces while the script is active.
- **Fix:**
  ```powershell
  $hasActiveWork = ($script:PendingHandlers.Count -gt 0)
  if (-not $hasActiveWork -and (((Get-Date) - $script:LastActivity).TotalMinutes -ge $IdleTimeoutMinutes)) {
      Write-Log "Idle timeout ($IdleTimeoutMinutes min) reached with no active handlers. Stopping."
      break
  }
  ```

---

### DEF-07: Unconditional `Set-Location` Hijacks Working Directory
- **Component:** `Profile.ps1` (line 13)
- **Priority:** **P1 - High**
- **Description:**
  `Set-Location -LiteralPath 'D:\'` is executed on every shell start without checking where the shell originated.
- **Impact:**
  Resets the current working directory to `D:\` when opening terminals from VS Code, Windows Terminal, or command-line shortcuts configured for specific directories.
- **Fix:**
  ```powershell
  # Only set default working directory if starting in user home or Windows system directory
  if ($PWD.Path -in $HOME, "$env:SystemRoot\System32") {
      Set-Location -LiteralPath 'D:\'
  }
  ```

---

### DEF-08: Unapproved Verb Warning on Shell Startup
- **Component:** `DevTools\DevTools.psd1` (line 72) & `Profile.ps1` (line 23)
- **Priority:** **P2 - Medium**
- **Description:**
  `Ensure` is not an approved PowerShell verb (`Get-Verb`). Importing `DevTools` emits a warning banner.
- **Impact:**
  Clutters console output on every new interactive session.
- **Fix:**
  Add `-DisableNameChecking` to `Import-Module` in `Profile.ps1`:
  ```powershell
  Import-Module (Join-Path $script:DevProfileRoot 'DevTools\DevTools.psd1') -DisableNameChecking -Force
  ```

---

### DEF-09: PowerShell 5.1 vs 7 Profile Gap During Bootstrap
- **Component:** `Setup.ps1` (lines 90-102)
- **Priority:** **P2 - Medium**
- **Description:**
  `Setup.ps1` declares `#Requires -Version 5.1`. If run in Windows PowerShell 5.1 on a clean machine, `$PROFILE` wires `Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`. When PowerShell 7 (`pwsh`) is subsequently installed, its profile path (`Documents\PowerShell\Microsoft.PowerShell_profile.ps1`) remains untouched.
- **Impact:**
  After bootstrapping a clean system, launching `pwsh` does not load the dev profile.
- **Fix:**
  Wire both PowerShell 7 and Windows PowerShell 5.1 profile locations in `Setup.ps1`.

---

### DEF-10: Missing Process `$env:PATH` Refresh After Tool Install
- **Component:** `Setup.ps1` (lines 86-88)
- **Priority:** **P2 - Medium**
- **Description:**
  Installing `mise` via winget updates registry environment variables, but the active PowerShell process does not refresh `$env:PATH` before calling `mise install`.
- **Impact:**
  `mise install` fails on initial bootstrap runs with command not recognized.
- **Fix:**
  Refresh `$env:PATH` from Machine and User registry scopes after winget installs:
  ```powershell
  $env:PATH = [Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('PATH', 'User')
  ```

---

### DEF-11: Unhandled `AbandonedMutexException`
- **Component:** `RunspacePool\RunspacePool.psm1` (line 77)
- **Priority:** **P2 - Medium**
- **Description:**
  If a previous process crashed while holding the mutex `Local\RunspacePoolServer-...`, calling `$mutex.WaitOne()` throws `[System.Threading.AbandonedMutexException]`.
- **Impact:**
  The client fails to start the server until the OS handle cleans up.
- **Fix:**
  ```powershell
  try {
      $hasLock = $mutex.WaitOne([TimeSpan]::FromSeconds(15))
  } catch [System.Threading.AbandonedMutexException] {
      $hasLock = $true
  }
  ```

---

### DEF-12: Interactive Shell Exit on Test Failure
- **Component:** `Invoke-CodeCoverage.ps1` (line 70)
- **Priority:** **P2 - Medium**
- **Description:**
  `if ($result.FailedCount -gt 0) { exit 1 }` terminates the current PowerShell process if executed interactively.
- **Impact:**
  Unexpectedly closes developer terminal windows upon test failure.
- **Fix:**
  ```powershell
  if ($result.FailedCount -gt 0) {
      throw "$($result.FailedCount) test(s) failed."
  }
  ```

---

### DEF-13: Artificially Low Coverage Metric
- **Component:** `Invoke-CodeCoverage.ps1` (lines 18-25)
- **Priority:** **P3 - Low**
- **Description:**
  `CoveragePaths` includes `DevTools\DevTools.psm1`, `Docker.ps1`, and `Reset-DevTools.ps1`, but `TestPath` only executes `RunspacePool.Tests.ps1`.
- **Impact:**
  Historical coverage is recorded at ~22.7% because the `DevTools` codebase has 0% coverage.
- **Fix:**
  Add a `DevTools\DevTools.Tests.ps1` test suite covering `Ensure-Docker`, `Test-DockerReady`, `Find-DockerDesktopExe`, and `Reset-DevTools` with mocks.

---

### DEF-14: Hardcoded Drive Path in Sandbox Config
- **Component:** `TestInSandbox.wsb` (line 17)
- **Priority:** **P3 - Low**
- **Description:**
  `<HostFolder>D:\global</HostFolder>` is hardcoded in the XML configuration.
- **Impact:**
  Fails to map the folder if the repo is cloned to another drive or directory, despite documentation stating full portability.
- **Fix:**
  Document this requirement or generate `TestInSandbox.wsb` dynamically during `Setup.ps1`.

---

### DEF-15: Loss of Typed Objects and Streams
- **Component:** `RunspacePool\Server.ps1` (lines 147-156) & `RunspacePool\RunspacePool.psm1` (lines 130-140)
- **Priority:** **P3 - Low**
- **Description:**
  Pipeline outputs are flattened to strings via `(Out-String -InputObject $o).TrimEnd()`. Warning, Information, and Verbose streams are dropped.
- **Impact:**
  Callers receive formatted text rather than structured objects, preventing object pipeline chaining.
- **Fix:**
  Use `[System.Management.Automation.PSSerializer]::Serialize($o)` or structured JSON for `Stream = 'output'`.
