# Yeti

Document generation and publishing toolkit for Deno workflows, managing content
pipelines, metadata, templates, and cooperating with external tools such as
Pandoc.

## Language

### Core Domain

**Yeti**: The Deno-based document generation and publishing toolkit responsible
for content pipelines, metadata enrichment, templating, and external document
converter integration. _Avoid_: Task runner, Generic script engine, Build tool

**Document Pipeline**: A sequence of processing steps in Yeti that ingests
source documents, applies metadata/AST transformations, and emits rendered
targets. _Avoid_: Build step, Script pipeline, Job

### Converters & Execution

**Native Converter**: The built-in Deno conversion and rendering subsystem that
processes formats directly within the Yeti runtime without external binary
dependencies. _Avoid_: Built-in parser, Internal renderer

**Auxiliary Converter**: An external cooperating tool (specifically Pandoc)
invoked transparently when the Native Converter does not support a requested
format transformation. _Avoid_: Fallback binary, Secondary translator, Shell
tool

**Converter Conformance**: The verification discipline and automated test suite
validating that Document AST structures emitted by the Native Converter achieve
structural parity with transformations produced by the Auxiliary Converter.
_Avoid_: Integration test, Pandoc benchmark

### User Interface

**Yeti TUI**: The interactive terminal user interface embedded in Yeti,
architected with declarative component primitives (Ink / React in the terminal
with Yoga flexbox layout) for inspecting document trees, executing pipelines,
and navigating output formats. _Avoid_: CLI console, Shell viewer, Terminal
dashboard

**TUI Component**: A declarative TSX component that defines a terminal layout
element (such as a viewport, document sidebar, status bar, or diff pane) within
the Yeti TUI. _Avoid_: Terminal widget, Console control

**Nerd Font Glyphs**: Extended developer iconography (Nerd Fonts) utilized by
the Yeti TUI for rich status indicators, file types, and structural markers,
with automatic degradation to basic ASCII/Unicode. _Avoid_: Special icons,
Terminal font symbols, Custom emojis

**Neutral UI Description**: A framework- and target-agnostic declarative
specification of user interface layout, components, and interactions that can be
projected onto different rendering targets (such as the Yeti TUI via Ink, a web
DOM, or a document canvas). _Avoid_: Abstract widget tree, Virtual UI, Meta-DOM

**Dual-Mode Execution**: The operational capability of Yeti to function
headlessly via CLI commands or programmatic Deno library imports, or
interactively by launching the full TUI workbench when invoked without pipeline
arguments. _Avoid_: Split binary, Headless toggle

**Universal Component Primitive**: A target-neutral, declarative JSX/TSX element
(such as `<Box>`, `<Stack>`, `<DocumentPane>`, or `<Action>`) that expresses UI
layout and semantics without coupling to a concrete rendering host. _Avoid_:
Abstract widget, Generic tag, Neutral node

**UI Projector**: A rendering subsystem in Yeti that compiles or translates
Universal Component Primitives into a specific presentation host (e.g., Ink for
terminal output with Nerd Fonts, or HTML/CSS for web rendering). _Avoid_:
Renderer backend, UI compiler, Display driver

**AST-Component Bridge**: The translation layer that parses Pandoc/CommonMark
Document AST nodes (such as fenced divs, spans, and metadata) and hydrates them
into Universal Component Primitives. _Avoid_: AST converter, Node mapper
