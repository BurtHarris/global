# Claude-specific instructions

This file is a thin harness adapter over the repository-neutral guidance in `AGENTS.md`. Keep it minimal and defer to the root `AGENTS.md` whenever there is any conflict.

## Required source of truth

- Use the repository-root `AGENTS.md` as the canonical instruction file for shared behavior.
- Keep Claude-specific notes here only when they are harness-specific and cannot be expressed portably.
- Prefer neutral, version-controlled repo instructions over ephemeral chat state or local assumptions.

## Tooling policy

- Prefer `mise` for installs, tool version management, and reusable project-local execution entry points.
- Treat `mise` as the default source of truth for runtimes and CLIs across this repository.
- Prefer `mise run <task>` / `mise exec <tool>` over ad hoc shell scripts and custom environment setup.
- When a new project needs build/test/lint/run commands, add `mise.toml` tasks before creating broad `package.json` script chains.
- Keep reusable automation scripts thin and declarative; they should call `mise`-managed tools rather than hardcoding local paths.

## Working expectations

- Respect the nearest applicable project instructions and keep adapter files declarative rather than duplicative.
- If a rule appears in both `AGENTS.md` and this file, the repo-neutral instruction is authoritative.
- Prefer stable, discoverable automation that the next coding agent can run without machine-specific assumptions.