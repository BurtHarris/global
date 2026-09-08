---
applyTo: "**"
---
# Portable Path and Environment Notation

Use concise path notation in documentation and translate it at the execution boundary.

## Home paths

- Use `~/` for a path relative to the current user's home directory.
- Preserve `~/` in platform-neutral documentation.
- Before passing a path to an API or native executable, resolve it according to that tool's actual path semantics.
- Do not extend tilde syntax to represent repository, team, organization, or system roots.

## Named roots

Use uppercase environment-variable names for logical roots:

- `$REPO/` identifies the current repository root.
- `$TEAM/` identifies the applicable team-managed root.
- `$ORG/` identifies the organization-managed root.
- `$SYSTEM/` identifies the machine-wide managed root.

Interpret notation according to the command language:

```text
Documentation or POSIX shell: $REPO/AGENTS.md
PowerShell:                    $env:REPO/AGENTS.md
Windows command shell:        %REPO%\AGENTS.md
```

## Translation rules

- In POSIX shells, `$REPO` uses the shell variable imported from the inherited environment unless that shell variable has subsequently been assigned or unset.
- In executable PowerShell, use `$env:REPO`, not `%REPO%` and not an unresolved documentation placeholder.
- In `cmd.exe`, batch files, Windows configuration fields, or APIs that define percent expansion, preserve `%REPO%` notation.
- Preserve the notation already required by an existing file format, command language, or API.
- Never assume PowerShell expands `%NAME%`; an invoked application may do so, but PowerShell itself treats it as ordinary text.
