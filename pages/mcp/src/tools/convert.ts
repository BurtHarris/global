import { PageStorageAdapter, convertDocument, ConversionFormat } from "@pages/core";

export async function handleConvert(
  storage: PageStorageAdapter,
  args: {
    pageId?: string;
    rawContent?: string;
    sourceFormat?: ConversionFormat;
    targetFormat: ConversionFormat;
  }
) {
  let content = args.rawContent || "";
  let sourceFormat = args.sourceFormat || "commonmark";

  if (args.pageId) {
    const page = await storage.getPage(args.pageId);
    if (!page) {
      return {
        isError: true,
        content: [{ type: "text", text: `Page "${args.pageId}" was not found.` }],
      };
    }
    content = page.content;
    sourceFormat = "commonmark";
  }

  if (!content) {
    return {
      isError: true,
      content: [{ type: "text", text: "Neither pageId nor rawContent was provided." }],
    };
  }

  const result = convertDocument(content, {
    sourceFormat,
    targetFormat: args.targetFormat,
  });

  if (!result.success || !result.result) {
    return {
      isError: true,
      content: [{ type: "text", text: result.error || "Conversion failed." }],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: result.result,
      },
    ],
  };
}
