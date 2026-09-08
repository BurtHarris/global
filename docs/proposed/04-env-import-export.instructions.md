---
applyTo: "**/*.ps1,**/*.psm1,**/*.psd1"
---
# Env Import and Export Commands

Use the noun `Env` for commands that project values between the process environment and the PowerShell variable namespace.

## `Import-Env`

`Import-Env` copies selected entries from `Env:` into ordinary PowerShell variables.

Required behavior:

- Accept zero or more names or patterns.
- If no selection is supplied, use the module's configured import policy.
- Import values as strings.
- Preserve an existing ordinary PowerShell variable unless `-Force` is specified.
- Produce no pipeline output unless `-PassThru` is specified.
- Treat imported values as snapshots. Do not imply continuing synchronization with `Env:`.
- Avoid importing dangerous or conflicting automatic, preference, and reserved PowerShell variable names by default.

Examples:

```powershell
Import-Env REPO, TEAM, ORG, SYSTEM
Import-Env 'XDG_*'
Import-Env REPO -Force
```

A profile may initialize concise POSIX-like variables with:

```powershell
Import-Module Env
Import-Env REPO, TEAM, ORG, SYSTEM
```

## `Export-Env`

`Export-Env` copies explicitly selected ordinary PowerShell variables into the process environment.

Required behavior:

- Require explicit variable names.
- Convert exported values to strings deliberately.
- Reject values that cannot be represented safely as environment strings unless an explicit conversion policy is supplied.
- Do not export every PowerShell variable implicitly.
- Removing or nulling an environment entry must be an explicit operation.

Example:

```powershell
Export-Env REPO, TEAM
```

## Runspaces

- Interactive hosts may load the module from a PowerShell profile.
- Hosts that create runspaces directly must apply equivalent initialization through their runspace initial state.
- Do not assume programmatically created runspaces execute user profiles.
