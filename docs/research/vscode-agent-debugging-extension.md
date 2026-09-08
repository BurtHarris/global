# Research: VS Code extension for executing instructions and debugging skills, agents, and plugins

## Bottom line

I did **not** find a single official VS Code extension that already provides a unified workbench for **executing instructions**, **driving agent/tool workflows**, and **debugging skills/agents/plugins** end to end. The closest first-party pieces are:

- VS Code's **AI extensibility APIs** for chat participants, language model tools, and MCP integration.[^vscode-ai-overview]
- VS Code's **Agent Customizations editor**, which centrally manages instructions, skills, agents, MCP servers, hooks, and plugins.[^vscode-customizations]
- The preview **Chat Customizations Evaluations** extension, which analyzes `SKILL.md`, `*.agent.md`, `*.instructions.md`, and `*.prompt.md` files and can run **Waza** skill evaluations.[^vscode-customizations][^waza]
- VS Code's **MCP development support**, including server registration, tool/prompt/resource support, output logs, and development-mode debugging for Node.js and Python MCP servers.[^vscode-mcp-guide][^mcp-sample]
- The official **MCP Inspector**, which is a standalone web/CLI/TUI developer tool for inspecting MCP servers, but **not** a VS Code extension.[^mcp-inspector]
- VS Code's **debugger extension** architecture for debugging extensions and debug adapters in parallel or in one process.[^vscode-debugger-guide]

So: **there are strong built-in primitives and one adjacent evaluation extension, but not the one integrated extension you described.**

## What already exists

### 1. VS Code can host an extension that orchestrates this workflow

VS Code documents four relevant AI extension paths: **language model tools**, **MCP tools**, **chat participants**, and direct **Language Model API** use.[^vscode-ai-overview] That means a single extension can act as the front door for an instruction-driven workflow while still integrating deeply with the editor.

### 2. Chat participants already support instruction-style entry points

Chat participants can:

- own the end-to-end conversation flow,[^vscode-chat]
- expose **slash commands** such as `/explain` or other task verbs,[^vscode-chat]
- call VS Code APIs directly, including debug-related APIs.[^vscode-chat]

This is the closest first-party primitive to an "execute instructions" UX inside VS Code chat.

### 3. Language model tools are the right primitive for editor-aware actions

VS Code's Language Model Tool API exists specifically to let extensions add tools that agent mode can invoke automatically.[^vscode-tools] The docs explicitly call out using VS Code's **debug APIs** from a tool implementation.[^vscode-tools] Tool availability can also be constrained with a `when` clause such as `debugState == 'running'`.[^vscode-tools]

That makes LM tools a strong fit for actions like:

- run a saved instruction against the current workspace,
- inspect current debug state,
- collect traces/logs/resources for an agent run,
- expose focused "debug skill" or "inspect tool invocation" actions only when relevant.

### 4. MCP already covers a large part of the agent/tool side

VS Code's MCP guide says VS Code implements the MCP specification and supports MCP **tools**, **prompts**, **resources**, **sampling**, **server instructions**, and **roots**.[^vscode-mcp-guide] It also says:

- MCP **prompts** become reusable **slash commands** in chat,[^vscode-mcp-guide]
- extensions can **register MCP servers programmatically**,[^vscode-mcp-guide]
- users can inspect MCP server failures through **Show Output** / **MCP: List Servers**,[^vscode-mcp-guide]
- Node.js and Python MCP servers can be debugged via MCP **development mode**.[^vscode-mcp-guide]

This means much of the "skills/agents/plugins" debugging surface already exists for the MCP part of the problem.

### 5. The closest existing extension is evaluative, not an end-to-end runner/debugger

VS Code's customization overview documents a separate preview extension called **Chat Customizations Evaluations**. It analyzes skill, agent, instructions, and prompt files; surfaces diagnostics in the Problems view; can apply suggested fixes; and, for skills, integrates with **Waza** to scaffold and run evaluations.[^vscode-customizations] Waza itself is a CLI for evaluating AI agent skills rather than a general live debugger/workbench.[^waza]

This is the closest official extension I found, but it is still more of a **quality/evaluation tool** than a unified **execute + trace + debug** environment.

### 6. The official inspector is close, but it is not a VS Code extension

The official `modelcontextprotocol/inspector` project describes itself as a developer tool for inspecting MCP servers and ships as **Web**, **CLI**, and **TUI** clients behind one `mcp-inspector` binary.[^mcp-inspector] That is strong evidence that the nearest official debugging tool today is **outside** VS Code rather than packaged as a VS Code extension.

### 7. VS Code already has mature extension/plugin debugging primitives

The VS Code debugger extension guide explains how to debug an extension and its debug adapter simultaneously, including multi-session debugging and server/inline approaches for easier development.[^vscode-debugger-guide] So plugin/debug-adapter debugging is already well-supported at the platform level, even though it is separate from the AI/MCP tooling story.

## Gap analysis

The missing piece is the **unified operator experience**:

1. one place to run named instructions,
2. one place to observe agent/tool/resource activity,
3. one place to jump from a failed tool call to logs, context, and debugger state,
4. one place to compare "instruction intent" with "tool execution result".

