"""Storage adapters for Copilot Pages in Python adhering to UKF / OKF.

Mixed Markdown and YAML in a single self-contained file.
No sidecars for text documents.
"""

import re
from pathlib import Path
from typing import List, Optional, Dict, Any
from .types import Page


class LocalFilePageStorage:
    """Stores pages as single mixed YAML + Markdown files (UKF/OKF)."""

    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _page_path(self, page_id: str) -> Path:
        safe_id = "".join(c if c.isalnum() or c in "_-" else "_" for c in page_id)
        return self.base_dir / f"{safe_id}.md"

    def _parse_ukf(self, raw_content: str, fallback_id: str) -> Page:
        meta: Dict[str, Any] = {}
        body = raw_content

        match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$", raw_content)
        if match:
            fm_raw = match.group(1)
            body = match.group(2)

            for line in fm_raw.split("\n"):
                if ":" in line:
                    k, v = line.split(":", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if v == "true":
                        meta[k] = True
                    elif v == "false":
                        meta[k] = False
                    else:
                        meta[k] = v

        first_line = body.split("\n")[0] if body else ""
        title = meta.get(
            "title",
            first_line.lstrip("#").strip() if first_line.startswith("#") else fallback_id,
        )

        return Page(
            id=meta.get("id", fallback_id),
            title=title,
            content=body,
            revision_id=meta.get("revision", "rev-default"),
            updated_at=meta.get("updated_at", ""),
            is_canonical=meta.get("canonical", True),
            canonical_of=meta.get("canonical_of", []),
            metadata=meta,
        )

    def _serialize_ukf(self, page: Page) -> str:
        lines = [
            "---",
            f'id: "{page.id}"',
            f'title: "{page.title}"',
            f'revision: "{page.revision_id}"',
            f'updated_at: "{page.updated_at}"',
            f"canonical: {str(page.is_canonical).lower()}",
            "---",
            "",
            page.content,
        ]
        return "\n".join(lines)

    def get_page(self, page_id: str) -> Optional[Page]:
        p = self._page_path(page_id)
        if not p.exists():
            return None
        raw = p.read_text(encoding="utf-8")
        return self._parse_ukf(raw, page_id)

    def save_page(self, page: Page) -> None:
        p = self._page_path(page.id)
        serialized = self._serialize_ukf(page)
        p.write_text(serialized, encoding="utf-8")

    def list_pages(self) -> List[Page]:
        pages = []
        for p in self.base_dir.glob("*.md"):
            page = self.get_page(p.stem)
            if page:
                pages.append(page)
        return pages
