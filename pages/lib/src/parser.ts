import { Section, Block } from "./types.js";

/**
 * Parses markdown content into a list of bounded sections.
 * Each section extends from its heading line until the next heading of equal or higher level,
 * or the end of the document.
 */
export function parseSections(markdown: string): Section[] {
  const headingRegex = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/gm;
  const rawHeadings: { level: number; title: string; index: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown)) !== null) {
    rawHeadings.push({
      level: match[1].length,
      title: match[2].trim(),
      index: match.index,
    });
  }

  if (rawHeadings.length === 0) {
    return [];
  }

  const sections: Section[] = [];

  for (let i = 0; i < rawHeadings.length; i++) {
    const current = rawHeadings[i];
    let endIndex = markdown.length;

    // Find the next heading of equal or higher level (lower or equal numerical level)
    for (let j = i + 1; j < rawHeadings.length; j++) {
      if (rawHeadings[j].level <= current.level) {
        endIndex = rawHeadings[j].index;
        break;
      }
    }

    sections.push({
      heading: current.title,
      level: current.level,
      startIndex: current.index,
      endIndex,
      content: markdown.slice(current.index, endIndex),
    });
  }

  return sections;
}

/**
 * Locates a section by heading title (case-insensitive search).
 */
export function findSection(markdown: string, heading: string): Section | null {
  const sections = parseSections(markdown);
  const normalizedTarget = heading.trim().toLowerCase();
  return (
    sections.find(
      (s) => s.heading.trim().toLowerCase() === normalizedTarget
    ) || null
  );
}

/**
 * Parses markdown content into addressable structural blocks.
 */
export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split("\n");
  let currentIndex = 0;
  let blockCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineLen = line.length + (i < lines.length - 1 ? 1 : 0);

    if (trimmed.length > 0) {
      let type: Block["type"] = "paragraph";
      if (trimmed.startsWith("#")) {
        type = "heading";
      } else if (trimmed.startsWith("```")) {
        type = "code";
      } else if (trimmed.startsWith("|")) {
        type = "table";
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
        type = "list";
      } else if (trimmed.startsWith(">")) {
        type = "callout";
      }

      blocks.push({
        id: `block-${++blockCounter}`,
        type,
        content: line,
        startIndex: currentIndex,
        endIndex: currentIndex + line.length,
      });
    }

    currentIndex += lineLen;
  }

  return blocks;
}
