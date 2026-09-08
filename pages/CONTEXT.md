# Pages

Tools, libraries, model-context-protocol (MCP) servers, and viewer/editor interfaces that harness Microsoft 365 Copilot Pages capabilities while providing reliable document lifecycle and editing primitives.

## Language

### Documents & Structure

**Page**:
A persistent, collaborative canvas document created within Microsoft 365 Copilot backed by underlying fluid/loop storage.
_Avoid_: Canvas, Note, Copilot Note, Loop file

**OKF (Open Knowledge Format)**:
A single, self-contained document format uniting YAML frontmatter/blocks with CommonMark text, strictly avoiding sidecar files for text documents.
_Avoid_: Sidecar metadata, Split file, Property database

**Canonical Page**:
The designated authoritative version of a Page when iterative drafting or failure workarounds have produced duplicate or divergent copies.
_Avoid_: Master copy, Real page, Source of truth

**Section**:
A bounded structural unit of a Page demarcated by Markdown headings.
_Avoid_: Header block, Chapter, Segment

**Block**:
An addressable structural element within a Page, such as a paragraph, table, list item, or code fence.
_Avoid_: Chunk, Fragment, Node

### Editing & Operations

**Literal Replacement**:
An edit operation that substitutes targeted text using exact character-sequence or AST matching without generative regular expressions.
_Avoid_: Regex edit, Pattern replace, Fuzzy edit

**Section Replacement**:
An edit operation targeting the entirety of a named section from its heading to the subsequent heading of equal or higher level.
_Avoid_: Heading overwrite, Section wipe

**Atomic Edit**:
A modification transaction that either applies completely and verifies against the Page state or fails leaving the Page unaltered.
_Avoid_: Safe edit, Clean write

**Revision Identifier**:
A monotonic or cryptographic token representing the exact state of a Page, used to detect concurrent modifications and stale targets.
_Avoid_: Version number, ETag, Timestamp

### Conversion & Syntax Trees

**Document AST**:
A hierarchical abstract syntax tree structured according to the CommonMark specification representing a Page's headings, blocks, and inlines.
_Avoid_: Parse tree, DOM, Token list

**Converter**:
A bidirectional pipeline that transforms documents between the Document AST and external formats such as HTML, Loop markup, Word, or plain text.
_Avoid_: Translator, Exporter, Transpiler, Parser

**AST Transform**:
A deterministic visitor operation that inspects or mutates Document AST nodes before serialization.
_Avoid_: Middleware, Hook, Filter

