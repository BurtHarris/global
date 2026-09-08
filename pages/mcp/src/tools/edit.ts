import { PageStorageAdapter, applyAtomicEdit } from "@pages/core";

export async function handleReplaceLiteral(
  storage: PageStorageAdapter,
  args: {
    pageId: string;
    targetText: string;
    replacementText: string;
    occurrenceIndex?: number;
  }
) {
  const page = await storage.getPage(args.pageId);
  if (!page) {
    return {
      isError: true,
      content: [{ type: "text", text: `Page "${args.pageId}" was not found.` }],
    };
  }

  const result = applyAtomicEdit(page, {
    kind: "literal",
    targetText: args.targetText,
    replacementText: args.replacementText,
    occurrenceIndex: args.occurrenceIndex ?? 0,
  });

  if (!result.success || !result.page) {
    return {
      isError: true,
      content: [{ type: "text", text: result.error || "Literal replacement failed." }],
    };
  }

  await storage.savePage(result.page);

  return {
    content: [
      {
        type: "text",
        text: `Successfully applied literal edit to page "${args.pageId}". New revision: ${result.page.revisionId}.\nSummary: ${result.appliedChangeSummary}`,
      },
    ],
  };
}

export async function handleReplaceSection(
  storage: PageStorageAdapter,
  args: {
    pageId: string;
    heading: string;
    newSectionContent: string;
  }
) {
  const page = await storage.getPage(args.pageId);
  if (!page) {
    return {
      isError: true,
      content: [{ type: "text", text: `Page "${args.pageId}" was not found.` }],
    };
  }

  const result = applyAtomicEdit(page, {
    kind: "section",
    heading: args.heading,
    newSectionContent: args.newSectionContent,
  });

  if (!result.success || !result.page) {
    return {
      isError: true,
      content: [{ type: "text", text: result.error || "Section replacement failed." }],
    };
  }

  await storage.savePage(result.page);

  return {
    content: [
      {
        type: "text",
        text: `Successfully replaced section "${args.heading}" in page "${args.pageId}". New revision: ${result.page.revisionId}.`,
      },
    ],
  };
}