There is also a narrower gap between today's tooling and a maintainer-friendly workflow: the existing official tools are split between **authoring/customization management**, **runtime debugging**, **MCP inspection**, and **skill evaluation**, rather than one repeatable run/replay/regression harness.[^vscode-customizations][^vscode-chat-debug][^mcp-inspector][^waza]

The first-party sources show that VS Code exposes the primitives, but they are currently spread across:

- chat participants and slash commands,[^vscode-chat]
- language model tools,[^vscode-tools]
- MCP server configuration and output views,[^vscode-mcp-guide]
- debugger extension infrastructure.[^vscode-debugger-guide]

## Recommended plan for a new extension

If you build this, I would scope it as a **VS Code extension that unifies AI workflow execution and debugging**, not as a standalone protocol tool.

### Phase 1: provide the operator surface

1. Create a **chat participant** as the user-facing entry point for natural-language and slash-command instruction execution.[^vscode-chat]
2. Add a small set of explicit slash commands such as:
   - `/run-instruction`
   - `/debug-skill`
   - `/inspect-agent`
   - `/show-trace`
3. Back those commands with **language model tools** for editor-aware actions and guard them with context conditions when appropriate.[^vscode-tools]

### Phase 2: unify MCP debugging

1. Register project MCP servers programmatically when helpful, so the extension can bootstrap the environment instead of requiring manual setup.[^vscode-mcp-guide][^mcp-sample]
2. Surface MCP **output logs**, **tool invocations**, **prompt arguments**, and **resources** in a dedicated tree view or panel.[^vscode-mcp-guide]
3. Lean on VS Code's existing MCP **development mode** for Node.js/Python servers instead of inventing a custom debug transport first.[^vscode-mcp-guide]
4. Treat the official **MCP Inspector** as an external companion or optional deep-link target for protocol-heavy investigations.[^mcp-inspector]

### Phase 3: unify plugin/extension debugging

1. Add commands that open or prepare the correct **Extension Development Host** and debug configuration for the relevant plugin/extension target.[^vscode-debugger-guide]
2. Where the workflow needs adapter-level visibility, integrate with the existing **debugger extension** model rather than building a new debugger stack.[^vscode-debugger-guide]
3. Correlate debug sessions with the instruction or agent run that triggered them.

### Phase 4: add traceability

1. Persist a run record for each instruction execution:
   - instruction text or identifier,
   - invoked participant/tool/prompt,
   - inputs,
   - outputs,
   - errors,
   - linked resources/logs.
2. Make failures navigable: from a failed run, jump directly to:
   - MCP output,
   - resource snapshots,
   - tool confirmation/input data,
   - relevant debug session.
3. Where possible, integrate with **Waza** instead of inventing a separate evaluation engine for skills.[^vscode-customizations][^waza]

## Suggested implementation boundary

The clean boundary appears to be:

- **Chat participant** = orchestration and UX entry point.[^vscode-chat]
- **Language model tools** = workspace/editor-aware actions.[^vscode-tools]
- **MCP servers** = reusable external tools, prompts, resources, and agent integrations.[^vscode-mcp-guide]
- **Debugger extension APIs / DAP** = process-level debugging for plugins/adapters when needed.[^vscode-debugger-guide]

That boundary matches the way VS Code itself separates responsibilities in the official docs.

## Recommendation

If your goal is specifically "**debug skills, agents, plugins, and instruction flows from one place inside VS Code**", I would treat this as a **new extension opportunity** rather than assuming an existing VS Code extension already solves it.

I would also avoid building a net-new protocol debugger first. The official sources suggest a better route:

1. use VS Code's built-in AI extension points,
2. reuse MCP's built-in debugging/logging support,
3. optionally link out to MCP Inspector for deep protocol inspection,
4. add the missing **unified workflow UX** on top.

## Why this note is in `docs/research/`

I did not find an existing repository convention specifically for research notes. The repo-level documentation convention places cross-repo material under the root `docs/` directory, so `docs/research/` is the most sensible location for this note.

---

[^vscode-ai-overview]: Microsoft, "AI extensibility in VS Code" — https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/ai/ai-extensibility-overview.md
[^vscode-customizations]: Microsoft, "Create and manage agent customizations" — https://github.com/microsoft/vscode-docs/blob/main/docs/agent-customization/overview.md
[^vscode-chat]: Microsoft, "Chat Participant API" — https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/ai/chat.md
[^vscode-chat-debug]: Microsoft, "Debug chat interactions" — https://github.com/microsoft/vscode-docs/blob/main/docs/agents/agent-troubleshooting/chat-debug-view.md
[^vscode-tools]: Microsoft, "Language Model Tool API" — https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/ai/tools.md
[^vscode-mcp-guide]: Microsoft, "MCP developer guide" — https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/ai/mcp.md
[^vscode-debugger-guide]: Microsoft, "Debugger Extension" — https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/debugger-extension.md
[^mcp-sample]: Microsoft, "MCP Extension sample" — https://github.com/microsoft/vscode-extension-samples/blob/main/mcp-extension-sample/README.md
[^mcp-inspector]: Model Context Protocol, "MCP Inspector" — https://github.com/modelcontextprotocol/inspector/blob/main/README.md
[^waza]: Microsoft, "Waza" — https://github.com/microsoft/waza/blob/main/README.md
