/**
 * Plain text converter for Copilot Pages.
 */

export function commonMarkToPlainText(markdown: string): string {
  let text = markdown;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/^```.*\n/, "").replace(/```$/, "");
  });

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold / italic
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");

  // Remove link markup [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove callout markers
  text = text.replace(/^>\s+/gm, "");

  // Clean extra newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
