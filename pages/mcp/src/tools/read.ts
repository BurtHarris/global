import { PageStorageAdapter, findSection, parseSections } from "@pages/core";

export async function handleReadPage(
  storage: PageStorageAdapter,
  args: { pageId: string; sectionHeading?: string; listSectionsOnly?: boolean }
) {
  const page = await storage.getPage(args.pageId);
  if (!page) {
    return {
      isError: true,
      content: [{ type: "text", text: `Page "${args.pageId}" was not found.` }],
    };
  }

  if (args.listSectionsOnly) {
    const sections = parseSections(page.content);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            sections.map((s) => ({ heading: s.heading, level: s.level })),
            null,
            2
          ),
        },
      ],
    };
  }

  if (args.sectionHeading) {
    const section = findSection(page.content, args.sectionHeading);
    if (!section) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Section "${args.sectionHeading}" not found in page "${args.pageId}".`,
          },
        ],
      };
    }
    return {
      content: [{ type: "text", text: section.content }],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: page.content,
      },
    ],
  };
}
