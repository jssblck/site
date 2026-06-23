#!/usr/bin/env bash
set -euo pipefail

# setup-claude-env.sh
#
# Provision a fresh Claude Code cloud environment for site (Next.js).
# Targets a Debian/Ubuntu Linux container that starts with nothing installed.
# Idempotent: safe to re-run. Invoke as: ./scripts/setup-claude-env.sh
#
# What it does:
#   - installs Node.js 24 (pinned in .node-version / .nvmrc) and libvips-dev
#     (required by the `sharp` image dependency on Linux)
#   - installs dependencies with `npm ci`
#   - warms the build with `npm run build`
#
# No environment variables are needed to build.

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
log()  { printf "${GREEN}==>${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}warn:${NC} %s\n" "$1" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi

apt_install() {
  if ! command -v apt-get >/dev/null 2>&1; then
    warn "apt-get not found; please install manually: $*"
    return 0
  fi
  $SUDO apt-get update -y
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "$@"
}

# Node major version is pinned by the repo; read it rather than hardcoding.
NODE_MAJOR="$(tr -dc '0-9.' < .node-version | cut -d. -f1)"
NODE_MAJOR="${NODE_MAJOR:-24}"

log "Installing system dependencies (libvips-dev for sharp)"
apt_install ca-certificates curl libvips-dev

if ! command -v node >/dev/null 2>&1 || [ "$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')" != "$NODE_MAJOR" ]; then
  log "Installing Node.js ${NODE_MAJOR}"
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO -E bash -
    apt_install nodejs
  else
    warn "apt-get unavailable; please install Node.js ${NODE_MAJOR} manually"
  fi
fi

log "Node $(node -v 2>/dev/null), npm $(npm -v 2>/dev/null)"

log "Installing dependencies (npm ci)"
npm ci

log "Warming the build (npm run build)"
npm run build

log "site environment ready"
