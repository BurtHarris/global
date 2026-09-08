# Agent instructions

## Harness-neutral model

- Use `AGENTS.md` as the portable, repository-scoped source of truth for agent behavior.
- Keep harness-specific files such as `CLAUDE.md` and `.github/copilot-instructions.md` thin adapters that reflect the neutral policy rather than duplicate it.
- Keep generated artifacts, repo instructions, and task scaffolding DRY: prefer one canonical source and reuse it instead of repeating the same policy in multiple files. In practice, DRY means centralize shared rules in `AGENTS.md` and keep harness-specific wrappers minimal; do not duplicate the same guidance across repo instructions, Copilot files, and generated artifacts.
- Treat skills as procedures, not policy: they can guide execution but cannot override platform safety, governance, or explicit task constraints.
- When instructions conflict, prefer the most specific applicable guidance and higher-authority policy. The effective order is:
  1. platform safety and administrative policy
  2. organization/team instructions
  3. repository-root `AGENTS.md`
  4. nearest directory-scoped `AGENTS.md`
  5. current task instructions
  6. invoked `SKILL.md` procedures

## Tooling and environment policy

- Prefer `mise` for installing tools, managing versions, and creating reusable project-local execution entry points.
- Treat `mise` as the default source of truth for language runtimes, CLIs, and project tooling wherever possible.
- Use direct system installers only when the tool is not available through `mise` or when the project explicitly requires a system-level dependency outside the runtime/toolchain.
- When a new project needs commands for build/test/lint/run, prefer adding `mise.toml` tasks over large or brittle `package.json` script wrappers.
- Keep reusable automation scripts thin and declarative; they should call into `mise`-managed tools instead of hardcoding local tool locations.

## Build and script conventions

- Prefer `mise run <task>` or `mise exec <tool>` patterns over ad hoc shell scripts and repeated environment setup commands.
- For Node-based projects, use `mise` to pin Node versions and then invoke `npx`, `npm`, or `pnpm` through the toolchain it manages rather than embedding environment assumptions in scripts.
- When building helper scripts for coding agents, make those scripts use `mise`-managed tools and portable environment variables so they work across machines and agents.
- Avoid broad package.json script chains unless the project truly requires them; the default should be small, explicit `mise.toml` tasks.

## Repository expectations

- New work should align with the repo’s existing `mise` conventions instead of introducing custom install or bootstrap logic.
- Reusable project automation must be easy for agents to discover and execute from the repo root or a project-local directory via `mise`.
- Scripts and tasks that are meant to be shared across agents should be stable, idempotent, and resilient to machine-specific paths.
- Keep this repository’s user-facing configuration under `UserProfile/` when it represents version-controlled machine setup, and sync it with the repo as needed.

## Agent skill packaging

- Keep the GitHub repository as the canonical source for reusable skills and shared developer guidance.
- Use `AGENTS.md` and `SKILL.md` as the portable shared convention; vendor-specific instruction files should only add minimal harness-specific details.
- Treat M365 packaging as an overlay, not a rewrite: generic skills stay in GitHub, while an M365 build step packages relevant `SKILL.md` files into the target app package or agent surface.
- When packaging for Microsoft 365 Copilot/Copilot Studio/Cowork, use the standard skill layout: `SKILL.md` plus optional `references/`, `scripts/`, and other assets, with `name` and `description` required in YAML frontmatter.
- Keep identity, permissions, connectors, knowledge sources, and runtime access outside the skill definitions; skills provide procedural knowledge, not authority or connectivity.
- Separate generic upstream skill content from vendor-specific assumptions such as local shell access, tool-specific behavior, or repository-local conventions.

## Agent skills

### Issue tracker

Issues and specs live in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Uses a multi-context layout. See `docs/agents/domain.md`.
