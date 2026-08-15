#!/bin/sh
# Publish this directory to https://jssblck.now via here.now.
# Needs the here-now skill installed globally (npx skills add heredotnow/skill --skill here-now -g)
# and an API key for me@jessica.black in $HERENOW_API_KEY or ~/.herenow/credentials.
set -eu
cd "$(dirname "$0")"
exec "$HOME/.claude/skills/here-now/scripts/publish.sh" . --slug evoked-trellis-qffd
