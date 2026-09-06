# global

Source-controlled PowerShell profile + dev toolchain bootstrap, shared across
all of my Windows machines (Intel/AMD x64 and Snapdragon arm64). Kept on `D:\`
per convention; the real `$PROFILE` file (which must live under
`Documents\PowerShell` for PowerShell to find it) just dot-sources `Profile.ps1`
from here.

## Layout
- `Profile.ps1` — loaded by `$PROFILE` on every session start. Activates mise,
  and imports the modules below.
- `DevTools/` — PowerShell module (`DevTools.psd1`/`.psm1`) with misc
  dev-environment helpers:
  - `Test-DockerReady` / `Ensure-Docker` — adapts to Docker Desktop being not
    installed, stopped, mid-startup, or already ready. Not run automatically
    at shell startup (keeps shell start fast) — call `Ensure-Docker` yourself
    before anything that needs the engine.
  - `Reset-DevTools` — force-reinstalls mise-managed tools (python, node,
    uv, ...) back to the versions pinned in `mise.config.toml`, discarding any
    drift (e.g. pip/npm globals).
- `RunspacePool/` — PowerShell module (`RunspacePool.psd1`/`.psm1` +
  `Server.ps1`); see below.
- `mise.config.toml` — source of truth for the global mise config, deployed to
  `~/.config/mise/config.toml` by `Setup.ps1`.
- `Setup.ps1` — idempotent bootstrap: winget -> mise, pwsh, Coreutils; registers
  the mise config; wires `$PROFILE`. Prints detected OS architecture for
  diagnostics.

## Portability (any machine, any architecture)
Everything here is architecture-agnostic by construction:
- All scripts resolve paths via `$PSScriptRoot` / `$PROFILE` / `$HOME` — never
  a hardcoded drive or username — so cloning this repo to a different path or
  drive on another machine works unchanged.
- Every installed tool ships native Windows binaries for **both x64 and
  arm64**: winget itself, `jdx.mise`, `Microsoft.PowerShell`,
  `Microsoft.Coreutils`, mise's `node` core plugin, mise's `python` core
  plugin (python-build-standalone has native arm64/aarch64 Windows builds for
  3.11+), and `uv`. winget/mise each auto-select the correct build for the
  host CPU — no manual arch branching is required.
- `Setup.ps1` is safe to re-run on every machine after cloning; it only acts
  when something is actually missing.

## First-time / re-run setup
```powershell
D:\global\Setup.ps1
```
(Or wherever you've cloned this repo — the script doesn't care.) Safe to
re-run any time (e.g. after editing `mise.config.toml`).

## Testing safely before running on a real machine
`TestInSandbox.wsb` runs `Setup.ps1` end-to-end inside **Windows Sandbox** —
a real, disposable Windows 11 desktop (not a container), reset from scratch
every run. This gives full fidelity (including `winget`/App Installer, which
Docker's Windows containers don't have) with zero risk to the host: the repo
is mapped in read-only, and everything installed inside the sandbox vanishes
when it's closed.

```powershell
# One-time (requires a restart afterwards):
Dism /Online /Enable-Feature /FeatureName:Containers-DisposableClientVM /All

# Each test run:
Start-Process D:\global\TestInSandbox.wsb
```

Why not Docker for this: Docker's Windows containers only support Server
Core/Nano Server base images, which don't include `winget`/App Installer at
all (Nano Server can't run it; Server Core can only get it via unsupported
manual sideloading) — that's precisely the piece of `Setup.ps1` most
important to validate. Those images also ship under a separate Microsoft
Container Images EULA to evaluate, whereas Windows Sandbox reuses the host's
existing Windows 11 license with no extra terms. A container is also the
wrong abstraction for testing a desktop/user-profile-oriented bootstrap
script in the first place.

### Rebooting to enable Windows Sandbox
Enabling the Sandbox feature requires a restart. `Invoke-RebootAndResume.ps1`
is a generic, reusable "reboot and auto-resume" utility: it registers a
`RunOnce` command (fires once, automatically, right after you next log back
in — no auto-logon/stored-password trickery involved) and then restarts.
```powershell
D:\global\Invoke-RebootAndResume.ps1 -Force -ResumeCommand `
    'powershell.exe -NoProfile -Command "Start-Process ''D:\global\TestInSandbox.wsb''"'
```

## Everyday use
- `Ensure-Docker` — make sure Docker's engine is up before running docker/compose commands.
- `Reset-DevTools` — wipe drift and restore python/node/uv to pinned versions.
- `mise current` — see active tool versions.
- `Invoke-PooledScript` — run a script via the background runspace-pool server
  (see `RunspacePool/`).

