"""Deterministic patch engine for Copilot Pages in Python.

Directly remedies RegexParseException and connection lockouts from DEF-PAGES-01.
"""

from typing import Tuple, Optional
from .ast import find_section
from .types import Page, EditResult


def replace_literal(
    content: str,
    target_text: str,
    replacement_text: str,
    occurrence_index: int = 0,
) -> Tuple[bool, str, Optional[int], Optional[str]]:
    """Replace an exact character-sequence target without regular expressions."""
    if not target_text:
        return False, content, None, "Target text cannot be empty."

    indices = []
    start = 0
    while True:
        pos = content.find(target_text, start)
        if pos == -1:
            break
        indices.append(pos)
        start = pos + len(target_text)

    if not indices:
        return False, content, None, f"Target text not found in document: '{target_text[:40]}...'"

    if occurrence_index >= len(indices):
        return (
            False,
            content,
            None,
            f"Occurrence index {occurrence_index} exceeds matches found ({len(indices)}).",
        )

    target_idx = indices[occurrence_index]
    new_content = (
        content[:target_idx] + replacement_text + content[target_idx + len(target_text):]
    )

    return True, new_content, target_idx, None


def replace_section(
    content: str,
    heading: str,
    new_section_content: str,
) -> Tuple[bool, str, Optional[str]]:
    """Replace a bounded section by heading without regex matching."""
    sec = find_section(content, heading)
    if not sec:
        return False, content, f"Section with heading '{heading}' not found."

    formatted_new_content = new_section_content
    if not formatted_new_content.endswith("\n") and sec.end_index < len(content):
        formatted_new_content += "\n"

    new_content = (
        content[:sec.start_index] + formatted_new_content + content[sec.end_index:]
    )

    return True, new_content, None


def apply_atomic_edit(
    page: Page,
    kind: str,
    target: str,
    replacement: str,
    occurrence_index: int = 0,
) -> EditResult:
    """Apply an atomic edit operation to a Page, updating its revision token."""
    if kind == "literal":
        success, new_content, idx, err = replace_literal(
            page.content, target, replacement, occurrence_index
        )
        summary = f"Replaced literal text at offset {idx}"
    elif kind == "section":
        success, new_content, err = replace_section(page.content, target, replacement)
        idx = None
        summary = f"Replaced section '{target}'"
    else:
        return EditResult(success=False, content=page.content, error=f"Unknown edit kind '{kind}'")

    if not success:
        return EditResult(success=False, content=page.content, error=err)

    import time
    now_ts = str(time.time())
    new_rev = f"rev-py-{abs(hash(new_content))}-{int(time.time())}"

    updated_page = Page(
        id=page.id,
        title=page.title,
        content=new_content,
        revision_id=new_rev,
        updated_at=now_ts,
        is_canonical=page.is_canonical,
        canonical_of=page.canonical_of,
        metadata=page.metadata,
    )

    return EditResult(
        success=True,
        content=new_content,
        page=updated_page,
        applied_change_summary=summary,
        match_index=idx,
    )
