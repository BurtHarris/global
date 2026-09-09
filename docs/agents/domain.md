# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. In multi-context repos, also check `<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Context → Package convention

Contexts stay **flat until the 2nd package** appears. If a context has one package, point the context directly at that package path. Add a dedicated context directory only when that context grows into multiple packages.

Worked examples:

- **Pool** is still flat: it maps directly to `RunspacePool/CONTEXT.md` (single package today).
- **`pages/`** has multiple packages (`lib/`, `mcp/`, `cli/`, `gui/`, `pwsh/`, `python/`), so `pages/` is the context directory and owns `pages/CONTEXT.md`.

Typical multi-context layout in this repo:

```
/
|- CONTEXT-MAP.md
|- docs/adr/                         <- cross-context decisions
|- DevTools/
|  |- CONTEXT.md
|  `- docs/adr/                      <- DevTools decisions
|- RunspacePool/
|  |- CONTEXT.md                     <- Pool context (flat while single-package)
|  `- docs/adr/
`- pages/
   |- CONTEXT.md                     <- Context directory (multi-package)
   `- docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because..._