import { LocalFilePageStorage, findSection, parseSections } from "@pages/core";
import * as path from "node:path";
import * as os from "node:os";

export async function runRead(args: string[]): Promise<void> {
  const pageId = args[0];
  if (!pageId) {
    console.error("Usage: pages read <page-id> [--section <heading>] [--outline]");
    process.exit(1);
  }

  const storageDir = path.join(os.homedir(), ".copilot-pages");
  const storage = new LocalFilePageStorage(storageDir);

  const page = await storage.getPage(pageId);
  if (!page) {
    console.error(`Page "${pageId}" not found in ${storageDir}`);
    process.exit(1);
  }

  const sectionFlagIndex = args.indexOf("--section");
  if (sectionFlagIndex !== -1 && args[sectionFlagIndex + 1]) {
    const heading = args[sectionFlagIndex + 1];
    const section = findSection(page.content, heading);
    if (!section) {
      console.error(`Section "${heading}" not found in page "${pageId}".`);
      process.exit(1);
    }
    console.log(section.content);
    return;
  }

  if (args.includes("--outline")) {
    const sections = parseSections(page.content);
    console.log(`Sections in "${page.title}" (${sections.length}):`);
    for (const s of sections) {
      console.log(`  ${"  ".repeat(s.level - 1)}- ${s.heading} (level ${s.level})`);
    }
    return;
  }

  console.log(page.content);
}
