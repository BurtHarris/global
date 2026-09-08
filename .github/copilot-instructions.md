# Copilot instructions

This file is the GitHub Copilot-specific adapter for the repository-neutral guidance in `AGENTS.md`. It should stay thin and defer to the repo-root instructions unless a Copilot-specific behavior needs to be called out.

## Required source of truth

- Use the repo-root `AGENTS.md` as the canonical agent policy for this repository.
- Keep this file focused on Copilot-specific workflow nuances, not duplicated policy.
- When a rule conflicts, the higher-level policy and the repo-neutral guidance are authoritative.

## Copilot-specific notes

- Follow the repo’s neutral policy and reuse the canonical guidance in `AGENTS.md` rather than restating toolchain rules here.
- Prefer minimal, task-specific Copilot guidance only when it adds behavior that is unique to GitHub Copilot and not already represented elsewhere.
- Keep generated artifacts, scripts, and instructions DRY: avoid repeating the same policy in both the neutral repo guidance and the harness adapter. In practice, this means the neutral repo rule set stays in `AGENTS.md`, and this file only adds Copilot-specific behavior that cannot live there without being redundant.
