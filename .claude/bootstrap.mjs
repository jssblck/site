#!/usr/bin/env node
//
// .claude/bootstrap.mjs: the per-session half of the Claude Code environment setup.
//
// WHAT THIS IS
//   The cheap, runs-every-time half of bootstrapping a session. It is wired as a
//   SessionStart hook in .claude/settings.json and runs on every session start
//   and resume, BOTH locally and in Claude Code on the web, on macOS, Linux, and
//   Windows. The other half (cloud-setup.sh) does the cloud-only, root/apt
//   toolchain install (gh, bun) before Claude Code launches; this does the fast,
//   cross-platform per-session work.
//
//   Node specifically: Claude Code itself runs on Node, so `node` is guaranteed
//   present on every platform with no extra toolchain and no compile step. This
//   file stays Node + standard library only: no dependencies, no build.
//
// WHAT IT DOES FOR THIS REPO
//   - env vars:   none required for local dev, so the cloud env step is a no-op.
//   - git hooks:  point core.hooksPath at .githooks so the commit gate
//                 (npm run check) works in a fresh checkout. core.hooksPath is
//                 local git config and is NOT committed, so a fresh cloud clone
//                 would otherwise skip the gate entirely.
//   - deps:       npm install (package-lock.json is the source of truth).
//
//   Each step self-gates and logs and continues on error, so a hiccup never
//   blocks a session.

import { existsSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the repo root from this file's own location (<root>/.claude/bootstrap.mjs)
// rather than from process.cwd(). SessionStart hooks are invoked from the
// session's working directory, which is normally the repo root but is not
// guaranteed to be. Anchoring on import.meta.url makes every path below correct
// regardless of cwd.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const isCloud = process.env.CLAUDE_CODE_REMOTE === "true";
const log = (msg) => console.log(`[bootstrap] ${msg}`);

// --- Step 1: env vars (cloud only) -----------------------------------------
// This repo needs no dev env vars (Vercel Analytics needs none locally), so this
// is intentionally empty. If that changes, add NON-SECRET defaults here; cloud
// sessions persist them for later Bash calls via $CLAUDE_ENV_FILE. Real secrets
// belong in the cloud environment object, never in this versioned file.
function writeEnvVars() {
  log("env vars: none required for this repo; skipping.");
}

// --- Step 2: git hooks (the commit gate) -----------------------------------
// The repo keeps its pre-commit gate in .githooks/ and expects
// core.hooksPath=.githooks. That config is local and not committed, so set it
// idempotently on every session. Skips cleanly if the .githooks dir is absent.
function configureGitHooks() {
  if (!existsSync(join(repoRoot, ".githooks"))) {
    log("git hooks: no .githooks dir; skipping.");
    return;
  }
  try {
    execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    log("git hooks: core.hooksPath set to .githooks.");
  } catch (err) {
    log(`git hooks: failed (${err.message}); continuing.`);
  }
}

// --- Step 3: dependencies --------------------------------------------------
// npm is the source of truth (package-lock.json). `npm install` rather than
// `npm ci` keeps resume cheap: an up-to-date tree is a fast no-op instead of a
// full reinstall.
function installDeps() {
  if (!existsSync(join(repoRoot, "package.json"))) {
    log("deps: no package.json; skipping.");
    return;
  }
  // Run through the shell (execSync, not execFileSync) so "npm" resolves to
  // npm.cmd on Windows: Node refuses to spawn a .cmd directly via execFileSync
  // (CVE-2024-27980 hardening, EINVAL). The command is a static literal, so
  // there's no untrusted input to escape.
  try {
    execSync("npm install", { cwd: repoRoot, stdio: "inherit" });
    log("deps: npm install complete.");
  } catch (err) {
    log(`deps: npm install failed (${err.message}); continuing.`);
  }
}

log(`starting (${isCloud ? "cloud" : "local"} session, root ${repoRoot}).`);
writeEnvVars();
configureGitHooks();
installDeps();
log("done.");
