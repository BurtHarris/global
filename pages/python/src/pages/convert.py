"""CommonMark format conversion pipeline for Copilot Pages in Python."""

import re
import json
from .ast import parse_document_ast
from .types import DocumentAst


def commonmark_to_html(markdown: str) -> str:
    """Convert CommonMark to HTML matching M365 Copilot Canvas markup."""
    lines = markdown.split("\n")
    html_lines = []

    for line in lines:
        if line.startswith("# "):
            html_lines.append(f"<h1>{line[2:].strip()}</h1>")
        elif line.startswith("## "):
            html_lines.append(f"<h2>{line[3:].strip()}</h2>")
        elif line.startswith("### "):
            html_lines.append(f"<h3>{line[4:].strip()}</h3>")
        elif line.startswith("> "):
            html_lines.append(f"<blockquote>{line[2:].strip()}</blockquote>")
        elif line.startswith("- "):
            html_lines.append(f"<li>{line[2:].strip()}</li>")
        elif line.strip():
            # Inlines
            p = line.strip()
            p = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", p)
            p = re.sub(r"\*(.+?)\*", r"<em>\1</em>", p)
            html_lines.append(f"<p>{p}</p>")

    return "\n".join(html_lines)


def html_to_commonmark(html: str) -> str:
    """Convert M365 Canvas HTML into clean CommonMark."""
    md = html
    md = re.sub(r"<h1[^>]*>(.*?)</h1>", r"\n# \1\n", md, flags=re.IGNORECASE)
    md = re.sub(r"<h2[^>]*>(.*?)</h2>", r"\n## \1\n", md, flags=re.IGNORECASE)
    md = re.sub(r"<h3[^>]*>(.*?)</h3>", r"\n### \1\n", md, flags=re.IGNORECASE)
    md = re.sub(r"<blockquote[^>]*>(.*?)</blockquote>", r"\n> \1\n", md, flags=re.IGNORECASE)
    md = re.sub(r"<p[^>]*>(.*?)</p>", r"\n\1\n", md, flags=re.IGNORECASE)
    md = re.sub(r"<strong[^>]*>(.*?)</strong>", r"**\1**", md, flags=re.IGNORECASE)
    md = re.sub(r"<em[^>]*>(.*?)</em>", r"*\1*", md, flags=re.IGNORECASE)
    md = re.sub(r"<li[^>]*>(.*?)</li>", r"- \1\n", md, flags=re.IGNORECASE)
    md = re.sub(r"<[^>]+>", "", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip() + "\n"


def convert(content: str, source: str, target: str) -> str:
    """Universal conversion dispatcher for Python."""
    if source == target:
        return content

    # Normalize to commonmark
    if source == "commonmark":
        cm = content
    elif source == "html":
        cm = html_to_commonmark(content)
    else:
        raise ValueError(f"Unsupported source format: {source}")

    # Emit to target
    if target == "commonmark":
        return cm
    elif target == "html":
        return commonmark_to_html(cm)
    elif target == "json-ast":
        ast = parse_document_ast(cm)
        return json.dumps({"type": ast.type, "children": [vars(c) for c in ast.children]}, indent=2)
    elif target == "text":
        return re.sub(r"[#*`_>]", "", cm).strip()
    else:
        raise ValueError(f"Unsupported target format: {target}")
