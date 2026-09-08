---
applyTo: "**/*.ps1,**/*.psm1,**/*.psd1,AGENTS.md,**/SKILL.md"
---
# PowerShell Command Style

Prefer PowerShell as the cross-platform command language for agent instructions when the required tools are available.

## Path operations

- Use `Test-Path` to test existence.
- Use `Resolve-Path` to resolve an existing path.
- Use `Join-Path` when constructing executable paths from variables or values.
- Use `Convert-Path` when a provider path must be converted to a provider-native path.
- Do not assume all native executables understand PowerShell provider paths or tilde expansion.

## Concise aliases

Use built-in, standardized PowerShell aliases when all of these conditions hold:

1. The alias is available in supported PowerShell editions.
2. Its meaning is unambiguous in PowerShell context.
3. It materially improves conciseness.
4. The instruction is not intended to be copied into another shell unchanged.

Examples include:

```powershell
gci Env:
gi Env:REPO
gc ~/.agents/AGENTS.md
rvpa ~/.agents
cd $env:REPO
```

Use canonical cmdlet names when no standard alias exists. In particular, do not require private aliases for `Test-Path`, `Join-Path`, or `Split-Path` in shared instructions.

## Environment syntax

- Use `$env:NAME` for executable PowerShell environment-variable access.
- Use `$NAME` only for ordinary PowerShell variables or documented logical notation that will be translated before execution.
- Retain `%NAME%` where a Windows feature, configuration format, or command shell requires it.
