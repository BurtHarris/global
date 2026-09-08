# User Copilot instructions

## Default behavior

- Prefer `mise` for installs, tool version management, and project-local reusable automation.
- Keep project automation portable and machine-independent; do not hardcode local paths when a `mise` task can represent the workflow.
- Use `mise.toml` tasks before custom package scripts when creating repeatable dev/test/run commands.
- Treat the repo-level instructions as the most local authoritative guidance, and this file as the user-level fallback when an agent has no repo-specific instruction set.
