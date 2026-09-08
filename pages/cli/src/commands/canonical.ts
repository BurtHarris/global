import { LocalFilePageStorage } from "@pages/core";
import * as path from "node:path";
import * as os from "node:os";

export async function runCanonical(args: string[]): Promise<void> {
  const storageDir = path.join(os.homedir(), ".copilot-pages");
  const storage = new LocalFilePageStorage(storageDir);

  if (args[0] === "list" || args.length === 0) {
    const pages = await storage.listPages();
    console.log(`Available Pages in ${storageDir} (${pages.length}):\n`);
    for (const p of pages) {
      const tag = p.isCanonical ? "[CANONICAL]" : " [DUPLICATE]";
      console.log(`${tag} ${p.id.padEnd(20)} | ${p.title} (${p.updatedAt})`);
    }
    return;
  }

  if (args[0] === "set" && args[1]) {
    const canonicalId = args[1];
    const dups = args.slice(2);
    await storage.setCanonical(canonicalId, dups);
    console.log(`Page "${canonicalId}" set as canonical.`);
    if (dups.length > 0) {
      console.log(`Linked duplicates: ${dups.join(", ")}`);
    }
    return;
  }

  console.error("Usage: pages canonical [list | set <canonicalId> [duplicateIds...]]");
  process.exit(1);
}
