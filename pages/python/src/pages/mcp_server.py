"""FastMCP / Python MCP server for Copilot Pages."""

import os
from pathlib import Path
from .storage import LocalFilePageStorage
from .patch import apply_atomic_edit
from .ast import find_section, parse_sections
from .convert import convert


def create_mcp_server():
    """Builds an MCP server instance using the official mcp python package if available."""
    try:
        from mcp.server.fastmcp import FastMCP

        storage_dir = Path.home() / ".copilot-pages"
        storage = LocalFilePageStorage(storage_dir)

        mcp = FastMCP("copilot-pages-python")

        @mcp.tool()
        def pages_read(page_id: str, section_heading: str = None) -> str:
            """Read full page content or a section by heading title."""
            page = storage.get_page(page_id)
            if not page:
                return f"Error: Page '{page_id}' not found."
            if section_heading:
                sec = find_section(page.content, section_heading)
                if not sec:
                    return f"Error: Section '{section_heading}' not found in '{page_id}'."
                return sec.content
            return page.content

        @mcp.tool()
        def pages_replace_literal(page_id: str, target_text: str, replacement_text: str) -> str:
            """Replace an exact string passage without regular expressions."""
            page = storage.get_page(page_id)
            if not page:
                return f"Error: Page '{page_id}' not found."
            res = apply_atomic_edit(page, "literal", target_text, replacement_text)
            if not res.success or not res.page:
                return f"Error: {res.error}"
            storage.save_page(res.page)
            return f"Success: {res.applied_change_summary}. Revision: {res.page.revision_id}"

        @mcp.tool()
        def pages_replace_section(page_id: str, heading: str, new_section_content: str) -> str:
            """Replace an entire bounded section by heading without regex matching."""
            page = storage.get_page(page_id)
            if not page:
                return f"Error: Page '{page_id}' not found."
            res = apply_atomic_edit(page, "section", heading, new_section_content)
            if not res.success or not res.page:
                return f"Error: {res.error}"
            storage.save_page(res.page)
            return f"Success: {res.applied_change_summary}. Revision: {res.page.revision_id}"

        @mcp.tool()
        def pages_convert(content: str, source_format: str, target_format: str) -> str:
            """Convert document between CommonMark, HTML, JSON AST, and plain text."""
            return convert(content, source_format, target_format)

        return mcp

    except ImportError:
        return None


if __name__ == "__main__":
    server = create_mcp_server()
    if server:
        server.run()
    else:
        print("MCP SDK not installed. Run with: uv run --with mcp python -m pages.mcp_server")
