import * as fs from "node:fs/promises";
import { convertDocument, ConversionFormat } from "@pages/core";

export async function runConvert(args: string[]): Promise<void> {
  // Usage: pages convert <input-file> --to <target-format> [-o <output-file>]
  const inputFile = args[0];
  if (!inputFile) {
    console.error("Usage: pages convert <input-file> --to <commonmark|html|json-ast|text> [-o <output-file>]");
    process.exit(1);
  }

  let targetFormat: ConversionFormat = "commonmark";
  let outputFile: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--to" && args[i + 1]) {
      targetFormat = args[i + 1] as ConversionFormat;
      i++;
    } else if (args[i] === "-o" && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    }
  }

  const rawContent = await fs.readFile(inputFile, "utf-8");
  const ext = inputFile.split(".").pop()?.toLowerCase();
  let sourceFormat: ConversionFormat = "commonmark";
  if (ext === "html" || ext === "htm") sourceFormat = "html";
  if (ext === "json") sourceFormat = "json-ast";
  if (ext === "txt") sourceFormat = "text";

  const result = convertDocument(rawContent, {
    sourceFormat,
    targetFormat,
    title: inputFile,
  });

  if (!result.success || !result.result) {
    console.error("Conversion failed:", result.error);
    process.exit(1);
  }

  if (outputFile) {
    await fs.writeFile(outputFile, result.result, "utf-8");
    console.log(`Converted "${inputFile}" (${sourceFormat}) -> "${outputFile}" (${targetFormat})`);
  } else {
    process.stdout.write(result.result);
  }
}
