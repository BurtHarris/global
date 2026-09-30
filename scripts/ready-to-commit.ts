#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write
/**
 * ready-to-commit.ts — Pre-commit readiness validator and helper for Deno & Git.
 *
 * Checks & Features:
 *  1. Working tree changes (staged, unstaged, untracked).
 *  2. Branch divergence against upstream (@{u} ahead/behind).
 *  3. Automatic or on-demand rebase (git pull --rebase --autostash).
 *  4. Code & Markdown formatting (deno fmt --check / --fix) on touched files.
 *  5. Monorepo package version bumping (patch, minor, major) via @std/semver:
 *     - Prompts on 'main' branch for affected packages.
 *     - Acknowledges unpublished local workflows on 'master' branch.
 *  6. Staging (--stage / -s) and committing (-m "message").
 *
 * Usage:
 *  deno run -A scripts/ready-to-commit.ts
 *  deno run -A scripts/ready-to-commit.ts --rebase
 *  deno run -A scripts/ready-to-commit.ts --bump patch
 *  deno run -A scripts/ready-to-commit.ts -f -s -m "feat: updates"
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
import {
  format as formatSemver,
  increment,
  parse as parseSemver,
} from "jsr:@std/semver";
import type { ReleaseType } from "jsr:@std/semver/types";

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

interface PackageInfo {
  name: string;
  dir: string;
  manifestPath: string;
  type: "deno" | "npm";
  version: string;
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
    env: { NO_COLOR: "1" },
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

/**
 * Discover monorepo packages that have a deno.json or package.json with a version.
 */
function discoverPackages(repoRoot: string): PackageInfo[] {
  const packages: PackageInfo[] = [];

  for (const entry of Deno.readDirSync(repoRoot)) {
    if (
      !entry.isDirectory || entry.name.startsWith(".") ||
      entry.name === "node_modules"
    ) {
      continue;
    }

    const dirPath = join(repoRoot, entry.name);

    // Check deno.json / deno.jsonc
    for (const manifestName of ["deno.json", "deno.jsonc"]) {
      const manifestPath = join(dirPath, manifestName);
      try {
        const text = Deno.readTextFileSync(manifestPath);
        const json = JSON.parse(text);
        if (json.version) {
          packages.push({
            name: json.name || entry.name,
            dir: entry.name,
            manifestPath,
            type: "deno",
            version: String(json.version),
          });
          break;
        }
      } catch {
        // Not a valid manifest
      }
    }

    // Check package.json if not already a deno package
    if (!packages.some((p) => p.dir === entry.name)) {
      const pkgPath = join(dirPath, "package.json");
      try {
        const text = Deno.readTextFileSync(pkgPath);
        const json = JSON.parse(text);
        if (json.version) {
          packages.push({
            name: json.name || entry.name,
            dir: entry.name,
            manifestPath: pkgPath,
            type: "npm",
            version: String(json.version),
          });
        }
      } catch {
        // Not a package.json
      }
    }
  }

  return packages;
}

/**
 * Bump version of a package manifest and save back to disk.
 */
