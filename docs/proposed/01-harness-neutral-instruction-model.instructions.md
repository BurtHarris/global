---
applyTo: "**"
---
# Harness-Neutral Agent Instruction Model

Use harness-neutral instruction conventions wherever practical.

## Instruction forms

- Use `AGENTS.md` for persistent repository or directory-scoped instructions.
- Use `SKILL.md` for reusable capabilities that should be selected according to task intent.
- Keep harness-specific files thin. They should adapt neutral instructions rather than duplicate their substance.
- Treat skills as procedures operating within applicable policy and task instructions. Skills do not override policy, permissions, or explicit task constraints.

## Directory scope

- A repository-root `AGENTS.md` governs the repository unless specialized below it.
- A nested `AGENTS.md` specializes instructions for its directory subtree.
- When applicable repository instructions conflict, prefer the nearest `AGENTS.md` in the directory ancestry of the affected file.
- Do not assume every harness implements hierarchical discovery. When necessary, a harness adapter must discover and compose the applicable files.

## Instruction composition

Compose instructions from these logical sources:

1. Platform safety and administrative policy.
2. Organization-managed instructions.
3. Team-managed instructions.
4. Developer-local instructions.
5. Repository-root `AGENTS.md`.
6. Nearest directory-scoped `AGENTS.md`.
7. Current task instructions.
8. Invoked `SKILL.md` procedures.

This list identifies sources, not an unconditional override stack. Higher-governance policy cannot be weakened. More specific repository instructions may specialize broader repository instructions. Current task instructions may select goals and outputs but must remain within applicable policy. Skills provide procedures rather than authority.
