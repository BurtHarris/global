# Agent Instructions

## Command approvals

### Deno read-only operations

For Deno packages, direct read-only Deno commands are pre-approved. Prefer invoking Deno directly
over wrapping it in another task runner when the package already has a `deno.json` task or the
intent is ordinary validation/inspection.

Pre-approved examples include:

- `deno test`
- `deno task check`
- `deno check ...`
- `deno lint`
- `deno fmt --check`
- `deno fmt ...` when scoped to files/directories in this repository
- `deno info ...`
- `deno doc ...`

Use Deno permission switches for scripts that execute project code. Default to read-only filesystem
access when a script needs files, for example `--allow-read`, and avoid broader permissions unless
the task clearly requires them.

Repo-local formatting is non-controversial maintenance. It is OK to run Deno formatting directly on
the relevant package or touched files, while still avoiding unrelated broad rewrites when a narrower
format command will do.