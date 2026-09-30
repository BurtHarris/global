#!/usr/bin/env -S deno run --allow-run --allow-read
/**
 * ready-to-commit.ts — Pre-commit readiness validator and helper for Deno & Git.
 *
 * Checks:
 *  1. Working tree changes (staged, unstaged, untracked).
 *  2. Branch divergence against upstream (@{u} ahead/behind).
 *  3. Code & Markdown formatting (deno fmt --check) on touched files.
 *  4. Optional auto-fix (--fix), staging (--stage), and committing (-m "message").
 *
 * Usage:
 *  deno run --allow-run --allow-read scripts/ready-to-commit.ts
 *  deno run --allow-run --allow-read scripts/ready-to-commit.ts --fix
 *  deno run --allow-run --allow-read scripts/ready-to-commit.ts -m "docs: add pandoc research note"
 */

import { parseArgs } from "jsr:@std/cli/parse-args";
import {
  dirname,
  fromFileUrl,
  isAbsolute,
  join,
  relative,
  resolve,
} from "jsr:@std/path";

// Supported file extensions for `deno fmt`
const FORMATTABLE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".markdown",
  ".yaml",
  ".yml",
  ".css",
  ".html",
]);

interface GitCommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

function normalizePath(p: string): string {
  return p.replaceAll("\\", "/");
}

function normalizeToRepo(filePath: string, repoRoot: string): string {
  let fullPath = filePath;
  if (!isAbsolute(filePath)) {
    const fromRoot = resolve(repoRoot, filePath);
    const fromCwd = resolve(Deno.cwd(), filePath);
    try {
      Deno.statSync(fromRoot);
      fullPath = fromRoot;
    } catch {
      try {
        Deno.statSync(fromCwd);
        fullPath = fromCwd;
      } catch {
        fullPath = fromRoot;
      }
    }
  }
  return normalizePath(relative(repoRoot, fullPath));
}