## RunspacePool — background runspace-pool server
`RunspacePool/` is a PowerShell module (`RunspacePool.psd1` + `.psm1`) whose
client functions talk to `Server.ps1`, a hidden background `pwsh` process
started on first use. The server hosts a
`System.Management.Automation.Runspaces.RunspacePool` (min 1 / max 5) plus one
dedicated persistent runspace, and listens on a per-user named pipe
(`copilot-devdrive-pool-$env:USERNAME`). Because the server process (and its
runspaces) stays alive between calls, `Invoke-PooledScript` avoids the cost of
spawning a new `pwsh.exe` process on every invocation — the main overhead this
whole thing exists to eliminate on Windows.

- `Invoke-PooledScript -Script '...' -Session pool` (default) — runs in a
  fresh, isolated runspace from the pool. Safe to fire several of these
  concurrently (e.g. via `Start-ThreadJob`) for parallel work.
- `Invoke-PooledScript -Script '...' -Session primary` — always runs in the
  one dedicated runspace, so variables/`cwd`/imported modules persist across
  calls, like a normal interactive shell.
- `Get-RunspacePoolStatus` / `Stop-RunspacePoolServer` / `Start-RunspacePoolServer`
  — manage the server directly if needed.
- Auto-shuts down after 30 idle minutes. Logs to
  `~\.copilot\runspacepool\server.log`.

### Seeding — spawned runspaces mimic the parent session
When `Start-RunspacePoolServer` launches the server, it captures a snapshot of
the *calling* session (`Get-RunspacePoolSeed`: currently-imported module names
+ current location) and passes it along as `-SeedModules`/`-SeedLocation`.
The server uses that to pre-import those modules into every runspace's
`InitialSessionState` (pool *and* primary) and to set their starting working
directory — so a freshly spawned runspace already looks like the parent shell
instead of PowerShell's blank default state, without each request having to
redo that setup itself. Pass `-NoSeed` to `Start-RunspacePoolServer` to skip
this and start from a bare default state instead.

Known limitation: the server keeps a small backlog (up to 4) of concurrently
outstanding named-pipe accepts rather than one at a time, so bursts of
near-simultaneous connects are handled without serializing behind a single
accept — but under heavy host load (e.g. many other processes competing for
CPU) a connect can still occasionally time out and a test can be flaky;
retrying is safe. Fine for personal, moderate-concurrency use.

### Testing
`RunspacePool.Tests.ps1` is a Pester (v6) suite covering server lifecycle,
pool isolation, primary-session persistence, error resilience (a thrown error
in one request doesn't crash the server or subsequent requests), and real
concurrency (multiple sleeps completing in parallel, not serially). It starts
its own server on a test-only pipe name, so it won't collide with an
already-running interactive server.

```powershell
Invoke-Pester D:\global\RunspacePool\RunspacePool.Tests.ps1

# With code coverage:
$c = New-PesterConfiguration
$c.Run.Path = 'D:\global\RunspacePool\RunspacePool.Tests.ps1'
$c.CodeCoverage.Enabled = $true
$c.CodeCoverage.Path = @('D:\global\RunspacePool\RunspacePool.psm1', 'D:\global\RunspacePool\Server.ps1')
Invoke-Pester -Configuration $c
```
Note: coverage numbers under-report `Server.ps1` — it runs in its own
background `pwsh` process (started via `Start-Process`), which is outside the
Pester host process's coverage instrumentation even though its behavior is
fully exercised by the tests. `RunspacePool.psm1` (the client, running
in-process) is accurately covered.

### Code coverage history
`Invoke-CodeCoverage.ps1` (repo root) runs the suite with coverage enabled and
appends one row per run to `coverage\history.csv` (timestamp, git commit/
branch, pass/fail counts, commands analyzed/executed, coverage %) — a tracked
file, so `git log -p coverage\history.csv` shows the coverage trend over time.
The raw `coverage\coverage.xml` (JaCoCo) report is regenerated each run and
gitignored.

```powershell
D:\global\Invoke-CodeCoverage.ps1
```

## Known issues / lessons learned
- **mise's community `winget` backend plugin crashes `mise install`.**
  Originally the plan was to have mise itself manage `pwsh`/`Coreutils` via
  the `Yuzu02/mise-winget` backend plugin (`winget:<PackageId>` entries in
  `mise.toml`). On the currently installed mise release (`2026.9.1`) this
  reliably crashes the whole `mise install` process with a non-unwinding Rust
  panic inside AWS-LC (`aws_lc_0_44_0_jent_entropy_switch_notime_impl`),
  aborting the process rather than just failing that one tool. This is an
  upstream mise regression (first appeared `2026.8.9`), not specific to the
  plugin — it's also reproducible via plain `mise upgrade`. Reported upstream
  with a fresh, independent repro (installing via the winget backend, not
  just `upgrade`) as a comment on the existing bug report:
  <https://github.com/jdx/mise/discussions/12646#discussioncomment-18308195>.
  **Takeaway:** `pwsh` and `Coreutils` are installed directly via `winget` in
  `Setup.ps1` instead of through mise, which is also more idiomatic anyway —
  mise is best suited to language runtimes (node/python/uv), while Windows
  system apps are more reliably handled by winget directly.
