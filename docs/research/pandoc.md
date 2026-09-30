# Pandoc: Architecture, Pandoc Markdown, and CLI

## Overview & Core Purpose

**Pandoc** is a universal document converter designed by John MacFarlane, a
professor of philosophy at the University of California, Berkeley.[^pandoc-home][^macfarlane-bio]
Originally released in 2006, Pandoc solves the problem of translating documents
written in one markup format into another (e.g., Markdown, LaTeX, HTML, Docx,
EPUB, Org-mode, PDF, Typst, and dozens more).[^pandoc-manual-about]

Pandoc is widely considered the "Swiss-army knife" of text markup processing
because it avoids direct pair-wise format translations ($O(N^2)$ translators for
$N$ formats). Instead, it translates inputs through an intermediate **Abstract
Syntax Tree (AST)** ($O(N)$ readers and writers).[^pandoc-design][^pandoc-types]

---

## What is Pandoc Written In?

Pandoc is written in **Haskell** and compiled to native executables using the
**Glasgow Haskell Compiler (GHC)**.[^pandoc-github][^pandoc-hackage]

### Architecture & Key Components

1. **Haskell Implementation & Rationale**:
   - Haskell's strong static typing, algebraic data types (ADTs), and pattern
     matching make it ideally suited for compiler-like tasks: parsing tree
     structures, AST-to-AST transformations, and document tree serialization.[^pandoc-design]
   - The primary codebase is hosted at
     [`jgm/pandoc`](https://github.com/jgm/pandoc) on GitHub and distributed on
     Haskell’s Hackage package repository as
     [`pandoc`](https://hackage.haskell.org/package/pandoc).[^pandoc-github][^pandoc-hackage]

2. **The Intermediate AST (`pandoc-types`)**:
   - Pandoc decouples parsing from output generation through the `pandoc-types`
     package
     ([`Text.Pandoc.Definition`](https://hackage.haskell.org/package/pandoc-types/docs/Text-Pandoc-Definition.html)).[^pandoc-types]
   - A `Pandoc` document consists of `Meta` (metadata dictionary) and a sequence
     of `Block` elements.
   - Core block types include `Header`, `Para`, `Plain`, `CodeBlock`,
     `BlockQuote`, `OrderedList`, `BulletList`, `Table`, `Div`, and `RawBlock`.[^pandoc-types]
   - Core inline types include `Str`, `Emph`, `Strong`, `Strikeout`,
     `Superscript`, `Subscript`, `Code`, `Math`, `Link`, `Image`, `Span`, and
     `RawInline`.[^pandoc-types]

3. **Readers & Writers Pipeline**:
   - **Readers** (`Text.Pandoc.Readers.*`): Parse specific input syntaxes into
     the common Pandoc AST.[^pandoc-github-readers]
   - **Writers** (`Text.Pandoc.Writers.*`): Walk the AST and emit the target
     output syntax.[^pandoc-github-writers]

4. **Filters & Extensibility**:
   - **JSON / Stdio Filters**: Pandoc can dump its AST to JSON via `--to json`,
     stream it to an external process written in any language (Python, Node.js,
     Rust, Go), and parse back the modified JSON tree via `--from json`.[^pandoc-filters]
   - **Embedded Lua Engine (`--lua-filter`)**: Pandoc includes a
     high-performance embedded Lua interpreter (`pandoc-lua-engine` using Lua
     5.4 / HsLua). Lua filters manipulate AST nodes directly inside the Haskell
     runtime without the process spawn or JSON serialization overhead.[^pandoc-lua-filters]

---

## Pandoc Markdown

Pandoc Markdown (`markdown`) is an extended dialect of Markdown that
significantly expands John Gruber’s original syntax and John MacFarlane's own
[CommonMark](https://commonmark.org/) specification.[^pandoc-manual-markdown]

### Philosophy

Gruber's original 2004 Markdown was strictly oriented toward producing HTML
snippets for the web. Pandoc Markdown was created to support **formal
publishing, technical documentation, and academic workflows** across diverse
media (print books, academic papers, slides, e-books, and web pages).[^pandoc-manual-markdown]

Pandoc allows individual syntax extensions to be explicitly enabled
(`+extension`) or disabled (`-extension`), such as
`pandoc -f markdown-pipe_tables` or `pandoc -f commonmark_x` (CommonMark with
Pandoc extensions).[^pandoc-manual-extensions]

### Key Extensions and Syntactic Distinctions

1. **YAML Metadata Blocks**: Documents can begin or end with a YAML block
   demarcated by `---` and `---` (or `...`), defining title, author, date,
   abstract, bibliography paths, or arbitrary variables used by templates:[^pandoc-manual-yaml]
   ```yaml
   ---
   title: "A Comprehensive Guide"
   author: "Jane Doe"
   date: 2026-09-11
   geometry: margin=1in
   ---
   ```

2. **Mathematical Notation**: LaTeX math is written natively using single dollar
   signs for inline math (`$E=mc^2$`) and double dollar signs for display blocks
   (`$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`). Pandoc renders math
   to MathJax, KaTeX, WebTeX, MathML, or native LaTeX depending on writer flags.[^pandoc-manual-math]

3. **Citations and Bibliographies (`citeproc`)**: Pandoc provides first-class
   citation syntax:
   - `[@smith04]` $\rightarrow$ (Smith 2004)
   - `[-@smith04, pp. 33-35]` $\rightarrow$ (pp. 33–35)
   - `@smith04 [p. 33] says...` $\rightarrow$ Smith (2004, p. 33) says... When
     combined with `--citeproc`, Pandoc resolves keys against BibTeX, BibLaTeX,
     CSL-JSON, or EndNote files and applies CSL (Citation Style Language)
     formatting styles.[^pandoc-manual-citations]

4. **Footnotes**: Both reference-style notes
   (`Here is a claim.[^1]\n\n[^1]: Note text.`) and inline footnotes
   (`Here is a claim.^[Inline footnote text.]`) are supported.[^pandoc-manual-footnotes]

5. **Advanced Tables**: Pandoc supports four table syntaxes:
   - **Pipe tables** (`| Col 1 | Col 2 |`)
   - **Simple tables** (underlined header with space-delimited columns)
   - **Multiline tables** (allowing multi-line cells)
   - **Grid tables** (ASCII-art boxes using `+`, `-`, and `|`, supporting
     arbitrary block elements and column/row spans).[^pandoc-manual-tables]

6. **Fenced Divs and Bracketed Spans**: Provides generic structural containers
   without resorting to raw HTML:
   - Fenced Div:
     ```markdown
     ::: {.warning id="notice-1"} This is inside a warning container block. :::
     ```
   - Bracketed Span: `[This text is highlighted]{.highlight lang=en}`.[^pandoc-manual-divs-spans]

7. **Raw Attribute Syntax**: Target-specific code blocks or inline text can be
   passed through unaltered to a specific writer:
   - Inline: `` `\clearpage`{=latex} ``
   - Block:
     ````markdown
     ```{=html}
     <div class="custom-widget"></div>
     ```
     ````
   This ensures that target-specific code is cleanly dropped when generating
   other formats (e.g., LaTeX code won't bleed into EPUB output).[^pandoc-manual-raw]

8. **Fenced Code Attributes**: Code blocks accept attribute dictionaries:
   ````markdown
   ```python {.numberLines startFrom="1"}
   def hello():
       print("Hello from Pandoc")
   ```

   ```[^pandoc-manual-codeblocks]
   ```
   ````

---

## The Pandoc CLI

The command-line interface is executed via the `pandoc` binary.[^pandoc-manual-synopsis]

### Basic Syntax

```sh
pandoc [options] [input-files]
```

By default:

- If no input file is specified (or `-` is used), Pandoc reads from `stdin`.
- If no output file is specified via `-o`/`--output`, Pandoc writes to `stdout`.
- Input and output formats can be explicitly specified or inferred from file
  extensions.[^pandoc-manual-options]

### Core CLI Options

| Flag               | Long Option              | Description                                                                                                                                                    |
| :----------------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-f <format>`      | `--from=<format>`        | Input format (e.g., `markdown`, `docx`, `gfm`, `latex`, `html`). Extensions can be appended (e.g., `markdown+hard_line_breaks-smart`).[^pandoc-manual-options] |
| `-t <format>`      | `--to=<format>`          | Target format (e.g., `html5`, `latex`, `pdf`, `docx`, `epub3`, `typst`).[^pandoc-manual-options]                                                               |
| `-o <file>`        | `--output=<file>`        | Target output path. If the extension is `.pdf`, Pandoc automatically coordinates an external PDF engine.[^pandoc-manual-options]                               |
| `-s`               | `--standalone`           | Produce a complete standalone document with header and footer (using templates), rather than a document body fragment.[^pandoc-manual-options]                 |
| `-d <file>`        | `--defaults=<file>`      | Load configuration options from a reusable YAML defaults file.[^pandoc-manual-defaults]                                                                        |
| `-V <key>=<val>`   | `--variable=<key>:<val>` | Set template variables (e.g., `-V geometry:margin=1in -V theme:solarized`).[^pandoc-manual-options]                                                            |
| `-M <key>=<val>`   | `--metadata=<key>:<val>` | Set metadata fields in the document metadata tree.[^pandoc-manual-options]                                                                                     |
| `--citeproc`       |                          | Run the citation processing engine against bibliographies.[^pandoc-manual-citations]                                                                           |
| `--filter <cmd>`   |                          | Pipe the AST through an external JSON filter executable.[^pandoc-filters]                                                                                      |
| `--lua-filter <f>` |                          | Execute an in-process Lua filter script.[^pandoc-lua-filters]                                                                                                  |
| `--pdf-engine <e>` |                          | Select the PDF generation backend (`pdflatex`, `lualatex`, `xelatex`, `wkhtmltopdf`, `weasyprint`, `typst`).[^pandoc-manual-options]                           |
| `--template <f>`   |                          | Use a custom output template.[^pandoc-manual-templates]                                                                                                        |

### Common CLI Invocations

1. **Convert Markdown to Standalone HTML5**:
   ```sh
   pandoc -s -f markdown -t html5 input.md -o output.html
   ```

2. **Generate a Typeset PDF via XeLaTeX with Citations**:
   ```sh
   pandoc -s input.md --citeproc --bibliography=refs.bib --pdf-engine=xelatex -o paper.pdf
   ```

3. **Convert Word Docx to Clean CommonMark**:
   ```sh
   pandoc -f docx -t commonmark input.docx -o output.md
   ```

4. **Unix Pipeline / Stream Processing**:
   ```sh
   cat notes.md | pandoc -f markdown -t gfm | gzip > notes.gfm.gz
   ```

5. **Using a Defaults File (`pandoc -d project.yaml`)**: Pandoc allows
   consolidating extensive flags into reusable YAML configuration files:
   ````yaml
   from: markdown+yaml_metadata_block
   to: pdf
   pdf-engine: xelatex
   standalone: true
   citeproc: true
   bibliography:
     - references.bib
   variables:
     documentclass: article
     fontsize: 11pt
   ```[^pandoc-manual-defaults]
   ````

---

## Primary Sources & References

[^pandoc-home]: John MacFarlane, _Pandoc: a universal document converter_ —
    https://pandoc.org/

[^macfarlane-bio]: John MacFarlane, UC Berkeley Department of Philosophy Faculty
    Page — https://philosophy.berkeley.edu/people/detail/33

[^pandoc-manual-about]: Pandoc User's Guide: _About pandoc_ —
    https://pandoc.org/MANUAL.html

[^pandoc-design]: John MacFarlane, _Pandoc: Inside an Open Source Project_
    (Architecture & Design) — https://pandoc.org/

[^pandoc-github]: GitHub Repository: `jgm/pandoc` —
    https://github.com/jgm/pandoc

[^pandoc-hackage]: Hackage Package Repository: `pandoc` (Haskell package index)
    — https://hackage.haskell.org/package/pandoc

[^pandoc-types]: Hackage Package Repository: `pandoc-types`
    (`Text.Pandoc.Definition`) —
    https://hackage.haskell.org/package/pandoc-types

[^pandoc-github-readers]: Pandoc Source Tree: Readers —
    https://github.com/jgm/pandoc/tree/main/src/Text/Pandoc/Readers

[^pandoc-github-writers]: Pandoc Source Tree: Writers —
    https://github.com/jgm/pandoc/tree/main/src/Text/Pandoc/Writers

[^pandoc-filters]: Pandoc User's Guide: _Pandoc Filters_ —
    https://pandoc.org/filters.html

[^pandoc-lua-filters]: Pandoc User's Guide: _Lua Filters_ —
    https://pandoc.org/lua-filters.html

[^pandoc-manual-markdown]: Pandoc User's Guide: _Pandoc’s Markdown_ —
    https://pandoc.org/MANUAL.html#pandocs-markdown

[^pandoc-manual-extensions]: Pandoc User's Guide: _Extensions_ —
    https://pandoc.org/MANUAL.html#extensions

[^pandoc-manual-yaml]: Pandoc User's Guide: _Metadata Blocks (YAML)_ —
    https://pandoc.org/MANUAL.html#extension-yaml_metadata_block

[^pandoc-manual-math]: Pandoc User's Guide: _Math_ —
    https://pandoc.org/MANUAL.html#math

[^pandoc-manual-citations]: Pandoc User's Guide: _Citations_ —
    https://pandoc.org/MANUAL.html#citations

[^pandoc-manual-footnotes]: Pandoc User's Guide: _Footnotes_ —
    https://pandoc.org/MANUAL.html#footnotes

[^pandoc-manual-tables]: Pandoc User's Guide: _Tables_ —
    https://pandoc.org/MANUAL.html#tables

[^pandoc-manual-divs-spans]: Pandoc User's Guide: _Divs and Spans_ —
    https://pandoc.org/MANUAL.html#divs-and-spans

[^pandoc-manual-raw]: Pandoc User's Guide: _Raw HTML / TeX and raw attributes_ —
    https://pandoc.org/MANUAL.html#extension-raw_attribute

[^pandoc-manual-codeblocks]: Pandoc User's Guide: _Fenced Code Blocks_ —
    https://pandoc.org/MANUAL.html#fenced-code-blocks

[^pandoc-manual-synopsis]: Pandoc User's Guide: _Synopsis_ —
    https://pandoc.org/MANUAL.html#synopsis

[^pandoc-manual-options]: Pandoc User's Guide: _Options_ —
    https://pandoc.org/MANUAL.html#options

[^pandoc-manual-defaults]: Pandoc User's Guide: _Defaults Files_ —
    https://pandoc.org/MANUAL.html#defaults-files

[^pandoc-manual-templates]: Pandoc User's Guide: _Templates_ —
    https://pandoc.org/MANUAL.html#templates
