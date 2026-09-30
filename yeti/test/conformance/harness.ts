/**
 * harness.ts — dax-powered Conformance Test Harness for Yeti.
 *
 * Compares transformations from Yeti's Native Converter against Pandoc (Auxiliary Converter).
 * Powered by @david/dax subprocess pipelines and AST normalization.
 */

import $ from "@david/dax";
import { parsePandocJson, stringifyPandocJson } from "@guild/pandoc/ast";
import type {
  PandocAttr,
  PandocBlock,
  PandocCell,
  PandocDocument,
  PandocInline,
  PandocTableBody,
} from "@guild/pandoc/ast";
import { parseToAst } from "../../src/converter.ts";

export interface ConformanceResult {
  fixtureName: string;
  matched: boolean;
  breadcrumb?: string;
  actualSnippet?: string;
  expectedSnippet?: string;
  source: "live-pandoc" | "cached-golden";
  durationMs: number;
}

/**
 * Check if the host has pandoc available on PATH.
 */
export async function isPandocAvailable(): Promise<boolean> {
  const binary = await $.which("pandoc");
  return binary !== undefined;
}

/**
 * Execute host Pandoc CLI using dax streaming pipes to obtain JSON AST.
 */
export async function runPandocCli(
  markdown: string,
  reader = "markdown",
): Promise<PandocDocument> {
  const rawJson = await $`pandoc -f ${reader} -t json`
    .stdinText(markdown)
    .text();
  return parsePandocJson(rawJson);
}

/**
 * Normalize AST volatile fields so comparison focuses on structural block and inline parity:
 *  - API version normalized to [1, 23, 1]
 *  - Metadata values (MetaInlines string sequences normalized to MetaString)
 *  - Table cell alignment (defaulting to AlignDefault when specified at column level)
 *  - List item wrapping (normalizing single Plain vs Para in tight lists)
 */
export function normalizeAst(doc: PandocDocument): PandocDocument {
  const normalized: PandocDocument = {
    "pandoc-api-version": [1, 23, 1],
    meta: {},
    blocks: normalizeBlocks(doc.blocks || []),
  };

  // Normalize metadata values and sort keys for deterministic comparison
  if (doc.meta) {
    const sortedKeys = Object.keys(doc.meta).sort();
    for (const key of sortedKeys) {
      const val = doc.meta[key];
      if (val.t === "MetaInlines") {
        // Extract plain string from inline sequence
        const text = val.c
          .map((i) => (i.t === "Str" ? i.c : i.t === "Space" ? " " : ""))
          .join("");
        normalized.meta[key] = { t: "MetaString", c: text };
      } else {
        normalized.meta[key] = val;
      }
    }
  }

  return normalized;
}

function normalizeBlocks(blocks: PandocBlock[]): PandocBlock[] {
  return blocks.map((block) => {
    if (block.t === "Header") {
      const [level, attr, inlines] = block.c;
      return {
        t: "Header",
        c: [
          level,
          [attr[0] || "", attr[1] || [], attr[2] || []],
          normalizeInlines(inlines),
        ],
      };
    }
    if (block.t === "Para") {
      return { t: "Para", c: normalizeInlines(block.c) };
    }
    if (block.t === "Plain") {
      return { t: "Plain", c: normalizeInlines(block.c) };
    }
    if (block.t === "BlockQuote") {
      return { t: "BlockQuote", c: normalizeBlocks(block.c) };
    }
    if (block.t === "BulletList") {
      return {
        t: "BulletList",
        c: block.c.map((item) => normalizeListItemBlocks(item)),
      };
    }
    if (block.t === "OrderedList") {
      const [numAttr, items] = block.c;
      return {
        t: "OrderedList",
        c: [numAttr, items.map((item) => normalizeListItemBlocks(item))],
      };
    }
    if (block.t === "Table") {
      const [attr, caption, colSpecs, head, bodies, foot] = block.c;
      return {
        t: "Table",
        c: [
          attr,
          caption,
          colSpecs,
          normalizeTableHead(head),
          bodies.map(normalizeTableBody),
          foot,
        ],
      };
    }
    return block;
  });
}

function normalizeListItemBlocks(blocks: PandocBlock[]): PandocBlock[] {
  // Normalize Plain <-> Para for list items in tight lists
  return blocks.map((b) => {
    if (b.t === "Plain") {
      return { t: "Para", c: normalizeInlines(b.c) };
    }
    if (b.t === "Para") {
      return { t: "Para", c: normalizeInlines(b.c) };
    }
    return b;
  });
}

function normalizeTableHead(
  head: [PandocAttr, Array<[PandocAttr, PandocCell[]]>],
): [PandocAttr, Array<[PandocAttr, PandocCell[]]>] {
  const [attr, rows] = head;
  return [
    attr,
    rows.map(([rAttr, cells]) => [rAttr, cells.map(normalizeCell)]),
  ];
}

function normalizeTableBody(body: PandocTableBody): PandocTableBody {
  const [attr, rowHeadCol, headRows, bodyRows] = body;
  return [
    attr,
    rowHeadCol,
    headRows.map(([rAttr, cells]) => [rAttr, cells.map(normalizeCell)]),
    bodyRows.map(([rAttr, cells]) => [rAttr, cells.map(normalizeCell)]),
  ];
}

