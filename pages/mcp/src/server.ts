import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LocalFilePageStorage, PageStorageAdapter } from "@pages/core";
import { handleReadPage } from "./tools/read.js";
import { handleReplaceLiteral, handleReplaceSection } from "./tools/edit.js";
import { handleConvert } from "./tools/convert.js";
import { handleListPages, handleSetCanonical } from "./tools/canonical.js";
import * as path from "node:path";
import * as os from "node:os";

export function createServer(customStorage?: PageStorageAdapter) {
  const defaultDir = path.join(os.homedir(), ".copilot-pages");
  const storage = customStorage || new LocalFilePageStorage(defaultDir);

  const server = new McpServer({
    name: "pages-mcp",
    version: "0.1.0",
  });

  // Tool: pages_read
  server.tool(
    "pages_read",
    "Read full page content, a specific section by heading, or list section outlines",
    {
      pageId: z.string().describe("Identifier of the page to read"),
      sectionHeading: z.string().optional().describe("Optional heading of a section to read"),
      listSectionsOnly: z.boolean().optional().describe("If true, returns only the outline of headings"),
    },
    async (args) => handleReadPage(storage, args)
  );

  // Tool: pages_replace_literal
  server.tool(
    "pages_replace_literal",
    "Replace a passage of text using exact character matching without regular expressions",
    {
      pageId: z.string().describe("Identifier of the page to edit"),
      targetText: z.string().describe("Exact text to search and replace"),
      replacementText: z.string().describe("New text to insert in place"),
      occurrenceIndex: z.number().optional().describe("Match index if targetText appears multiple times (0-indexed)"),
    },
    async (args) => handleReplaceLiteral(storage, args)
  );

  // Tool: pages_replace_section
  server.tool(
    "pages_replace_section",
    "Replace an entire bounded section identified by its Markdown heading title",
    {
      pageId: z.string().describe("Identifier of the page to edit"),
      heading: z.string().describe("Heading text of the section to replace"),
      newSectionContent: z.string().describe("Complete new content for the section including heading"),
    },
    async (args) => handleReplaceSection(storage, args)
  );

  // Tool: pages_convert
  server.tool(
    "pages_convert",
    "Convert a document between CommonMark, M365 Canvas HTML, JSON AST, and plain text",
    {
      pageId: z.string().optional().describe("Optional page ID to convert directly from storage"),
      rawContent: z.string().optional().describe("Raw string content to convert if pageId is omitted"),
      sourceFormat: z.enum(["commonmark", "html", "json-ast", "text"]).optional().describe("Source format (default: commonmark)"),
      targetFormat: z.enum(["commonmark", "html", "json-ast", "text"]).describe("Desired output format"),
    },
    async (args) => handleConvert(storage, args)
  );

  // Tool: pages_list
  server.tool(
    "pages_list",
    "List all available pages, their canonical status, and revision timestamps",
    {},
    async () => handleListPages(storage)
  );

  // Tool: pages_set_canonical
  server.tool(
    "pages_set_canonical",
    "Designate a page as the authoritative canonical version and link duplicate workaround drafts",
    {
      canonicalId: z.string().describe("Identifier of the canonical page"),
      duplicateIds: z.array(z.string()).optional().describe("Identifiers of duplicate pages created as workarounds"),
    },
    async (args) => handleSetCanonical(storage, args)
  );

  return server;
}

export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("pages-mcp server running on stdio");
}
