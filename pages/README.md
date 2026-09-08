# Pages (`pages`)

A polyglot toolkit and conversion system designed to harness Microsoft 365 Copilot Pages capabilities while remedying editing failures and format lock-in documented in [DEF-PAGES-01](docs/defects/DEF-PAGES-01-edit-existing-pages-failures.md).

## Highlights & Objectives

- **Deterministic Editing Primitives**: In-place section replacement and literal character-sequence substitution completely avoiding `RegexParseException` and connection lockouts.
- **UKF / OKF Single-File Format**: Mixed YAML frontmatter and CommonMark body in a single self-contained file. Strictly **no sidecar files for text documents** (sidecars are reserved for binary assets like images).
- **CommonMark Conversion Engine**: Bidirectional conversions between M365 Copilot Canvas HTML, standard CommonMark, structured JSON AST, and plain text.
- **Polyglot Design**:
  - **TypeScript / Node**: Core engine (`lib/`), MCP server (`mcp/`), CLI (`cli/`), and Vite + React GUI studio (`gui/`).
  - **PowerShell**: Native module (`pwsh/Pages`) with pipeline cmdlets (`Get-CopilotPage`, `Set-CopilotPageLiteral`, `Set-CopilotPageSection`, `ConvertTo-CopilotPage`).
  - **Python**: Modular package (`python/`) with pure-Python AST parsing, patch engine, and FastMCP server.

## Repository Layout

```
pages/
├── CONTEXT.md                    <- Domain glossary (canonical terms & vocabulary)
├── README.md                     <- This document
├── package.json                  <- Node workspace root
├── tsconfig.base.json            <- Shared base TypeScript config
├── pyproject.toml                <- Root Python uv config
├── .gitignore                    <- Polyglot gitignore
│
├── docs/
│   ├── adr/                      <- Architecture Decision Records
│   │   ├── 0001-polyglot-workspace-architecture.md
│   │   ├── 0002-commonmark-ast-model.md
│   │   └── 0003-okf-document-format.md
│   └── defects/                  <- Upstream defect tracking
│       └── DEF-PAGES-01-edit-existing-pages-failures.md
│
├── lib/                          <- TypeScript Core Engine & Converter (@pages/core)
│   ├── src/                      <- AST parser, patcher, storage, converters
│   └── test/                     <- Node test runner suites
│
├── mcp/                          <- TypeScript Model Context Protocol Server (@pages/mcp)
│   └── src/                      <- McpServer over stdio transport
│
├── cli/                          <- Command-line interface (@pages/cli)
│   └── src/                      <- 'pages convert', 'pages read', 'pages edit'
│
├── gui/                          <- Web Studio & Visual AST Inspector (@pages/gui)
│   └── src/                      <- React + Vite interactive canvas & converter
│
├── pwsh/                         <- Native PowerShell Module (Pages)
│   ├── Pages.psd1                <- Module manifest
│   ├── Pages.psm1                <- Cmdlets: Get, Set, ConvertTo, ConvertFrom
│   └── Pages.Tests.ps1           <- Pester v6 test suite
│
└── python/                       <- Python Package (copilot-pages)
    ├── src/pages/                <- Types, AST parser, patcher, storage, FastMCP
    └── tests/                    <- Python test suites
```

## Running Tests

### 1. PowerShell Suite (Pester)
```powershell
Invoke-Pester D:\global\pages\pwsh\Pages.Tests.ps1
```

### 2. Python Suite (unittest)
```powershell
cd D:\global\pages\python
python -m unittest discover -s tests
```

### 3. TypeScript Suite
```powershell
cd D:\global\pages\lib
npm test
```
