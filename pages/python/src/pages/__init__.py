"""Copilot Pages Python Package."""

from .types import Page, Section, EditResult, DocumentAst, AstNode
from .ast import parse_sections, find_section, parse_document_ast
from .patch import replace_literal, replace_section, apply_atomic_edit
from .convert import convert, commonmark_to_html, html_to_commonmark
from .storage import LocalFilePageStorage

__all__ = [
    "Page",
    "Section",
    "EditResult",
    "DocumentAst",
    "AstNode",
    "parse_sections",
    "find_section",
    "parse_document_ast",
    "replace_literal",
    "replace_section",
    "apply_atomic_edit",
    "convert",
    "commonmark_to_html",
    "html_to_commonmark",
    "LocalFilePageStorage",
]