function normalizeCell(cell: PandocCell): PandocCell {
  const [attr, _alignment, rowSpan, colSpan, contents] = cell;
  // Cell alignment defaults to AlignDefault; column spec defines alignment in Pandoc 3
  return [
    attr,
    { t: "AlignDefault" },
    rowSpan,
    colSpan,
    normalizeBlocks(contents),
  ];
}

function normalizeInlines(inlines: PandocInline[]): PandocInline[] {
  const result: PandocInline[] = [];
  for (const inline of inlines) {
    if (inline.t === "Emph") {
      result.push({ t: "Emph", c: normalizeInlines(inline.c) });
    } else if (inline.t === "Strong") {
      result.push({ t: "Strong", c: normalizeInlines(inline.c) });
    } else if (inline.t === "Strikeout") {
      result.push({ t: "Strikeout", c: normalizeInlines(inline.c) });
    } else if (inline.t === "Link") {
      const [attr, text, target] = inline.c;
      result.push({ t: "Link", c: [attr, normalizeInlines(text), target] });
    } else if (inline.t === "Image") {
      const [attr, text, target] = inline.c;
      result.push({ t: "Image", c: [attr, normalizeInlines(text), target] });
    } else {
      result.push(inline);
    }
  }
  return result;
}

/**
 * Find exact divergence between two normalized Pandoc ASTs, returning breadcrumb and localized diff.
 */
export function diffAst(
  actual: PandocDocument,
  expected: PandocDocument,
): {
  matched: boolean;
  breadcrumb?: string;
  actualSnippet?: string;
  expectedSnippet?: string;
} {
  // 1. Blocks count
  if (actual.blocks.length !== expected.blocks.length) {
    return {
      matched: false,
      breadcrumb:
        `doc.blocks (length mismatch: actual ${actual.blocks.length} vs expected ${expected.blocks.length})`,
      actualSnippet: JSON.stringify(actual.blocks.map((b) => b.t), null, 2),
      expectedSnippet: JSON.stringify(expected.blocks.map((b) => b.t), null, 2),
    };
  }

  // 2. Iterate blocks
  for (let i = 0; i < actual.blocks.length; i++) {
    const actB = actual.blocks[i];
    const expB = expected.blocks[i];

    if (actB.t !== expB.t) {
      return {
        matched: false,
        breadcrumb:
          `doc.blocks[${i}] (type mismatch: actual ${actB.t} vs expected ${expB.t})`,
        actualSnippet: JSON.stringify(actB, null, 2),
        expectedSnippet: JSON.stringify(expB, null, 2),
      };
    }

    const blockJsonAct = JSON.stringify(actB);
    const blockJsonExp = JSON.stringify(expB);

    if (blockJsonAct !== blockJsonExp) {
      return {
        matched: false,
        breadcrumb: `doc.blocks[${i}].${actB.t}`,
        actualSnippet: JSON.stringify(actB, null, 2),
        expectedSnippet: JSON.stringify(expB, null, 2),
      };
    }
  }

  // 3. Compare metadata
  const metaJsonAct = JSON.stringify(actual.meta);
  const metaJsonExp = JSON.stringify(expected.meta);
  if (metaJsonAct !== metaJsonExp) {
    return {
      matched: false,
      breadcrumb: `doc.meta`,
      actualSnippet: JSON.stringify(actual.meta, null, 2),
      expectedSnippet: JSON.stringify(expected.meta, null, 2),
    };
  }

  return { matched: true };
}

/**
 * Compare a single Markdown fixture against Pandoc Auxiliary Converter or golden baseline.
 */
export async function testFixture(
  fixturePath: string,
  options: { updateGolden?: boolean; reader?: string } = {},
): Promise<ConformanceResult> {
  const start = performance.now();
  const fixtureName = $.path(fixturePath).basename();
  const goldenPath = fixturePath.replace(/\.md$/, ".ast.json");

  const markdown = await Deno.readTextFile(fixturePath);

  let reader = options.reader || "markdown";
  const readerMatch = markdown.match(/<!--\s*pandoc-reader:\s*([^\s]+)\s*-->/);
  if (readerMatch) {
    reader = readerMatch[1];
  }

  // 1. Run Yeti Native Converter
  const actualAst = normalizeAst(parseToAst(markdown));

  let expectedAst: PandocDocument;
  let source: "live-pandoc" | "cached-golden" = "cached-golden";

  const pandocAvailable = await isPandocAvailable();

  if (pandocAvailable) {
    source = "live-pandoc";
    expectedAst = normalizeAst(await runPandocCli(markdown, reader));

    if (options.updateGolden) {
      await Deno.writeTextFile(
        goldenPath,
        stringifyPandocJson(expectedAst, true) + "\n",
      );
    }
  } else {
    try {
      const goldenContent = await Deno.readTextFile(goldenPath);
      expectedAst = normalizeAst(parsePandocJson(goldenContent));
    } catch {
      throw new Error(
        `Pandoc is not installed and no golden baseline exists at '${goldenPath}'. Run with Pandoc installed to generate goldens.`,
      );
    }
  }

  const diff = diffAst(actualAst, expectedAst);
  const durationMs = Math.round(performance.now() - start);

  return {
    fixtureName,
    matched: diff.matched,
    breadcrumb: diff.breadcrumb,
    actualSnippet: diff.actualSnippet,
    expectedSnippet: diff.expectedSnippet,
    source,
    durationMs,
  };
}
