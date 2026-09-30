/**
 * cli.ts — Standalone dax-powered CLI runner for Yeti Conformance Tests.
 *
 * Visual runner rendering glyph-decorated test reports comparing Yeti's Native Converter
 * with Pandoc Auxiliary Converter.
 */

import $ from "@david/dax";
import { isPandocAvailable, testFixture } from "./harness.ts";
import { getActiveGlyphs } from "../../src/tui/font.ts";

async function main() {
  const updateGoldens = Deno.args.includes("--update-goldens") ||
    Deno.args.includes("-u");
  const filterArg = Deno.args.find((a) => !a.startsWith("-"));

  const { glyphs, usingNerdFont } = await getActiveGlyphs();
  const pandocFound = await isPandocAvailable();

  console.log("\n=======================================================");
  console.log(`  ${glyphs.gear}  YETI ⟷ PANDOC CONFORMANCE RUNNER (dax)`);
  console.log("=======================================================\n");

  console.log(
    `Execution Engine:   Deno ${Deno.version.deno} (V8 ${Deno.version.v8})`,
  );
  console.log(
    `Nerd Fonts:         ${
      usingNerdFont ? `${glyphs.check} Active` : "Standard Unicode"
    }`,
  );
  console.log(
    `Pandoc (Auxiliary): ${
      pandocFound
        ? `${glyphs.check} Available (${await $.which("pandoc")})`
        : `${glyphs.cross} Not found (running against cached goldens)`
    }`,
  );
  if (updateGoldens) {
    console.log(
      `Mode:               ${glyphs.warning} Updating golden baselines (--update-goldens)`,
    );
  }
  console.log("");

  const scriptDir = $.path(import.meta.url).parent()!;
  const fixturesDir = scriptDir.join("fixtures");

  const fixtureFiles: string[] = [];
  for await (const entry of Deno.readDir(fixturesDir.toString())) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      if (!filterArg || entry.name.includes(filterArg)) {
        fixtureFiles.push(fixturesDir.join(entry.name).toString());
      }
    }
  }

  fixtureFiles.sort();

  if (fixtureFiles.length === 0) {
    console.log(`❌ No fixtures found in ${fixturesDir}`);
    Deno.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const file of fixtureFiles) {
    const name = $.path(file).basename();
    try {
      const res = await testFixture(file, { updateGolden: updateGoldens });
      if (res.matched) {
        passed++;
        console.log(
          `  ${glyphs.check} \x1b[32mPASS\x1b[0m  ${name} \x1b[90m(${res.source}, ${res.durationMs}ms)\x1b[0m`,
        );
      } else {
        failed++;
        console.log(
          `  ${glyphs.cross} \x1b[31mFAIL\x1b[0m  ${name} \x1b[90m(${res.source}, ${res.durationMs}ms)\x1b[0m`,
        );
        if (res.breadcrumb) {
          console.log(`       \x1b[33mDivergence at:\x1b[0m ${res.breadcrumb}`);
        }
        if (res.actualSnippet && res.expectedSnippet) {
          console.log(
            `       \x1b[36mNative AST:\x1b[0m   ${
              res.actualSnippet.split("\n")[0]
            }`,
          );
          console.log(
            `       \x1b[35mPandoc AST:\x1b[0m   ${
              res.expectedSnippet.split("\n")[0]
            }`,
          );
        }
      }
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${glyphs.cross} \x1b[31mERR \x1b[0m  ${name}: ${msg}`);
    }
  }

  console.log("\n-------------------------------------------------------");
  console.log(
    `Results: ${passed} passed, ${failed} failed, ${fixtureFiles.length} total`,
  );
  console.log("=======================================================\n");

  if (failed > 0) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
