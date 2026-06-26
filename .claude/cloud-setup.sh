#!/usr/bin/env bash
#
# .claude/cloud-setup.sh: the cloud "Setup script" half of the Claude Code
# environment setup pattern.
#
# WHAT THIS IS
#   The toolchain-install half of bootstrapping a Claude Code on the web session.
#   It installs tools the cloud base image does NOT ship but this repo needs. It
#   is wired into the cloud environment's "Setup script" field with a one-line
#   guarded bootstrap:
#
#       if [ -f .claude/cloud-setup.sh ]; then bash .claude/cloud-setup.sh; fi
#
#   The Setup script runs before Claude Code launches and may re-run on any fresh
#   session (after you change the script or the network allowlist, and
#   periodically), so every step is idempotent and a fast skip on the no-op path.
#   Cross-platform per-session work that must also run locally and on resume lives
#   in bootstrap.mjs instead.
#
# WHAT THIS REPO NEEDS
#   This is a Next.js + TypeScript site. The base image already ships node, npm,
#   and the language registries, so the core dev loop (npm install, npm run dev,
#   npm run check, npm run build) works on the image node as-is. engines pins
#   node 24.x / npm 11, but that is advisory (no engine-strict) and the app runs
#   fine on the image's node, so we do not fight the image PATH to swap node.
#   The two genuine gaps are:
#     - gh:  used for opening PRs from a session.
#     - bun: used by the package.json `threebody:*` scripts.
#
# SCOPE
#   Cloud only, Ubuntu only, runs as root. If invoked somewhere without apt
#   (e.g. a curious local run on macOS), it no-ops rather than erroring.

set -euo pipefail

log() { printf '[cloud-setup] %s\n' "$*"; }

# Ubuntu/apt only. Anywhere else, do nothing.
if ! command -v apt-get >/dev/null 2>&1; then
  log "apt-get not found; this script targets the Ubuntu cloud image only. Skipping."
  exit 0
fi

# Map uname -> the arch slugs each project's release artifacts use. gh uses the
# Debian-style amd64/arm64; bun uses x64/aarch64. Keep both.
case "$(uname -m)" in
  x86_64)  GH_ARCH=amd64; BUN_ARCH=x64 ;;
  aarch64) GH_ARCH=arm64; BUN_ARCH=aarch64 ;;
  *)       GH_ARCH=""; BUN_ARCH="" ;;
esac

# --- gh (GitHub CLI, from the published release tarball) --------------------
# We pull the release asset from github.com rather than the cli.github.com apt
# repo because the GitHub release-asset hosts are on the Trusted allowlist and
# cli.github.com is not. Reads GH_TOKEN from the environment if you set one.
if command -v gh >/dev/null 2>&1; then
  log "gh already present ($(gh --version | head -1)); skipping."
elif [ -z "$GH_ARCH" ]; then
  log "unsupported arch '$(uname -m)' for the gh release tarball; skipping gh."
else
  log "installing gh from its GitHub release..."
  # Resolve the latest tag in two steps (curl into a variable, THEN grep)
  # rather than `curl | grep -m1`. Under `set -o pipefail`, piping straight into
  # `grep -m1` is a race: grep exits on the first match and closes the pipe
  # while curl is still writing the (large) JSON body, so curl dies on SIGPIPE
  # with exit 23 ("Failure writing output to destination"). pipefail propagates
  # that and `set -e` turns it into a fatal abort. Buffering the body first lets
  # curl finish cleanly before grep ever runs.
  ghmeta="$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest)"
  ghver="$(printf '%s' "$ghmeta" | grep -m1 '"tag_name"' | sed -E 's/.*"v?([^"]+)".*/\1/')"
  if [ -z "$ghver" ]; then
    log "could not determine the latest gh release tag; skipping gh."
  else
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/gh.tar.gz" \
      "https://github.com/cli/cli/releases/download/v${ghver}/gh_${ghver}_linux_${GH_ARCH}.tar.gz"
    tar -xzf "$tmp/gh.tar.gz" -C "$tmp"
    install -m 0755 "$tmp/gh_${ghver}_linux_${GH_ARCH}/bin/gh" /usr/local/bin/gh
    rm -rf "$tmp"
    log "installed $(gh --version | head -1)"
  fi
fi

# --- bun (used by the package.json `threebody:*` scripts) -------------------
# Installed straight from the oven-sh/bun GitHub release zip (Trusted allowlist)
# rather than the bun.sh installer, whose host is not on the Trusted list. The
# release ships a .zip, so we make sure `unzip` is present first.
if command -v bun >/dev/null 2>&1; then
  log "bun already present ($(bun --version)); skipping."
elif [ -z "$BUN_ARCH" ]; then
  log "unsupported arch '$(uname -m)' for the bun release zip; skipping bun."
else
  if ! command -v unzip >/dev/null 2>&1; then
    log "installing unzip (needed to unpack the bun release)..."
    apt-get update -qq
    apt-get install -y -qq unzip
  fi
  log "installing bun from its GitHub release..."
  # Same curl-then-grep SIGPIPE avoidance as above.
  bunmeta="$(curl -fsSL https://api.github.com/repos/oven-sh/bun/releases/latest)"
  buntag="$(printf '%s' "$bunmeta" | grep -m1 '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')"
  if [ -z "$buntag" ]; then
    log "could not determine the latest bun release tag; skipping bun."
  else
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/bun.zip" \
      "https://github.com/oven-sh/bun/releases/download/${buntag}/bun-linux-${BUN_ARCH}.zip"
    unzip -q "$tmp/bun.zip" -d "$tmp"
    install -m 0755 "$tmp/bun-linux-${BUN_ARCH}/bun" /usr/local/bin/bun
    rm -rf "$tmp"
    log "installed bun $(bun --version)"
  fi
fi

log "done."
