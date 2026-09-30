/**
 * conformance_test.ts — Automated Deno Test Suite for Yeti ⟷ Pandoc Conformance.
 * Uses dax to validate AST transformations against Pandoc / cached goldens.
 */

import { assertEquals } from "@std/assert";
import $ from "@david/dax";
import { testFixture } from "./harness.ts";

const scriptDir = $.path(import.meta.url).parent()!;
const fixturesDir = scriptDir.join("fixtures");

for await (const entry of Deno.readDir(fixturesDir.toString())) {
  if (entry.isFile && entry.name.endsWith(".md")) {
    const fixturePath = fixturesDir.join(entry.name).toString();
    const testName = `Conformance: ${entry.name}`;

    Deno.test(testName, async () => {
      const result = await testFixture(fixturePath);
      assertEquals(
        result.matched,
        true,
        `Mismatch in ${entry.name} at ${result.breadcrumb}\nNative:\n${result.actualSnippet}\nPandoc:\n${result.expectedSnippet}`,
      );
    });
  }
}
