# ADR 0001: Monorepo structure

## Status

Accepted

## Context

This repo (`global`) holds several things that could each have been their own
repository: a PowerShell profile and dev-toolchain bootstrap, two independent
PowerShell modules (`DevTools/`, `RunspacePool/`), and a polyglot toolkit
(`pages/`) with its own TypeScript, PowerShell, and Python packages.

If you haven't worked in one before: a **monorepo** ("mono" = single, "repo" =
repository) is a single version-control repository that holds multiple
projects, which would otherwise each get their own repository, versioned and
released together. It's a common pattern at large companies (Google, Meta,
Microsoft all run enormous internal monorepos), but it is *not* the default
choice for a beginner or a small personal codebase — most tutorials and most
projects assume "one repo = one project," so the term and its trade-offs are
worth spelling out explicitly rather than assuming familiarity.

The opposite (and more common default) is a **polyrepo**: one repository per
project, each cloned, versioned, and released independently.

## Decision

We organize `global` as a monorepo:

- The repo root holds machine-bootstrap scripts (`Setup.ps1`, `Profile.ps1`,
  `mise.config.toml`) plus two PowerShell modules (`DevTools/`,
  `RunspacePool/`) and the `pages/` toolkit, each documented in its own
  `CONTEXT.md` and indexed from the root [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).
- Nothing here is split via git submodules or subtrees — every file lives
  directly in this one repository's history. `pages/` is a directory, not a
  separate git repository.
- `pages/` is itself organized as a polyglot **package layout inside this
  monorepo** — a monorepo nested one level inside a monorepo — combining an
  npm workspace (`lib/`, `mcp/`, `cli/`, `gui/`) with a PowerShell module
  (`pwsh/`) and a Python package (`python/`); see
  [`pages/docs/adr/0001-polyglot-workspace-architecture.md`](../../pages/docs/adr/0001-polyglot-workspace-architecture.md)
  for that decision in detail. The nesting is intentional: `pages/` needs its
  own polyglot workspace tooling (npm workspaces, `uv`, Pester) that is
  independent of the root repo's PowerShell-bootstrap tooling.

## Consequences

- **One clone, one history.** Cloning `global` gets you the profile, both
  PowerShell modules, and the `pages/` toolkit in a single `git clone` with
  one shared commit history — no submodule init step, no version-matrix to
  keep in sync across repos.
- **Cross-cutting changes are one commit.** A change that touches, say, both
  `RunspacePool/` and how `Profile.ps1` imports it lands as a single atomic
  commit, reviewable and revertable as one unit — this is the main practical
  advantage a monorepo has over a polyrepo.
- **Independent projects still need independent boundaries.** Each context
  (`DevTools/`, `RunspacePool/`, `pages/`) keeps its own `CONTEXT.md`
  glossary, its own tests, and (where relevant) its own `docs/adr/` for
  context-scoped decisions — the monorepo doesn't mean "one undifferentiated
  pile of files," see [`docs/agents/domain.md`](../agents/domain.md).
- **No per-project release cadence.** Because there's a single history, there
  is no independent version number or release tag per module; if that's ever
  needed (e.g. publishing `pages/` packages to npm/PyPI on their own
  schedule), that's a future decision to revisit, not something this ADR
  commits to.
