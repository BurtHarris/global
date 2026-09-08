# User agent instructions

This file is the user-level default fallback. It should defer to the nearest repository `AGENTS.md` when one is present, and it should stay minimal and portable across agent harnesses.

## Default toolchain policy

- Prefer `mise` for installs, version management, and reusable project-local execution entry points.
- Treat `mise` as the default source of truth for runtimes, CLIs, and project tooling across projects.
- Use direct system installers only when the tool is not available through `mise` or when a task specifically requires a system-level dependency outside the runtime/toolchain.
- Prefer `mise.toml` tasks over long ad hoc shell scripts or large `package.json` script chains when creating reusable automation.
- Keep helper scripts thin and declarative; they should call `mise`-managed tools and portable environment variables rather than embedding machine-specific paths.

## Build and automation conventions

- Prefer `mise run <task>` or `mise exec <tool>` patterns over repeated environment bootstrap commands.
- For Node-based projects, pin the runtime through `mise` and then invoke `npx`, `npm`, or `pnpm` through that managed toolchain instead of assuming local environment state.
- When creating codegen, validation, or agent-support scripts, prefer portable, reusable commands that work across repos and machines.
- Avoid bespoke install or bootstrap logic when a general `mise` task can cover the job.

## Working expectations

- Respect the nearest project-level `AGENTS.md` and repo instructions when present; this file is the default user-level fallback.
- Do not add broad package-manager script wrappers when a small `mise.toml` task or direct `mise exec` command is enough.
- Favor stable, discoverable automation that the next coding agent can run without context-specific setup.
- Keep vendor-specific instructions minimal and adapt neutral repo guidance rather than duplicating it.

## Agent skill packaging

- Keep the canonical source of reusable skills in GitHub or another version-controlled repo, and treat M365 deployment as a packaging overlay.
- Package M365 Copilot/Copilot Studio/Cowork skills using a standard skill directory containing `SKILL.md` plus optional `references/` and `scripts/` assets.
- Preserve upstream origin, version, and license metadata when vendoring or adapting external skills.
- Keep generic guidance separate from M365-specific deployment assumptions, and keep permissions, connectors, and knowledge sources outside the skill files.
- Use the AGENTS-style instructions as the portable default, and only add vendor-specific repo instructions when a target platform requires them.
