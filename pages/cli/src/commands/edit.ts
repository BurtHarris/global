import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { LocalFilePageStorage, applyAtomicEdit } from "@pages/core";

export async function runEdit(args: string[]): Promise<void> {
  // Usage:
  // pages edit <page-id> --literal --find <target> --replace <replacement>
  // pages edit <page-id> --section --heading <heading> --file <new-content.md>
  const pageId = args[0];
  if (!pageId) {
    console.error("Usage: pages edit <page-id> [--literal | --section] [options]");
    process.exit(1);
  }

  const storageDir = path.join(os.homedir(), ".copilot-pages");
  const storage = new LocalFilePageStorage(storageDir);

  const page = await storage.getPage(pageId);
  if (!page) {
    console.error(`Page "${pageId}" not found in ${storageDir}`);
    process.exit(1);
  }

  if (args.includes("--literal")) {
    const findIdx = args.indexOf("--find");
    const replaceIdx = args.indexOf("--replace");

    if (findIdx === -1 || !args[findIdx + 1] || replaceIdx === -1 || !args[replaceIdx + 1]) {
      console.error("Error: --find <target> and --replace <replacement> are required for literal edits.");
      process.exit(1);
    }

    const targetText = args[findIdx + 1];
    const replacementText = args[replaceIdx + 1];

    const result = applyAtomicEdit(page, {
      kind: "literal",
      targetText,
      replacementText,
    });

    if (!result.success || !result.page) {
      console.error("Edit failed:", result.error);
      process.exit(1);
    }

    await storage.savePage(result.page);
    console.log(`Success: ${result.appliedChangeSummary}`);
    console.log(`New Revision: ${result.page.revisionId}`);
    return;
  }

  if (args.includes("--section")) {
    const headingIdx = args.indexOf("--heading");
    const fileIdx = args.indexOf("--file");

    if (headingIdx === -1 || !args[headingIdx + 1] || fileIdx === -1 || !args[fileIdx + 1]) {
      console.error("Error: --heading <heading> and --file <content.md> are required for section edits.");
      process.exit(1);
    }

    const heading = args[headingIdx + 1];
    const filePath = args[fileIdx + 1];
    const newContent = await fs.readFile(filePath, "utf-8");

    const result = applyAtomicEdit(page, {
      kind: "section",
      heading,
      newSectionContent: newContent,
    });

    if (!result.success || !result.page) {
      console.error("Edit failed:", result.error);
      process.exit(1);
    }

    await storage.savePage(result.page);
    console.log(`Success: ${result.appliedChangeSummary}`);
    console.log(`New Revision: ${result.page.revisionId}`);
    return;
  }

  console.error("Must specify either --literal or --section.");
  process.exit(1);
}
