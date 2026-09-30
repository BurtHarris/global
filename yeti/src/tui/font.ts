/**
 * font.ts — Nerd Font detection, verification, and diagnostics for Yeti TUI.
 *
 * Checks if a Nerd Font is installed and configured in the terminal environment,
 * providing diagnostics and selecting the appropriate glyph set.
 */

import {
  ASCII_FALLBACK_GLYPHS,
  type GlyphSet,
  NERD_GLYPHS,
  UNICODE_FALLBACK_GLYPHS,
} from "./glyphs.ts";

/**
 * Check if the host operating system has any Nerd Font installed.
 */
export async function isNerdFontInstalledOnSystem(): Promise<boolean> {
  // Explicit environment variable override: NERD_FONT=1 or 0
  const envOverride = Deno.env.get("NERD_FONT");
  if (envOverride !== undefined) {
    return envOverride === "1" || envOverride.toLowerCase() === "true";
  }

  if (Deno.build.os === "windows") {
    try {
      // Query Windows Registry for installed fonts matching 'Nerd'
      const cmd = new Deno.Command("powershell", {
        args: [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts', 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' -ErrorAction SilentlyContinue | Get-Member -MemberType NoteProperty | Where-Object Name -like '*Nerd*' | Select-Object -First 1 -ExpandProperty Name`,
        ],
        stdout: "piped",
        stderr: "null",
      });
      const output = await cmd.output();
      const text = new TextDecoder().decode(output.stdout).trim();
      if (text.length > 0) return true;

      // Also check per-user and system font directories for *Nerd* files
      const userFonts = joinEnv("LOCALAPPDATA", "Microsoft\\Windows\\Fonts");
      const systemFonts = "C:\\Windows\\Fonts";

      for (const dir of [userFonts, systemFonts]) {
        try {
          for (const entry of Deno.readDirSync(dir)) {
            if (entry.name.toLowerCase().includes("nerd")) {
              return true;
            }
          }
        } catch {
          // Directory inaccessible or missing
        }
      }
    } catch {
      // PowerShell or directory scan failed
    }
  } else if (Deno.build.os === "darwin" || Deno.build.os === "linux") {
    // On macOS and Linux, query fontconfig (fc-list)
    try {
      const cmd = new Deno.Command("fc-list", {
        args: [":", "family"],
        stdout: "piped",
        stderr: "null",
      });
      const output = await cmd.output();
      const text = new TextDecoder().decode(output.stdout);
      if (text.toLowerCase().includes("nerd")) return true;
    } catch {
      // fc-list not available
    }
  }

  return false;
}

function joinEnv(envVar: string, subPath: string): string {
  const base = Deno.env.get(envVar);
  if (!base) return "";
  return `${base}\\${subPath}`;
}

/**
 * Return the appropriate glyph set based on terminal capability and system font availability.
 */
export async function getActiveGlyphs(): Promise<
  { glyphs: GlyphSet; usingNerdFont: boolean }
> {
  const hasNerd = await isNerdFontInstalledOnSystem();
  if (hasNerd) {
    return { glyphs: NERD_GLYPHS, usingNerdFont: true };
  }

  // Check if standard UTF-8 is supported in terminal
  const isUtf8 = !Deno.env.get("LC_ALL")?.includes("ASCII") &&
    !Deno.env.get("LANG")?.includes("ASCII");

  return {
    glyphs: isUtf8 ? UNICODE_FALLBACK_GLYPHS : ASCII_FALLBACK_GLYPHS,
    usingNerdFont: false,
  };
}

/**
 * Print a visual test card and diagnostic report to the terminal.
 */
export async function printFontDiagnostic(): Promise<void> {
  const installed = await isNerdFontInstalledOnSystem();
  const { glyphs, usingNerdFont } = await getActiveGlyphs();

  console.log("\n=======================================================");
  console.log("             YETI TUI — FONT & GLYPH DIAGNOSTIC        ");
  console.log("=======================================================\n");

  console.log(`Operating System:      ${Deno.build.os} (${Deno.build.arch})`);
  console.log(
    `Nerd Font Detected:    ${
      installed ? "✅ Yes (Installed on system)" : "❌ No (Not detected)"
    }`,
  );
  console.log(
    `Active Glyph Mode:     ${
      usingNerdFont ? "🎨 Full Nerd Font Glyphs" : "📄 Unicode / ASCII Fallback"
    }\n`,
  );

  console.log("--- Visual Glyph Render Test ---");
  console.log(
    `  Document:   ${glyphs.file}  ${glyphs.markdown}  ${glyphs.pdf}  ${glyphs.word}  ${glyphs.html}  ${glyphs.code}`,
  );
  console.log(`  Folders:    ${glyphs.folder}  ${glyphs.folderOpen}`);
  console.log(
    `  Status:     ${glyphs.check}  ${glyphs.cross}  ${glyphs.warning}  ${glyphs.info}  ${glyphs.spinner}  ${glyphs.bullet}`,
  );
  console.log(
    `  Navigation: ${glyphs.branch}  ${glyphs.arrowRight}  ${glyphs.arrowDown}  ${glyphs.ellipsis}`,
  );
  console.log(`  Engines:    ${glyphs.pandoc}  ${glyphs.deno}  ${glyphs.gear}`);

  console.log("\n--- Verification Advice ---");
  if (usingNerdFont) {
    console.log("✅ Your system has a Nerd Font installed!");
    console.log(
      "👉 If the icons above render as broken squares (), ensure your",
    );
    console.log(
      "   terminal (e.g. Windows Terminal / VS Code) is configured to use",
    );
    console.log(
      "   'JetBrainsMono Nerd Font' or another patched Nerd Font as its font family.",
    );
  } else {
    console.log("ℹ️  No Nerd Font was detected on your system.");
    console.log("👉 To install one, run:");
    console.log("   winget install DEVCOM.JetBrainsMonoNerdFont");
    console.log(
      "   Then configure Windows Terminal / VS Code to use 'JetBrainsMono Nerd Font'.",
    );
  }
  console.log("=======================================================\n");
}

if (import.meta.main) {
  await printFontDiagnostic();
}
