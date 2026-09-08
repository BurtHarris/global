# Context Map

This repository has the following bounded contexts:

| Context | Location | Scope |
| ------- | -------- | ----- |
| DevTools | `DevTools/CONTEXT.md` | Developer-environment helper module. |
| RunspacePool | `RunspacePool/CONTEXT.md` | Background PowerShell runspace-pool module. |

Root `docs/adr/` holds decisions that apply across contexts. Each context owns its glossary and context-specific ADRs at the location above. Context files are created when their vocabulary or decisions need recording.