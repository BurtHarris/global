import { PageStorageAdapter } from "@pages/core";

export async function handleListPages(storage: PageStorageAdapter) {
  const pages = await storage.listPages();
  const summary = pages.map((p) => ({
    id: p.id,
    title: p.title,
    isCanonical: p.isCanonical,
    updatedAt: p.updatedAt,
    revisionId: p.revisionId,
    canonicalOfCount: p.canonicalOf?.length || 0,
  }));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(summary, null, 2),
      },
    ],
  };
}

export async function handleSetCanonical(
  storage: PageStorageAdapter,
  args: {
    canonicalId: string;
    duplicateIds?: string[];
  }
) {
  try {
    await storage.setCanonical(args.canonicalId, args.duplicateIds || []);
    return {
      content: [
        {
          type: "text",
          text: `Page "${args.canonicalId}" is now designated as Canonical. Workaround duplicates marked: ${args.duplicateIds?.join(", ") || "none"}.`,
        },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Failed to set canonical: ${err instanceof Error ? err.message : String(err)}` }],
    };
  }
}
