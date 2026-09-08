import { DocumentAst, AstNode } from "../types.js";

/**
 * Converts a CommonMark document into a structured JSON DocumentAst.
 */
export function markdownToJsonAst(markdown: string): DocumentAst {
  const lines = markdown.split("\n");
  const children: AstNode[] = [];

  let inCodeFence = false;
  let codeFenceLang = "";
  let codeBuffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceLang = line.slice(3).trim();
        codeBuffer = [];
      } else {
        inCodeFence = false;
        children.push({
          type: "code",
          value: codeBuffer.join("\n"),
          meta: { lang: codeFenceLang },
        });
      }
      continue;
    }

    if (inCodeFence) {
      codeBuffer.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      children.push({
        type: "heading",
        level: headingMatch[1].length,
        value: headingMatch[2].trim(),
      });
      continue;
    }

    const calloutMatch = line.match(/^>\s*(.+)$/);
    if (calloutMatch) {
      children.push({
        type: "callout",
        value: calloutMatch[1].trim(),
      });
      continue;
    }

    const listMatch = line.match(/^([*\-+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      children.push({
        type: "listItem",
        value: listMatch[2].trim(),
        meta: { bullet: listMatch[1] },
      });
      continue;
    }

    if (line.trim().length > 0) {
      children.push({
        type: "paragraph",
        value: line.trim(),
      });
    }
  }

  return {
    type: "root",
    children,
  };
}

/**
 * Serializes a DocumentAst back into standard CommonMark.
 */
export function jsonAstToMarkdown(ast: DocumentAst): string {
  const parts: string[] = [];

  for (const node of ast.children) {
    switch (node.type) {
      case "heading": {
        const hashes = "#".repeat(node.level || 1);
        parts.push(`${hashes} ${node.value || ""}\n`);
        break;
      }
      case "code": {
        const lang = (node.meta?.lang as string) || "";
        parts.push(`\`\`\`${lang}\n${node.value || ""}\n\`\`\`\n`);
        break;
      }
      case "callout": {
        parts.push(`> ${node.value || ""}\n`);
        break;
      }
      case "listItem": {
        const bullet = (node.meta?.bullet as string) || "-";
        parts.push(`${bullet} ${node.value || ""}`);
        break;
      }
      case "paragraph": {
        parts.push(`${node.value || ""}\n`);
        break;
      }
      default: {
        if (node.value) parts.push(`${node.value}\n`);
      }
    }
  }

  return parts.join("\n").trim() + "\n";
}
