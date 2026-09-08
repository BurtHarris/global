/**
 * Domain types for M365 Copilot Pages core engine and conversion pipeline.
 * Follows vocabulary defined in CONTEXT.md.
 */

export interface Page {
  id: string;
  title: string;
  content: string;
  revisionId: string;
  updatedAt: string;
  isCanonical: boolean;
  canonicalOf?: string[];
  metadata?: Record<string, unknown>;
}

export interface Section {
  heading: string;
  level: number;
  content: string;
  startIndex: number;
  endIndex: number;
  children?: Section[];
}

export interface Block {
  id: string;
  type: "paragraph" | "heading" | "code" | "table" | "list" | "callout" | "unknown";
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface LiteralEditOp {
  kind: "literal";
  targetText: string;
  replacementText: string;
  occurrenceIndex?: number; // 0-indexed, default is 0 if unique
}

export interface SectionEditOp {
  kind: "section";
  heading: string;
  newSectionContent: string;
}

export type EditOperation = LiteralEditOp | SectionEditOp;

export interface EditResult {
  success: boolean;
  page?: Page;
  error?: string;
  appliedChangeSummary?: string;
  matchIndex?: number;
}

export interface AstNode {
  type: string;
  level?: number;
  value?: string;
  children?: AstNode[];
  raw?: string;
  meta?: Record<string, unknown>;
}

export interface DocumentAst {
  type: "root";
  children: AstNode[];
}

export type ConversionFormat = "commonmark" | "html" | "json-ast" | "text";

export interface ConvertOptions {
  sourceFormat: ConversionFormat;
  targetFormat: ConversionFormat;
  title?: string;
}
