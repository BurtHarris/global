# PowerShellProfile

Source-controlled PowerShell profile + dev toolchain bootstrap for this machine.
Kept on `D:\` per convention; the real `$PROFILE` file (which must live under
`Documents\PowerShell` for PowerShell to find it) just dot-sources `Profile.ps1`
from here.

## Layout
- `Profile.ps1` — loaded by `$PROFILE` on every session start. Activates mise,
  and loads the helper functions below.
- `Docker.ps1` — `Test-DockerReady` / `Ensure-Docker` functions. Adapts to
  Docker Desktop being not installed, stopped, mid-startup, or already ready.
  Not run automatically at shell startup (keeps shell start fast) — call
  `Ensure-Docker` yourself before anything that needs the engine.
- `Reset-DevTools.ps1` — `Reset-DevTools` function. Force-reinstalls mise-managed
  tools (python, node, pwsh, coreutils, ...) back to the versions pinned in
  `mise.config.toml`, discarding any drift (e.g. pip/npm globals).
- `mise.config.toml` — source of truth for the global mise config, deployed to
  `~/.config/mise/config.toml` by `Setup.ps1`.
- `Setup.ps1` — idempotent bootstrap: winget -> mise -> pwsh/coreutils/node/python,
  registers the `winget` mise backend, deploys the mise config, wires `$PROFILE`.

## First-time / re-run setup
```powershell
D:\PowerShellProfile\Setup.ps1
```
Safe to re-run any time (e.g. after editing `mise.config.toml`).

## Everyday use
- `Ensure-Docker` — make sure Docker's engine is up before running docker/compose commands.
- `Reset-DevTools` — wipe drift and restore python/node/pwsh/coreutils to pinned versions.
- `mise current` — see active tool versions.
