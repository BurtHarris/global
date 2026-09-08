# ADR 0001: Polyglot Multi-Package Architecture

## Status
Accepted

## Context
The `pages` project provides tools, libraries, MCP servers, and UI components to interact with M365 Copilot Pages. The project must support diverse user environments:
- Interactive Windows PowerShell sessions and system administration workflows.
- Python data science, notebook, and agent ecosystems (via `uv`).
- Standard TypeScript/Node MCP agent environments and web-based visual tooling.

## Decision
We organize `pages` as a polyglot monorepo:
1. An npm workspace at the root managing TypeScript packages:
   - `lib/`: Core CommonMark AST parsing, deterministic patching, and format conversion.
   - `mcp/`: Standard `@modelcontextprotocol/sdk` server.
   - `cli/`: Node-based CLI utility (`pages`).
   - `gui/`: Vite + React web viewer, editor, and diff tool.
2. A native PowerShell module in `pwsh/` (`Pages.psd1`/`Pages.psm1`) with Pester tests, providing direct shell pipeline cmdlets (`Get-CopilotPage`, `Set-CopilotPageSection`, `ConvertTo-CopilotPage`).
3. A Python package in `python/` configured with `pyproject.toml` and managed via `uv`, offering Python bindings, AST tools, and FastMCP server options.

All implementations share the same domain model (`CONTEXT.md`) and file storage specifications.

## Consequences
- Callers in PowerShell or Python can execute operations natively without cross-process Node overhead.
- AI agents in any MCP client (Claude, Copilot, Antigravity) can connect via either Node stdio MCP or Python FastMCP.
- Each language stack maintains its own idiomatic test suite (Pester for pwsh, pytest for Python, Node test runner for TypeScript).
