import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Page } from "./types.js";

export interface PageStorageAdapter {
  getPage(id: string): Promise<Page | null>;
  savePage(page: Page): Promise<void>;
  listPages(): Promise<Page[]>;
  setCanonical(canonicalId: string, duplicateIds?: string[]): Promise<void>;
}

/**
 * Storage adapter implementing UKF / OKF conventions:
 * Mixed Markdown and YAML in a single self-contained file.
 * Strictly NO sidecar files for text documents (sidecars are reserved for binaries).
 */
export class LocalFilePageStorage implements PageStorageAdapter {
  constructor(private readonly baseDir: string) {}

  private getPagePath(id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.baseDir, `${safeId}.md`);
  }

  /**
   * Parses mixed YAML frontmatter and CommonMark body.
   */
  private parseUkfDocument(rawContent: string, id: string): Page {
    let frontmatterRaw = "";
    let body = rawContent;
    const meta: Record<string, any> = {};

    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = rawContent.match(fmRegex);

    if (match) {
      frontmatterRaw = match[1];
      body = match[2];

      // Parse basic YAML keys
      for (const line of frontmatterRaw.split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          let val: any = line.slice(colonIdx + 1).trim();
          if (val === "true") val = true;
          else if (val === "false") val = false;
          else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          meta[key] = val;
        }
      }
    }

    const firstLine = body.split("\n")[0] || "";
    const title =
      meta.title ||
      (firstLine.startsWith("#") ? firstLine.replace(/^#+\s*/, "").trim() : id);

    let canonicalOf: string[] = [];
    if (meta.canonical_of) {
      if (Array.isArray(meta.canonical_of)) {
        canonicalOf = meta.canonical_of;
      } else if (typeof meta.canonical_of === "string") {
        canonicalOf = meta.canonical_of.split(",").map((s) => s.trim());
      }
    }

    return {
      id: meta.id || id,
      title,
      content: body,
      revisionId: meta.revision || meta.revisionId || `rev-${Date.now()}`,
      updatedAt: meta.updated_at || meta.updatedAt || new Date().toISOString(),
      isCanonical: meta.canonical !== undefined ? meta.canonical : meta.isCanonical ?? true,
      canonicalOf,
      metadata: meta,
    };
  }

  /**
   * Serializes Page to single UKF/OKF mixed YAML + Markdown file.
   */
  private serializeUkfDocument(page: Page): string {
    const yamlLines = [
      "---",
      `id: "${page.id}"`,
      `title: "${page.title.replace(/"/g, '\\"')}"`,
      `revision: "${page.revisionId}"`,
      `updated_at: "${page.updatedAt}"`,
      `canonical: ${page.isCanonical}`,
    ];

    if (page.canonicalOf && page.canonicalOf.length > 0) {
      yamlLines.push(`canonical_of:`);
      for (const dup of page.canonicalOf) {
        yamlLines.push(`  - "${dup}"`);
      }
    }

    yamlLines.push("---", "");
    return yamlLines.join("\n") + page.content;
  }

  async getPage(id: string): Promise<Page | null> {
    try {
      const pagePath = this.getPagePath(id);
      const rawContent = await fs.readFile(pagePath, "utf-8");
      return this.parseUkfDocument(rawContent, id);
    } catch {
      return null;
    }
  }

  async savePage(page: Page): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const pagePath = this.getPagePath(page.id);
    const serialized = this.serializeUkfDocument(page);
    await fs.writeFile(pagePath, serialized, "utf-8");
  }

  async listPages(): Promise<Page[]> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      const entries = await fs.readdir(this.baseDir);
      const mdFiles = entries.filter((f: string) => f.endsWith(".md"));
      const pages: Page[] = [];

      for (const file of mdFiles) {
        const id = file.replace(/\.md$/, "");
        const page = await this.getPage(id);
        if (page) pages.push(page);
      }

      return pages;
    } catch {
      return [];
    }
  }

  async setCanonical(canonicalId: string, duplicateIds: string[] = []): Promise<void> {
    const canonical = await this.getPage(canonicalId);
    if (!canonical) {
      throw new Error(`Canonical page "${canonicalId}" not found.`);
    }

    canonical.isCanonical = true;
    canonical.canonicalOf = Array.from(
      new Set([...(canonical.canonicalOf || []), ...duplicateIds])
    );
    await this.savePage(canonical);

    for (const dupId of duplicateIds) {
      const dup = await this.getPage(dupId);
      if (dup) {
        dup.isCanonical = false;
        await this.savePage(dup);
      }
    }
  }
}

/**
 * In-memory storage adapter for testing without disk IO.
 */
export class MemoryPageStorage implements PageStorageAdapter {
  private pages = new Map<string, Page>();

  async getPage(id: string): Promise<Page | null> {
    return this.pages.get(id) || null;
  }

  async savePage(page: Page): Promise<void> {
    this.pages.set(page.id, { ...page });
  }

  async listPages(): Promise<Page[]> {
    return Array.from(this.pages.values());
  }

  async setCanonical(canonicalId: string, duplicateIds: string[] = []): Promise<void> {
    const canonical = this.pages.get(canonicalId);
    if (!canonical) throw new Error(`Canonical page "${canonicalId}" not found.`);
    canonical.isCanonical = true;
    canonical.canonicalOf = Array.from(
      new Set([...(canonical.canonicalOf || []), ...duplicateIds])
    );
    for (const dupId of duplicateIds) {
      const dup = this.pages.get(dupId);
      if (dup) dup.isCanonical = false;
    }
  }
}
