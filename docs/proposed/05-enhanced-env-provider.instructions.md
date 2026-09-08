---
applyTo: "**/*.cs,**/*.ps1,**/*.psm1,**/*.psd1"
---
# Enhanced Env Provider

Model process and persistent environment stores through an enhanced PowerShell provider using the noun `Env`.

## Provider interface

Prefer standard provider cmdlets with a provider-specific dynamic `-Scope` parameter:

```powershell
gi Env:REPO -Scope Process
gi Env:REPO -Scope User
gi Env:REPO -Scope Machine
si Env:REPO ~/src -Scope User
ri Env:REPO -Scope User
gci Env: -Scope Machine
```

Canonical equivalents include `Get-Item`, `Set-Item`, `Remove-Item`, and `Get-ChildItem`.

## Logical scopes

Support these concepts where the platform adapter can define them safely:

- `Process`: the environment visible to the current process and inherited by subsequently created child processes.
- `User`: a persistent store applicable to the current user.
- `Machine`: a persistent machine-wide store.
- `Effective`: the resolved value visible according to the provider's documented precedence and provenance rules.

Do not claim identical backing stores across operating systems. `User` and `Machine` are logical scopes implemented by platform-specific adapters.

## Returned information

When detailed output is requested, expose at least:

```text
Name
Value
Scope
Source
Persistent
```

Do not discard provenance when resolving an effective value.

## Compatibility

- Preserve ordinary `Env:` process-environment behavior where possible.
- Do not silently replace the built-in `Env:` drive until compatibility, module loading order, remoting, constrained-language behavior, and host-created runspaces have been tested.
- If replacement is unsafe, mount the enhanced provider under a distinct drive during development while retaining `Env` as the module and command noun.
- Keep provider storage management separate from `Import-Env` and `Export-Env`, which project between namespaces.
