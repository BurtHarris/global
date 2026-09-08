/**
 * Bidirectional HTML <-> CommonMark converter for M365 Copilot Pages and Canvas documents.
 */

export function commonMarkToHtml(markdown: string, title?: string): string {
  let html = "";
  if (title) {
    html += `<h1>${escapeHtml(title)}</h1>\n`;
  }

  const lines = markdown.split("\n");
  let inCode = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeBuffer = [];
      } else {
        inCode = false;
        html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>\n`;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html += `<h${level}>${formatInline(heading[2].trim())}</h${level}>\n`;
      continue;
    }

    const callout = line.match(/^>\s*(.+)$/);
    if (callout) {
      html += `<blockquote class="copilot-callout">${formatInline(callout[1].trim())}</blockquote>\n`;
      continue;
    }

    const list = line.match(/^([*\-+]|\d+\.)\s+(.+)$/);
    if (list) {
      html += `<li>${formatInline(list[2].trim())}</li>\n`;
      continue;
    }

    if (line.trim().length > 0) {
      html += `<p>${formatInline(line.trim())}</p>\n`;
    }
  }

  return html;
}

export function htmlToCommonMark(html: string): string {
  let md = html;

  // Replace script and style tags
  md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n```\n$1\n```\n");
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Blockquotes / callouts
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, p1) => {
    return `\n> ${p1.trim().replace(/\n/g, "\n> ")}\n`;
  });

  // Paragraphs & breaks
  md = md.replace(/<br\s*\/?>/gi, "  \n");
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");

  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?ul[^>]*>/gi, "\n");
  md = md.replace(/<\/?ol[^>]*>/gi, "\n");

  // Inlines
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize excessive blank lines
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim() + "\n";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text: string): string {
  let res = escapeHtml(text);
  // Bold
  res = res.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  res = res.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  res = res.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links
  res = res.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  return res;
}
