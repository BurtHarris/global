# Context Map

This repository is a [monorepo](docs/adr/0001-monorepo-structure.md): a single
repository holding multiple independent projects. It has the following
bounded contexts:

| Context | Location | Scope |
| ------- | -------- | ----- |
| DevTools | `DevTools/CONTEXT.md` | Developer-environment helper module. |
| Pool | `RunspacePool/CONTEXT.md` | Background PowerShell runspace-pool module. |
| Bootstrap | `CONTEXT.md` | Repository-root bootstrap/profile scripts and machine setup flow. |
| Agent Workbench | `vscode-agent-workbench/CONTEXT.md` | VS Code extension prototype for instruction-oriented agent workflow execution and debugging. |
| Pages | `pages/CONTEXT.md` | Polyglot toolkit for M365 Copilot Pages — itself a nested polyglot package layout (see `pages/docs/adr/0001-polyglot-workspace-architecture.md`). |

Root `docs/adr/` holds decisions that apply across contexts. Each context owns its glossary and context-specific ADRs at the location above. Context files are created when their vocabulary or decisions need recording.