# ADR 0002: Canonical instruction sources and profile distribution boundaries

## Status

Accepted

## Context

The harness-neutral instruction model needs clear ownership and composition rules across repository, user, team, organization, and packaged skill scopes. Without explicit boundaries, mirrored copies can drift semantically, and instructions copied between systems can leak secrets.

## Decision

We define five canonical instruction profiles with strict ownership and deterministic composition:

- **Organization profile** (owned by org maintainers): global policy and non-negotiable guardrails.
- **Team profile** (owned by team maintainers): team defaults that refine, but do not weaken, organization guardrails.
- **Repository profile** (owned in-repo): project-specific conventions, architecture context, and workflow rules safe for repository visibility.
- **Packaged skill profile** (owned by skill package maintainers): reusable capability-specific behavior shipped with the skill.
- **User profile** (owned by the user, private by default): personal workflow preferences that can tune style but cannot bypass higher-scope guardrails.

Composition order is fixed: **organization → team → repository → packaged skill → user**. Later layers may add detail or tighten constraints; they may not relax mandatory constraints inherited from earlier layers.

Harness integration is adapter-based:

- A harness reads the canonical profiles and emits harness-specific artifacts.
- Generated harness artifacts are **mirrors**, not sources of truth.
- Each mirror records its source profile IDs + content hash. If hash mismatch is detected, the mirror must be regenerated, not hand-edited.

Distribution and secret boundaries are explicit:

- Only repository-safe instruction content is stored in this repository.
- User/team/organization sensitive content stays in private profile stores and is referenced by ID during composition.
- Adapters must redact or omit secret-bearing fields before writing any repository-visible mirror.

## Consequences

- Canonical knowledge has one authoritative source per scope, reducing semantic drift.
- Harnesses remain interchangeable because adaptation happens at the edge through adapters.
- Secret leakage risk is reduced by keeping sensitive scopes private and enforcing redaction before mirroring.
