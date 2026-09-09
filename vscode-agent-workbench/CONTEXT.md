# Agent Workbench context

## Scope

`vscode-agent-workbench/` is a standalone VS Code extension prototype for running instruction-oriented agent workflows and helping a maintainer jump into built-in VS Code debugging surfaces for skills, agents, MCP servers, and related tooling.

## Vocabulary

- **Workbench run**: a locally persisted record of one instruction/debugging action taken through the extension.
- **Workspace inventory**: the extension's scan of skills, agents, hooks, instructions, prompts, MCP configuration files, and agent-capable extension manifests in the open workspace.
- **Debug surface**: an existing VS Code or Copilot UI used for inspection, such as Agent Debug Logs, Chat Debug View, or MCP server management.
- **Instruction profile**: a scope-owned instruction layer (organization, team, repository, packaged skill, or user) that contributes to composed agent behavior.
- **Canonical profile source**: the one authoritative location for an instruction profile; mirrors and exports are derived artifacts.
- **Harness adapter**: projection logic that renders canonical instruction profiles into harness-specific prompt/configuration formats.
