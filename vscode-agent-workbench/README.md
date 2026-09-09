# Agent Workbench

An MVP VS Code extension for this repository's agent-tooling research outcome: one place to start instruction-oriented workflows, inspect workspace agent assets, keep a small local run history, and jump into VS Code's built-in AI debugging surfaces.

## Current scope

- Chat participant: `@agent-workbench`
- Slash commands:
  - `/run-instruction`
  - `/debug-skill`
  - `/inspect-agent`
  - `/show-trace`
- Language model tools:
  - `#workspaceInventory`
  - `#debugContext`
- Explorer view: **Agent Workbench Runs**
- Wrapper commands for:
  - Agent Customizations
  - Agent Debug Logs
  - Chat Debug View
  - MCP server list
  - Waza eval scaffolding terminal

## Build

```bash
cd /home/runner/work/global/global/vscode-agent-workbench
npm install
npm run compile
```

## Run in VS Code

Open `/home/runner/work/global/global/vscode-agent-workbench` in VS Code and run the standard **Run Extension** launch flow for extension development.

Once the extension host opens:

1. Open chat and mention `@agent-workbench`
2. Run one of the slash commands
3. Use the response buttons to jump into built-in VS Code debugging surfaces
4. Check the **Agent Workbench Runs** explorer view for recent local traces

## Waza integration

This MVP does not replace Waza. It provides a **Prepare Waza Eval** command that opens an integrated terminal with a `waza eval new` scaffold command for the selected skill, so the extension can lean on Waza for repeatable evaluation workflows instead of inventing a parallel eval engine.
