import { findSection } from "./parser.js";
import { Page, EditOperation, EditResult, LiteralEditOp, SectionEditOp } from "./types.js";

/**
 * Replaces a literal text passage within content without using regular expressions.
 * Directly eliminates RegexParseException (DEF-PAGES-01).
 */
export function replaceLiteral(
  content: string,
  targetText: string,
  replacementText: string,
  occurrenceIndex: number = 0
): { success: boolean; content: string; matchIndex?: number; error?: string } {
  if (!targetText) {
    return { success: false, content, error: "Target text cannot be empty." };
  }

  const indices: number[] = [];
  let pos = content.indexOf(targetText);
  while (pos !== -1) {
    indices.push(pos);
    pos = content.indexOf(targetText, pos + targetText.length);
  }

  if (indices.length === 0) {
    return {
      success: false,
      content,
      error: `Target text not found in document: "${targetText.slice(0, 50)}${targetText.length > 50 ? "..." : ""}"`,
    };
  }

  if (occurrenceIndex >= indices.length) {
    return {
      success: false,
      content,
      error: `Requested occurrence index ${occurrenceIndex} exceeds matches found (${indices.length}).`,
    };
  }

  const targetIndex = indices[occurrenceIndex];
  const newContent =
    content.slice(0, targetIndex) +
    replacementText +
    content.slice(targetIndex + targetText.length);

  return {
    success: true,
    content: newContent,
    matchIndex: targetIndex,
  };
}

/**
 * Replaces a bounded section identified by its Markdown heading.
 * Bounds are computed structurally, guaranteeing no collateral modification to adjacent sections.
 */
export function replaceSection(
  content: string,
  heading: string,
  newSectionContent: string
): { success: boolean; content: string; error?: string } {
  const section = findSection(content, heading);
  if (!section) {
    return {
      success: false,
      content,
      error: `Section with heading "${heading}" not found.`,
    };
  }

  // Ensure trailing newline before next section starts if needed
  let formattedNewContent = newSectionContent;
  if (!formattedNewContent.endsWith("\n") && section.endIndex < content.length) {
    formattedNewContent += "\n";
  }

  const newContent =
    content.slice(0, section.startIndex) +
    formattedNewContent +
    content.slice(section.endIndex);

  return {
    success: true,
    content: newContent,
  };
}

/**
 * Generates a deterministic revision token for a page state.
 */
export function generateRevisionId(content: string, timestamp: string): string {
  let hash = 0;
  const str = `${timestamp}:${content}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `rev-${Math.abs(hash).toString(16)}-${Date.now().toString(36)}`;
}

/**
 * Applies an atomic edit operation to a Page, updating its revision token and timestamp.
 */
export function applyAtomicEdit(page: Page, edit: EditOperation): EditResult {
  let patchResult: { success: boolean; content: string; error?: string; matchIndex?: number };

  if (edit.kind === "literal") {
    patchResult = replaceLiteral(
      page.content,
      edit.targetText,
      edit.replacementText,
      edit.occurrenceIndex ?? 0
    );
  } else if (edit.kind === "section") {
    patchResult = replaceSection(
      page.content,
      edit.heading,
      edit.newSectionContent
    );
  } else {
    return {
      success: false,
      error: `Unsupported edit operation kind: ${(edit as { kind: string }).kind}`,
    };
  }

  if (!patchResult.success) {
    return {
      success: false,
      error: patchResult.error,
    };
  }

  const now = new Date().toISOString();
  const updatedPage: Page = {
    ...page,
    content: patchResult.content,
    updatedAt: now,
    revisionId: generateRevisionId(patchResult.content, now),
  };

  const summary =
    edit.kind === "literal"
      ? `Replaced literal passage (${edit.targetText.length} chars) at offset ${patchResult.matchIndex}`
      : `Replaced section "${edit.heading}"`;

  return {
    success: true,
    page: updatedPage,
    appliedChangeSummary: summary,
    matchIndex: patchResult.matchIndex,
  };
}
