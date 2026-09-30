# Agent Instructions

## Command approvals

### Deno read-only operations

For Deno packages, direct read-only Deno commands are pre-approved. Prefer
invoking Deno directly over wrapping it in another task runner when the package
already has a `deno.json` task or the intent is ordinary validation/inspection.

Pre-approved examples include:

- `deno test`
- `deno task check`
- `deno check ...`
- `deno lint`
- `deno fmt --check`
- `deno fmt ...` when scoped to files/directories in this repository
- `deno info ...`
- `deno doc ...`

Use Deno permission switches for scripts that execute project code. Default to
read-only filesystem access when a script needs files, for example
`--allow-read`, and avoid broader permissions unless the task clearly requires
them.

Repo-local formatting is non-controversial maintenance. It is OK to run Deno
formatting directly on the relevant package or touched files, while still
avoiding unrelated broad rewrites when a narrower format command will do.

### Workspace write operations

Within this workspace (`D:\global`), write operations are pre-approved to
minimize prompting:

- Creating, modifying, formatting, and testing files scoped to the repository
  and its packages (`Fuzz`, `yeti`, `docs`, `scripts`, etc.).
- Running repo-local Deno scripts with `--allow-write` and `--allow-read` when
  target paths remain within the workspace.
- Standard git working-tree commands: `git status`, `git diff`, `git add`, and
  `git commit`.

### Web read operations (PREFIXES.yaml)

Web read operations (`read_url_content`, documentation lookups) are pre-approved
without confirmation when the target URL matches an entry in
[`PREFIXES.yaml`](PREFIXES.yaml):

- Pre-approved sources include official documentation, registries, specs, and
  designated public data domains (e.g., `https://jsr.io/`, `https://deno.land/`,
  `https://pandoc.org/`, `https://github.com/`, `https://www.fec.gov/`).
- Web requests targeting URLs outside the prefixes declared in `PREFIXES.yaml`
  should prompt or be verified.
