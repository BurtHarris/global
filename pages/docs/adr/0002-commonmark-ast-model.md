# ADR 0002: CommonMark-Based Document AST & Conversion Pipeline

## Status
Accepted

## Context
Microsoft 365 Copilot Pages updates fail frequently when agents or backend services attempt generative regular-expression replacements on Markdown content containing bold markers, brackets, and punctuation (`RegexParseException`). Furthermore, Pages content is often trapped in proprietary Loop or HTML representations that lose fidelity when converted to Word or Markdown.

## Decision
We adopt the **CommonMark specification** (with GitHub Flavored Markdown extensions for tables and tasklists) as our canonical internal Document AST:
1. All document modifications (section replacement, literal text replacement, block restructuring) target AST nodes rather than raw strings or regex patterns.
2. In-place section replacement calculates exact character or node boundaries by comparing heading levels, guaranteeing that content outside the targeted section is untouched.
3. Bidirectional converters translate between CommonMark AST and external representations (HTML/Loop Canvas, JSON AST, plain text, and Word).

## Consequences
- Regex parse errors are eliminated entirely because replacement boundaries are determined by deterministic AST walk or literal substring offsets.
- Documents can be imported from or exported to diverse formats (M365 HTML, CommonMark, JSON AST) with zero fidelity loss on Markdown constructs.
