import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertDocument,
  commonMarkToHtml,
  htmlToCommonMark,
  markdownToJsonAst,
  jsonAstToMarkdown,
} from "../dist/convert/index.js";

describe("CommonMark Conversion System", () => {
  const sampleMarkdown = `# Document Title

This is a paragraph with **bold** and *italic* text.

> Important callout block

- Item one
- Item two

\`\`\`typescript
const x = 42;
\`\`\`
`;

  it("converts CommonMark to HTML and back with high fidelity", () => {
    const html = commonMarkToHtml(sampleMarkdown);
    assert.ok(html.includes("<h1>"));
    assert.ok(html.includes("<strong>bold</strong>"));
    assert.ok(html.includes("<blockquote"));

    const backToMd = htmlToCommonMark(html);
    assert.ok(backToMd.includes("# Document Title"));
    assert.ok(backToMd.includes("**bold**"));
    assert.ok(backToMd.includes("> Important callout block"));
  });

  it("converts CommonMark to JSON AST and reconstructs Markdown", () => {
    const ast = markdownToJsonAst(sampleMarkdown);
    assert.equal(ast.type, "root");
    assert.ok(ast.children.length > 0);

    const headingNode = ast.children.find((n) => n.type === "heading");
    assert.ok(headingNode);
    assert.equal(headingNode?.value, "Document Title");

    const codeNode = ast.children.find((n) => n.type === "code");
    assert.ok(codeNode);
    assert.equal(codeNode?.meta?.lang, "typescript");

    const reconstructed = jsonAstToMarkdown(ast);
    assert.ok(reconstructed.includes("# Document Title"));
    assert.ok(reconstructed.includes("```typescript"));
  });

  it("uses the universal conversion dispatcher to produce plain text", () => {
    const res = convertDocument(sampleMarkdown, {
      sourceFormat: "commonmark",
      targetFormat: "text",
    });

    assert.equal(res.success, true);
    assert.ok(res.result);
    assert.ok(res.result.includes("Document Title"));
    assert.ok(!res.result.includes("**bold**")); // markers stripped
    assert.ok(res.result.includes("bold"));
  });
});
