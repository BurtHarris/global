import { ConvertOptions, DocumentAst } from "../types.js";
import { commonMarkToHtml, htmlToCommonMark } from "./html.js";
import { markdownToJsonAst, jsonAstToMarkdown } from "./json.js";
import { commonMarkToPlainText } from "./text.js";

export { commonMarkToHtml, htmlToCommonMark } from "./html.js";
export { markdownToJsonAst, jsonAstToMarkdown } from "./json.js";
export { commonMarkToPlainText } from "./text.js";

/**
 * Universal conversion dispatcher across CommonMark, HTML/Loop Canvas, JSON AST, and plain text.
 */
export function convertDocument(
  content: string,
  options: ConvertOptions
): { success: boolean; result?: string; ast?: DocumentAst; error?: string } {
  try {
    const { sourceFormat, targetFormat, title } = options;

    if (sourceFormat === targetFormat) {
      return { success: true, result: content };
    }

    // Step 1: Normalize source to CommonMark
    let commonMark: string;
    if (sourceFormat === "commonmark") {
      commonMark = content;
    } else if (sourceFormat === "html") {
      commonMark = htmlToCommonMark(content);
    } else if (sourceFormat === "json-ast") {
      const parsedAst: DocumentAst = JSON.parse(content);
      commonMark = jsonAstToMarkdown(parsedAst);
    } else {
      return { success: false, error: `Unsupported source format: ${sourceFormat}` };
    }

    // Step 2: Convert CommonMark to requested target
    if (targetFormat === "commonmark") {
      return { success: true, result: commonMark };
    } else if (targetFormat === "html") {
      return { success: true, result: commonMarkToHtml(commonMark, title) };
    } else if (targetFormat === "json-ast") {
      const ast = markdownToJsonAst(commonMark);
      return { success: true, result: JSON.stringify(ast, null, 2), ast };
    } else if (targetFormat === "text") {
      return { success: true, result: commonMarkToPlainText(commonMark) };
    } else {
      return { success: false, error: `Unsupported target format: ${targetFormat}` };
    }
  } catch (err) {
    return {
      success: false,
      error: `Conversion error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
