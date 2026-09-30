/**
 * glyphs.ts — Centralized icon and typography symbol definitions for Yeti TUI.
 *
 * Provides high-fidelity Nerd Font glyphs with automatic graceful fallbacks
 * to standard Unicode and plain ASCII symbols when a Nerd Font is not present.
 */

export interface GlyphSet {
  // Document & File types
  file: string;
  markdown: string;
  pdf: string;
  word: string;
  html: string;
  code: string;
  folder: string;
  folderOpen: string;

  // Status & Progress
  check: string;
  cross: string;
  warning: string;
  info: string;
  spinner: string;
  bullet: string;

  // Navigation & Hierarchy
  branch: string;
  arrowRight: string;
  arrowDown: string;
  ellipsis: string;

  // Tools & Converters
  pandoc: string;
  deno: string;
  gear: string;
}

/**
 * Standard Nerd Font glyphs (requiring a patched font like JetBrainsMono Nerd Font).
 * Unicode Private Use Area (PUA) points.
 */
export const NERD_GLYPHS: GlyphSet = {
  // Files
  file: "\uf15b", // 
  markdown: "\ue73e", // 
  pdf: "\uf1c1", // 
  word: "\uf1c2", // 
  html: "\ue736", // 
  code: "\uf121", // 
  folder: "\uf07b", // 
  folderOpen: "\uf07c", // 

  // Status
  check: "\uf00c", // 
  cross: "\uf00d", // 
  warning: "\uf071", // 
  info: "\uf05a", // 
  spinner: "\uf110", // 
  bullet: "\uf111", // 

  // Navigation
  branch: "\ue725", // 
  arrowRight: "\uf061", // 
  arrowDown: "\uf063", // 
  ellipsis: "\uf141", // 

  // Tools
  pandoc: "\ue61f", //  (Haskell / Pandoc symbol)
  deno: "\ue628", //  (Deno / TS symbol)
  gear: "\uf013", // 
};

/**
 * Standard Unicode / ASCII fallbacks for basic terminal fonts.
 */
export const UNICODE_FALLBACK_GLYPHS: GlyphSet = {
  file: "[doc]",
  markdown: "[md]",
  pdf: "[pdf]",
  word: "[doc]",
  html: "[html]",
  code: "<//>",
  folder: "[+]",
  folderOpen: "[-]",

  check: "✓",
  cross: "✗",
  warning: "⚠",
  info: "ℹ",
  spinner: "◐",
  bullet: "•",

  branch: "↳",
  arrowRight: "→",
  arrowDown: "↓",
  ellipsis: "...",

  pandoc: "[Pandoc]",
  deno: "[Deno]",
  gear: "[*]",
};

/**
 * Pure ASCII fallback for strict 7-bit ASCII environments.
 */
export const ASCII_FALLBACK_GLYPHS: GlyphSet = {
  file: "[F]",
  markdown: "[MD]",
  pdf: "[PDF]",
  word: "[DOC]",
  html: "[HTM]",
  code: "<>",
  folder: "[+]",
  folderOpen: "[-]",

  check: "[v]",
  cross: "[x]",
  warning: "[!]",
  info: "[i]",
  spinner: "[*]",
  bullet: "*",

  branch: "|-",
  arrowRight: "->",
  arrowDown: "v",
  ellipsis: "...",

  pandoc: "[P]",
  deno: "[D]",
  gear: "[*]",
};
