/**
 * converter.ts — Native Converter implementation for Yeti.
 *
 * Provides in-process conversion of Markdown source into Pandoc 3.x AST
 * without external binary dependencies, adhering to yeti/CONTEXT.md.
 */

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import type { MdastRoot } from "@guild/pandoc";
import { mdastToPandoc } from "@guild/pandoc";
import type { PandocDocument } from "@guild/pandoc";

export interface ParseOptions {
  /**
   * Enable GitHub Flavored Markdown extensions (tables, strikethrough, autolinks, task lists).
   * Defaults to true.
   */
  gfm?: boolean;

  /**
   * Enable YAML frontmatter parsing.
   * Defaults to true.
   */
  frontmatter?: boolean;

  /**
   * Automatically generate kebab-case identifiers for headers matching Pandoc conventions.
   * Defaults to true.
   */
  autoHeaderIds?: boolean;
}

/**
 * Generate a Pandoc-compatible kebab-case slug identifier for a header string.
 */
export function slugifyHeader(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse Markdown source into a strongly-typed Pandoc 3.x AST document natively.
 */
export function parseToAst(
  markdown: string,
  options: ParseOptions = {},
): PandocDocument {
  const useGfm = options.gfm ?? true;
  const useFrontmatter = options.frontmatter ?? true;
  const autoHeaderIds = options.autoHeaderIds ?? true;

  const extensions = [];
  const mdastExtensions = [];

  if (useGfm) {
    extensions.push(gfm());
    mdastExtensions.push(gfmFromMarkdown());
  }

  if (useFrontmatter) {
    extensions.push(frontmatter());
    mdastExtensions.push(frontmatterFromMarkdown(["yaml"]));
  }

  const mdastTree = fromMarkdown(markdown, {
    extensions,
    mdastExtensions,
  }) as MdastRoot;

  const doc = mdastToPandoc(mdastTree);

  if (autoHeaderIds) {
    for (const block of doc.blocks) {
      if (block.t === "Header") {
        const [level, attr, inlines] = block.c;
        if (!attr[0]) {
          // Extract text from inlines to create slug
          const headerText = inlines
            .map((inline) => {
              if (inline.t === "Str") return inline.c;
              if (inline.t === "Space") return " ";
              if (inline.t === "Code") return inline.c[1];
              return "";
            })
            .join("");
          const slug = slugifyHeader(headerText);
          block.c = [level, [slug, attr[1], attr[2]], inlines];
        }
      }
    }
  }

  return doc;
}