async function runGit(args: string[], cwd: string): Promise<GitCommandResult> {
  const cmd = new Deno.Command("git", {
    args: ["-C", cwd, ...args],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  const decoder = new TextDecoder();
  return {
    code: output.code,
    stdout: decoder.decode(output.stdout).trimEnd(),
    stderr: decoder.decode(output.stderr).trimEnd(),
  };
}

async function runDenoFmt(
  files: string[],
  cwd: string,
  fix: boolean,
): Promise<{ ok: boolean; unformatted: string[] }> {
  if (files.length === 0) return { ok: true, unformatted: [] };

  const args = fix ? ["fmt", ...files] : ["fmt", "--check", ...files];

  const cmd = new Deno.Command("deno", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  const decoder = new TextDecoder();
  const stdout = decoder.decode(output.stdout);
  const stderr = decoder.decode(output.stderr);

  if (output.code === 0) {
    return { ok: true, unformatted: [] };
  }

  // Parse unformatted files from stderr/stdout
  const unformatted: string[] = [];
  const lines = (stdout + "\n" + stderr).split(/\r?\n/);
  const normalizedFileSet = new Set(files.map(normalizePath));

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("from ") && trimmed.endsWith(":")) {
      const filePath = trimmed.slice(5, -1).trim();
      const normalized = normalizePath(relative(cwd, filePath));
      if (normalizedFileSet.has(normalized)) {
        unformatted.push(normalized);
      }
    } else {
      const direct = normalizePath(trimmed);
      if (normalizedFileSet.has(direct)) {
        unformatted.push(direct);
      }
    }
  }

  return {
    ok: false,
    unformatted: unformatted.length > 0 ? unformatted : files,
  };
}

function findRepoRoot(): string {
  // Traverse upwards from current script location to find .git
  let dir = dirname(fromFileUrl(import.meta.url));
  while (dir !== dirname(dir)) {
    try {
      const gitDir = join(dir, ".git");
      const stat = Deno.statSync(gitDir);
      if (stat.isDirectory || stat.isFile) {
        return dir;
      }
    } catch {
      // Keep searching upwards
    }
    dir = dirname(dir);
  }
  return Deno.cwd();
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "fix", "stage", "all"],
    string: ["message", "file"],
    alias: {
      h: "help",
      f: "fix",
      s: "stage",
      a: "all",
      m: "message",
    },
  });

  if (args.help) {
    console.log(`
ready-to-commit — Validate repository changes before committing

USAGE:
  deno run --allow-run --allow-read scripts/ready-to-commit.ts [OPTIONS] [files...]

OPTIONS:
  -f, --fix          Auto-format unformatted files using 'deno fmt'
  -s, --stage        Stage modified and untracked files (or specified files)
  -a, --all          Include all changes when staging
  -m, --message MSG  Commit with the specified message if validation passes
  -h, --help         Show this help message

EXAMPLES:
  # Check readiness
  deno run --allow-run --allow-read scripts/ready-to-commit.ts

  # Fix formatting and check
  deno run --allow-run --allow-read scripts/ready-to-commit.ts --fix

  # Format, stage, and commit in one step
  deno run --allow-run --allow-read --allow-write scripts/ready-to-commit.ts -f -s -m "docs: add pandoc note"
`);
    Deno.exit(0);
  }

  const repoRoot = findRepoRoot();
  console.log(`\n📂 Repository root: ${repoRoot}`);

  // 1. Check Git Status
  const statusRes = await runGit(
    ["status", "--porcelain=v1", "-uall"],
    repoRoot,
  );
  if (statusRes.code !== 0) {
    console.error(`❌ Failed to run git status: ${statusRes.stderr}`);
    Deno.exit(1);
  }

  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];

  for (const line of statusRes.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const x = line[0];
    const y = line[1];
    const file = normalizePath(line.slice(3).trim());

    if (x === "?" && y === "?") {
      untracked.push(file);
    } else {
      if (x !== " " && x !== "?") staged.push(file);
      if (y !== " " && y !== "?") unstaged.push(file);
    }
  }

  // 2. Check Branch & Upstream Divergence
  const branchRes = await runGit(["branch", "--show-current"], repoRoot);
  const branchName = branchRes.stdout || "HEAD (detached)";

  const upstreamRes = await runGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    repoRoot,
  );
  const upstream = upstreamRes.code === 0 ? upstreamRes.stdout : null;

  let ahead = 0;
  let behind = 0;
  if (upstream) {
    const revCountRes = await runGit(
      ["rev-list", "--left-right", "--count", "HEAD...@{u}"],
      repoRoot,
    );
    if (revCountRes.code === 0) {
      const parts = revCountRes.stdout.split(/\s+/);
      ahead = parseInt(parts[0] ?? "0", 10);
      behind = parseInt(parts[1] ?? "0", 10);
    }
  }

  // 3. Collect touched files
  const allTouched = Array.from(
    new Set([...staged, ...unstaged, ...untracked]),
  );
  const targetFiles = args._.length > 0
    ? args._.map((f) => normalizeToRepo(String(f), repoRoot))
    : allTouched;

  console.log(`🌿 Current branch:  ${branchName}`);
  if (upstream) {
    let syncStatus = "In sync";
    if (ahead > 0 && behind > 0) {
      syncStatus =
        `⚠️  Diverged (Ahead: ${ahead}, Behind: ${behind}) -> 'git pull --rebase' recommended`;
    } else if (ahead > 0) {
      syncStatus = `Ahead of ${upstream} by ${ahead} commit(s)`;
    } else if (behind > 0) {
      syncStatus =
        `⚠️  Behind ${upstream} by ${behind} commit(s) -> 'git pull' recommended`;
    } else {
      syncStatus = `✓ Up to date with ${upstream}`;
    }
    console.log(`🌐 Remote tracking: ${upstream} (${syncStatus})`);
  } else {
    console.log(`🌐 Remote tracking: None configured`);
  }

  console.log("\n--- Working Tree Summary ---");
  console.log(`  Staged files:   ${staged.length}`);
  staged.forEach((f) => console.log(`    + [staged]   ${f}`));
  console.log(`  Unstaged files: ${unstaged.length}`);
  unstaged.forEach((f) => console.log(`    * [unstaged] ${f}`));
  console.log(`  Untracked files: ${untracked.length}`);
  untracked.forEach((f) => console.log(`    ? [untracked] ${f}`));

  if (targetFiles.length === 0) {
    console.log("\n✓ Working tree clean. Nothing to commit.");
    Deno.exit(0);
  }

  // 4. Formatting check on formattable touched files
  const formattableFiles = targetFiles.filter((file) => {
    const dot = file.lastIndexOf(".");
    if (dot === -1) return false;
    const ext = file.slice(dot).toLowerCase();
    return FORMATTABLE_EXTS.has(ext);
  });

  let fmtOk = true;
  if (formattableFiles.length > 0) {
    console.log("\n--- Formatting Check (deno fmt) ---");
    if (args.fix) {
      console.log(
        `🛠️  Formatting ${formattableFiles.length} file(s) with deno fmt...`,
      );
      const fixRes = await runDenoFmt(formattableFiles, repoRoot, true);
      if (fixRes.ok) {
        console.log(`✓ All formattable files formatted successfully.`);
      } else {
        fmtOk = false;
        console.log(`⚠️  Could not format some files.`);
      }
    } else {
      const checkRes = await runDenoFmt(formattableFiles, repoRoot, false);
      if (checkRes.ok) {
        console.log(
          `✓ ${formattableFiles.length} touched file(s) pass formatting.`,
        );
      } else {
        fmtOk = false;
        console.log(`❌ Unformatted file(s) detected:`);
        checkRes.unformatted.forEach((f) => console.log(`   - ${f}`));
        console.log(`👉 Run with --fix to automatically format these files.`);
      }
    }
  }

  // 5. Readiness Verdict
  console.log("\n==========================================");
  let isReady = fmtOk &&
    (staged.length > 0 || untracked.length > 0 || unstaged.length > 0);

  if (!fmtOk) {
    console.log("❌ NOT READY: Fix formatting before committing.");
  } else if (staged.length === 0 && !args.stage && !args.message) {
    console.log("⚠️  CHANGES PRESENT BUT NOT STAGED.");
    console.log("👉 Stage with: git add <file> (or run with -s / --stage)");
    isReady = false;
  } else {
    console.log("✅ READY TO COMMIT!");
  }
  console.log("==========================================\n");

  // 6. Optional Stage & Commit
  if (args.stage || args.all || args.message) {
    if (!fmtOk) {
      console.error(
        "❌ Aborting stage/commit because formatting checks failed.",
      );
      Deno.exit(1);
    }

    // Stage files
    if (args.stage || args.all || (args.message && staged.length === 0)) {
      const filesToStage = args.all
        ? ["-A"]
        : args._.length > 0
        ? args._.map(String)
        : targetFiles;

      console.log(`📦 Staging: ${filesToStage.join(" ")}`);
      const addRes = await runGit(["add", ...filesToStage], repoRoot);
      if (addRes.code !== 0) {
        console.error(`❌ git add failed: ${addRes.stderr}`);
        Deno.exit(1);
      }
      console.log(`✓ Files staged.`);
    }

    // Commit if message provided
    if (args.message) {
      console.log(`📝 Committing with message: "${args.message}"...`);
      const commitRes = await runGit(
        ["commit", "-m", args.message],
        repoRoot,
      );
      if (commitRes.code !== 0) {
        console.error(`❌ git commit failed: ${commitRes.stderr}`);
        Deno.exit(1);
      }
      console.log(`🎉 Commit successful!\n`);
      console.log(commitRes.stdout);
    }
  } else if (isReady) {
    console.log("Suggested commit command:");
    console.log(
      `  git add ${
        targetFiles.join(" ")
      }\n  git commit -m "docs: describe changes"`,
    );
  }
}

if (import.meta.main) {
  await main();
}