function bumpPackageVersion(
  pkg: PackageInfo,
  releaseType: ReleaseType,
  prereleaseId?: string,
): string {
  const current = parseSemver(pkg.version);
  const options = prereleaseId ? { prerelease: prereleaseId } : undefined;
  const next = increment(current, releaseType, options);
  const nextVersionStr = formatSemver(next);

  const text = Deno.readTextFileSync(pkg.manifestPath);
  const json = JSON.parse(text);
  json.version = nextVersionStr;
  Deno.writeTextFileSync(
    pkg.manifestPath,
    JSON.stringify(json, null, 2) + "\n",
  );

  return nextVersionStr;
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "fix", "stage", "all", "rebase", "no-prompt"],
    string: ["message", "bump", "pkg", "preid"],
    alias: {
      h: "help",
      f: "fix",
      s: "stage",
      a: "all",
      r: "rebase",
      m: "message",
      b: "bump",
      p: "pkg",
    },
  });

  if (args.help) {
    console.log(`
ready-to-commit — Validate repository changes, rebase, bump versions, and commit

USAGE:
  deno run -A scripts/ready-to-commit.ts [OPTIONS] [files...]

OPTIONS:
  -f, --fix          Auto-format unformatted files using 'deno fmt'
  -r, --rebase       Run 'git pull --rebase --autostash' if diverged or behind
  -b, --bump TYPE    Bump package version (patch | minor | major)
  -p, --pkg NAME     Specific package to bump (defaults to touched packages)
  -s, --stage        Stage modified and untracked files (or specified files)
  -a, --all          Include all changes when staging
  -m, --message MSG  Commit with the specified message if validation passes
      --no-prompt    Disable interactive terminal prompts
  -h, --help         Show this help message

EXAMPLES:
  # Check readiness
  deno run -A scripts/ready-to-commit.ts

  # Rebase against upstream and format files
  deno run -A scripts/ready-to-commit.ts --rebase --fix

  # Bump patch version for touched package, format, stage, and commit
  deno run -A scripts/ready-to-commit.ts -f -s --bump patch -m "feat(fuzz): enhance API"
`);
    Deno.exit(0);
  }

  const repoRoot = findRepoRoot();
  console.log(`\n📂 Repository root: ${repoRoot}`);

  // 1. Branch & Upstream Divergence Check
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

  console.log(`🌿 Current branch:  ${branchName}`);
  if (upstream) {
    let syncStatus = "In sync";
    if (ahead > 0 && behind > 0) {
      syncStatus = `⚠️  Diverged (Ahead: ${ahead}, Behind: ${behind})`;
    } else if (ahead > 0) {
      syncStatus = `Ahead of ${upstream} by ${ahead} commit(s)`;
    } else if (behind > 0) {
      syncStatus = `⚠️  Behind ${upstream} by ${behind} commit(s)`;
    } else {
      syncStatus = `✓ Up to date with ${upstream}`;
    }
    console.log(`🌐 Remote tracking: ${upstream} (${syncStatus})`);
  } else {
    console.log(`🌐 Remote tracking: None configured`);
  }

  // 2. Handle Git Rebase if requested or diverged
  const needsRebase = upstream && (behind > 0 || (ahead > 0 && behind > 0));
  let shouldRebase = args.rebase;

  if (
    !shouldRebase && needsRebase && Deno.stdin.isTerminal() &&
    !args["no-prompt"]
  ) {
    const answer = prompt(
      `\n🔄 Branch is behind/diverged. Run 'git pull --rebase --autostash'? (y/N):`,
    );
    if (answer && answer.toLowerCase().startsWith("y")) {
      shouldRebase = true;
    }
  }

  if (shouldRebase && upstream) {
    console.log(`\n🔄 Running 'git pull --rebase --autostash'...`);
    const rebaseRes = await runGit(
      ["pull", "--rebase", "--autostash"],
      repoRoot,
    );
    if (rebaseRes.code === 0) {
      console.log(`✓ Successfully rebased against ${upstream}.`);
      console.log(rebaseRes.stdout);
    } else {
      console.error(
        `❌ Rebase encountered an issue:\n${
          rebaseRes.stderr || rebaseRes.stdout
        }`,
      );
      Deno.exit(1);
    }
  }

  // 3. Inspect Git Status
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

  const allTouched = Array.from(
    new Set([...staged, ...unstaged, ...untracked]),
  );
  const targetFiles = args._.length > 0
    ? args._.map((f) => normalizeToRepo(String(f), repoRoot))
    : allTouched;

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

  // 4. Package Versioning
  const packages = discoverPackages(repoRoot);
  const touchedPackages = packages.filter((pkg) =>
    targetFiles.some((f) => f.startsWith(`${pkg.dir}/`))
  );

  const isReleaseBranch = branchName === "main";
  const prereleaseId = args.preid ||
    (branchName === "master"
      ? "dev"
      : branchName.replace(/[^a-zA-Z0-9]/g, "."));

  console.log("\n--- Package Versioning ---");
  console.log(
    isReleaseBranch
      ? `🌿 Branch 'main': production releases (stable semver).`
      : `🌿 Branch '${branchName}': pre-release versions (using identifier '${prereleaseId}').`,
  );

  const packagesToConsider = args.pkg
    ? packages.filter((p) => p.name === args.pkg || p.dir === args.pkg)
    : touchedPackages.length > 0
    ? touchedPackages
    : packages;

  if (packagesToConsider.length > 0) {
    for (const pkg of packagesToConsider) {
      let releaseType: ReleaseType | null = null;

      if (args.bump) {
        const val = args.bump.toLowerCase();
        if (isReleaseBranch) {
          if (["patch", "minor", "major"].includes(val)) {
            releaseType = val as ReleaseType;
          } else {
            console.error(
              `❌ Invalid bump type '${args.bump}' on main. Expected patch, minor, or major.`,
            );
          }
        } else {
          // Pre-release branch: map patch->prepatch, minor->preminor, major->premajor
          if (val === "patch" || val === "prepatch") releaseType = "prepatch";
          else if (val === "minor" || val === "preminor") {
            releaseType = "preminor";
          } else if (val === "major" || val === "premajor") {
            releaseType = "premajor";
          } else if (val === "prerelease" || val === "pre") {
            releaseType = "prerelease";
          } else {
            console.error(
              `❌ Invalid bump type '${args.bump}' on ${branchName}. Expected prepatch, preminor, premajor, or prerelease.`,
            );
          }
        }
      } else if (Deno.stdin.isTerminal() && !args["no-prompt"]) {
        const promptMsg = isReleaseBranch
          ? `📦 Package '${pkg.name}' (current: v${pkg.version}) has changes.\n   Bump release? [p]atch, [m]inor, [M]ajor, [s]kip (default: s): `
          : `📦 Package '${pkg.name}' (current: v${pkg.version}) on branch '${branchName}'.\n   Bump pre-release? [p]repatch, [m]inor, [M]ajor, [r] prerelease, [s]kip (default: s): `;

        const choice = prompt(promptMsg);
        if (choice) {
          const c = choice.trim().toLowerCase();
          if (isReleaseBranch) {
            if (c === "p" || c === "patch") releaseType = "patch";
            else if (c === "m" || c === "minor") releaseType = "minor";
            else if (c === "major") releaseType = "major";
          } else {
            if (c === "p" || c === "patch" || c === "prepatch") {
              releaseType = "prepatch";
            } else if (c === "m" || c === "minor" || c === "preminor") {
              releaseType = "preminor";
            } else if (c === "major" || c === "premajor") {
              releaseType = "premajor";
            } else if (c === "r" || c === "prerelease" || c === "pre") {
              releaseType = "prerelease";
            }
          }
        }
      }

      if (releaseType) {
        const newVer = bumpPackageVersion(
          pkg,
          releaseType,
          isReleaseBranch ? undefined : prereleaseId,
        );
        console.log(`🚀 Bumped ${pkg.name}: v${pkg.version} ➔ v${newVer}`);
        const relManifest = normalizeToRepo(pkg.manifestPath, repoRoot);
        if (!targetFiles.includes(relManifest)) {
          targetFiles.push(relManifest);
        }
      } else {
        console.log(`  Package '${pkg.name}': v${pkg.version} (no bump)`);
      }
    }
  } else {
    console.log(`  No workspace packages directly touched by these changes.`);
  }

  // 5. Formatting check on formattable touched files
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

  // 6. Readiness Verdict
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

  // 7. Optional Stage & Commit
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
