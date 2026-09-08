import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  replaceLiteral,
  replaceSection,
  applyAtomicEdit,
} from "../dist/patch.js";
import { parseSections } from "../dist/parser.js";
import type { Page } from "../dist/types.js";

describe("Deterministic Patch Engine (DEF-PAGES-01 Remediation)", () => {
  const sampleMarkdown = `# MaxGirls Governance Document

## Executive Summary
This document defines the **core governance** guidelines for the project.
Punctuation: [brackets], (parentheses), $currency, and *asterisks*.

## Conejita Workstream
Initial draft of the Conejita guidelines in Spanish and English.
Some content to replace.

## Legal and Ethical Review
Review requested by Mayra Bravo.
Pending sign-off.
`;

  it("replaces literal text with Markdown emphasis and regex metacharacters without errors", () => {
    const target = "Punctuation: [brackets], (parentheses), $currency, and *asterisks*.";
    const replacement = "Punctuation: verified with zero regex errors.";

    const result = replaceLiteral(sampleMarkdown, target, replacement);

    assert.equal(result.success, true);
    assert.ok(result.content.includes(replacement));
    assert.ok(!result.content.includes(target));
  });

  it("replaces a bounded section by heading cleanly without altering adjacent sections", () => {
    const newSection = `## Conejita Workstream
Updated and refined Conejita governance rules.
Fully vetted.`;

    const result = replaceSection(sampleMarkdown, "Conejita Workstream", newSection);

    assert.equal(result.success, true);
    assert.ok(result.content.includes("Updated and refined Conejita governance rules."));
    // Adjacent sections remain intact
    assert.ok(result.content.includes("## Executive Summary"));
    assert.ok(result.content.includes("## Legal and Ethical Review"));
    assert.ok(result.content.includes("Review requested by Mayra Bravo."));
  });

  it("applies atomic edit to Page and updates revisionId", () => {
    const page: Page = {
      id: "gov-doc-1",
      title: "MaxGirls Governance",
      content: sampleMarkdown,
      revisionId: "rev-initial",
      updatedAt: "2026-09-07T00:00:00.000Z",
      isCanonical: true,
    };

    const editResult = applyAtomicEdit(page, {
      kind: "literal",
      targetText: "**core governance**",
      replacementText: "**authoritative governance**",
    });

    assert.equal(editResult.success, true);
    assert.ok(editResult.page);
    assert.ok(editResult.page.content.includes("**authoritative governance**"));
    assert.notEqual(editResult.page.revisionId, "rev-initial");
  });

  it("correctly indexes sections and computes bounds", () => {
    const sections = parseSections(sampleMarkdown);
    assert.equal(sections.length, 4); // Root + 3 subheadings
    assert.equal(sections[0].heading, "MaxGirls Governance Document");
    assert.equal(sections[1].heading, "Executive Summary");
    assert.equal(sections[2].heading, "Conejita Workstream");
    assert.equal(sections[3].heading, "Legal and Ethical Review");
  });
});
