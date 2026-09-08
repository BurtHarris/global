"""Domain and AST types for Copilot Pages in Python."""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class Page:
    id: str
    title: str
    content: str
    revision_id: str
    updated_at: str
    is_canonical: bool = True
    canonical_of: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Section:
    heading: str
    level: int
    content: str
    start_index: int
    end_index: int


@dataclass
class EditResult:
    success: bool
    content: str
    page: Optional[Page] = None
    error: Optional[str] = None
    applied_change_summary: Optional[str] = None
    match_index: Optional[int] = None


@dataclass
class AstNode:
    type: str
    value: Optional[str] = None
    level: Optional[int] = None
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DocumentAst:
    type: str = "root"
    children: List[AstNode] = field(default_factory=list)
