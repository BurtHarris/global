#!/usr/bin/env node
import { runConvert } from "./commands/convert.js";
import { runRead } from "./commands/read.js";
import { runEdit } from "./commands/edit.js";
import { runCanonical } from "./commands/canonical.js";

async function main() {
  const [subcommand, ...args] = process.argv.slice(2);

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    printHelp();
    process.exit(0);
  }

  switch (subcommand) {
    case "convert":
      await runConvert(args);
      break;
    case "read":
      await runRead(args);
      break;
    case "edit":
      await runEdit(args);
      break;
    case "canonical":
      await runCanonical(args);
      break;
    default:
      console.error(`Unknown command: ${subcommand}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
pages — M365 Copilot Pages CLI & CommonMark Conversion Tool

Usage:
  pages convert <file> --to <commonmark|html|json-ast|text> [-o <out>]
  pages read <page-id> [--section <heading>] [--outline]
  pages edit <page-id> --literal --find <target> --replace <replacement>
  pages edit <page-id> --section --heading <heading> --file <content.md>
  pages canonical list
  pages canonical set <canonicalId> [duplicateIds...]
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
