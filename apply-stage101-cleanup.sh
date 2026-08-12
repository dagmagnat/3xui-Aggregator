#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
rm -f docs/H1CLOUD_NODES.md
rm -f views/dashboard.ejs.bak views/nodes.ejs.bak views/partials_footer.ejs.bak views/partials_header.ejs.bak
echo "Stage101 cleanup complete. Rebuild with: docker compose up -d --build"
