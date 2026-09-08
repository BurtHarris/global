"""Markdown AST and section parser for Copilot Pages."""

import re
from typing import List, Optional
from .types import Section, DocumentAst, AstNode


def parse_sections(markdown: str) -> List[Section]:
    """Parse markdown content into bounded sections delimited by headings."""
    heading_pattern = re.compile(r"^(#{1,6})\s+(.+?)(?:\s+#+)?$", re.MULTILINE)
    raw_headings = []

    for match in heading_pattern.finditer(markdown):
        raw_headings.push({
            "level": len(match.group(1)),
            "title": match.group(2).strip(),
            "index": match.start(),
        }) if hasattr(raw_headings, "push") else raw_headings.append({
            "level": len(match.group(1)),
            "title": match.group(2).strip(),
            "index": match.start(),
        })

    if not raw_headings:
        return []

    sections: List[Section] = []
    total_len = len(markdown)

    for i, current in enumerate(raw_headings):
        end_index = total_len
        for j in range(i + 1, len(raw_headings)):
            if raw_headings[j]["level"] <= current["level"]:
                end_index = raw_headings[j]["index"]
                break

        sections.append(
            Section(
                heading=current["title"],
                level=current["level"],
                start_index=current["index"],
                end_index=end_index,
                content=markdown[current["index"]:end_index],
            )
        )

    return sections


def find_section(markdown: str, heading: str) -> Optional[Section]:
    """Find a section by case-insensitive heading."""
    target = heading.strip().lower()
    for s in parse_sections(markdown):
        if s.heading.strip().lower() == target:
            return s
    return None


def parse_document_ast(markdown: str) -> DocumentAst:
    """Parse markdown into a DocumentAst structure."""
    lines = markdown.split("\n")
    children: List[AstNode] = []

    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            continue

        heading_m = re.match(r"^(#{1,6})\s+(.+)$", trimmed)
        if heading_m:
            children.append(
                AstNode(type="heading", level=len(heading_m.group(1)), value=heading_m.group(2).strip())
            )
            continue

        if trimmed.startswith("```"):
            children.append(AstNode(type="code", value=trimmed))
            continue

        if trimmed.startswith(">"):
            children.append(AstNode(type="callout", value=trimmed[1:].strip()))
            continue

        if re.match(r"^([*\-+]|\d+\.)\s+", trimmed):
            children.append(AstNode(type="listItem", value=trimmed))
            continue

        children.append(AstNode(type="paragraph", value=trimmed))

    return DocumentAst(children=children)
