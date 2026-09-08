# Research: AGENTS.md, Copilot custom instructions, and M365 skill packaging

## Summary

-   Most agentic tools are converging on a common model of extending their prompt managment system.  This starts with the `AGENTS.md` files as the agent-instruction mechanism, with the nearest file in the directory tree taking precedence.  Prefer using these harness neutral neutral style of management.
-   GitHub Copilot supports repository-level instructions via `.github/copilot-instructions.md`.  This 
-   The `agentsmd/agents.md` project defines `AGENTS.md` as a shared convention across agent tooling, not just a single vendor format.
-   Microsoft’s M365 skill packaging model uses `SKILL.md` files with YAML frontmatter and optional supporting files such as `references/` and `scripts/`.
-   A GitHub skills repository should remain the canonical source, while M365 deployment is a packaging overlay rather than a direct attachment of the raw GitHub repo to ordinary M365 Copilot Chat.

This means the safest cross-tool pattern is:

-   Use `AGENTS.md` for repo-local and user-local default guidance in the shared agent convention.
-   Keep `.github/copilot-instructions.md` for GitHub Copilot repo-wide guidance.
-   Package M365-ready skills separately using the standard `SKILL.md` layout for Copilot Studio or Copilot Cowork.

## Confirmed sources

### 1) GitHub Copilot repository instructions

GitHub's docs explicitly say:

-   repository-wide instructions live in `.github/copilot-instructions.md`
-   agent instructions are supported via `AGENTS.md` files stored anywhere in the repository
-   the nearest `AGENTS.md` wins in the directory tree
-   `CLAUDE.md` or `GEMINI.md` at the repo root are accepted alternatives

Source:

-   [https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)

Relevant quote:

> "Agent instructions are used by AI agents. You can create one or more AGENTS.md files, stored anywhere within the repository. When Copilot is working, the nearest AGENTS.md file in the directory tree will take precedence."

### 2) AGENTS.md as the shared agent convention

The `agentsmd/agents.md` project documents `AGENTS.md` as the cross-tool convention for agent instructions, and GitHub Copilot references that convention directly.

This is the strongest evidence that `AGENTS.md` is the portable, vendor-neutral option for agent config, while `.github/copilot-instructions.md` is the GitHub Copilot-specific repo layer.

### 3) M365 skill packaging model

Microsoft’s M365 agent skill model packages reusable skills as directory-based units, each with a `SKILL.md` file and optionally `references/` and `scripts/` content. The skill file uses YAML frontmatter with at least `name` and `description`, followed by Markdown instructions.

This is the same shape used across Copilot Studio and Copilot Cowork packaging, and it is not equivalent to attaching a GitHub repository directory directly to ordinary M365 Copilot Chat.

## What this means for this repo

We should apply the standard in both places:

1.  Project-level repo config
    
    -   `AGENTS.md` at the repo root
    -   `.github/copilot-instructions.md` for the GitHub Copilot-specific layer
2.  User-level config
    
    -   a personal `AGENTS.md` in the active user profile, used as the machine-wide default for agentic tools that honor the convention
3.  M365 packaging flow
    
    -   keep the GitHub repo as the canonical source of generic skills and agent instructions
    -   generate a packaging overlay for M365 that contains only the relevant skill folders and associated static assets
    -   keep permissions, knowledge sources, connectors, and runtime integration outside the skill definitions

## Key M365 skill architecture recommendation

The most practical operating model is:

-   GitHub repository = canonical source of truth for reusable skills and shared logic
-   M365 package = generated artifact containing the applicable packaged skills
-   agent host = orchestration, knowledge sources, connector access, identity, permissions, and tool routing
-   skill definitions = procedural guidance only, not credentials or runtime authority

A good structure looks like:

```text
canonical-github-repo/
  skills/
    pqna-discourse/
    topic-map-organization/
    okf-representation/
    authority-control/
    provenance-management/
    knowledge-gap-analysis/
  AGENTS.md
  .github/copilot-instructions.md

m365-package/
  manifest.json
  color.png
  outline.png
  skills/
    pqna-discourse/
      SKILL.md
    topic-map-organization/
      SKILL.md
    ...
```

## Important boundary

A `SKILL.md` file provides procedural knowledge; it does not grant actual access to SharePoint/OneDrive, Graph, connectors, MCP tooling, security context, or other runtime capabilities.

Those live in the host environment and must be configured separately.

## Recommended policy for this repo

-   Prefer `AGENTS.md` for version-controlled agent behavior and shared guidance.
-   Prefer `.github/copilot-instructions.md` for GitHub Copilot repo-specific layering.
-   Prefer `mise` for installs, tool management, and reusable agent scripts.
-   Treat M365 skill packaging as a deployable overlay, not as direct GitHub repo attachment.
-   Preserve upstream origin metadata and licensing when vendoring or adapting external skills.
-   Keep generic skills separate from M365 deployment assumptions and from local shell or toolchain assumptions that are not portable.
