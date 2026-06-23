#!/usr/bin/env bash
# Claude Code cloud environment setup for site (Next.js).
#
# Runs as root on Ubuntu 24.04 before the session starts, per
# https://code.claude.com/docs/en/claude-code-on-the-web#setup-scripts
# Point an environment's Setup script at:  bash scripts/setup-claude-env.sh
#
# Design rules (from the docs):
#   - Never block session start: every step is non-fatal and the script exits 0.
#   - Keep total runtime under ~5 minutes so the environment cache can build.
#   - Node 20/21/22 are pre-installed via nvm; the repo pins Node 24
#     (.node-version), so this installs 24 via nvm (nodejs.org is allowlisted;
#     deb.nodesource.com is NOT, so do not use NodeSource here). It falls back to
#     the pre-installed Node if nvm or the install is unavailable.
# Idempotent and cached; safe to re-run.

set -uo pipefail

log()  { printf '==> %s\n' "$1"; }
warn() { printf 'warn: %s\n' "$1" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

persist_path() {
  [ -n "${CLAUDE_ENV_FILE:-}" ] || return 0
  printf 'export PATH="%s:$PATH"\n' "$1" >> "$CLAUDE_ENV_FILE"
}

NODE_MAJOR="$(tr -dc '0-9.' < .node-version 2>/dev/null | cut -d. -f1)"
NODE_MAJOR="${NODE_MAJOR:-24}"

# sharp ships prebuilt binaries; libvips-dev is only a fallback for source builds.
log "Installing libvips-dev (best-effort fallback for sharp)"
export DEBIAN_FRONTEND=noninteractive
{ apt-get update -y && apt-get install -y --no-install-recommends libvips-dev; } \
  || warn "could not install libvips-dev; sharp's prebuilt binary is normally enough"

# Get Node ${NODE_MAJOR} via nvm if the pre-installed Node is a different major.
current_major="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')"
if [ "$current_major" != "$NODE_MAJOR" ]; then
  for d in "${NVM_DIR:-}" /usr/local/nvm /usr/local/share/nvm "$HOME/.nvm" /root/.nvm; do
    if [ -n "$d" ] && [ -s "$d/nvm.sh" ]; then
      export NVM_DIR="$d"
      # shellcheck disable=SC1091
      . "$d/nvm.sh"
      break
    fi
  done
  if command -v nvm >/dev/null 2>&1; then
    log "Installing Node ${NODE_MAJOR} via nvm"
    if nvm install "$NODE_MAJOR" >/dev/null 2>&1; then
      nvm alias default "$NODE_MAJOR" >/dev/null 2>&1 || true
      nvm use "$NODE_MAJOR" >/dev/null 2>&1 || true
      node_bin="$(nvm which "$NODE_MAJOR" 2>/dev/null | xargs dirname 2>/dev/null)"
      [ -n "$node_bin" ] && persist_path "$node_bin"
    else
      warn "nvm could not install Node ${NODE_MAJOR}; using pre-installed Node $(node -v 2>/dev/null)"
    fi
  else
    warn "nvm not found; using pre-installed Node $(node -v 2>/dev/null). Repo pins Node ${NODE_MAJOR}."
  fi
fi

log "Node $(node -v 2>/dev/null), npm $(npm -v 2>/dev/null)"

log "Installing dependencies (npm ci)"
npm ci || warn "npm ci failed (check network access); the session can retry it in-session"

log "Warming the build (npm run build)"
npm run build || warn "npm run build did not finish; deps are installed and the session can build in-session"

log "site environment ready"
exit 0
