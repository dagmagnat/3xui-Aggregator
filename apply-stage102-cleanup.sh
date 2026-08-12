#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
rm -f docs/H1CLOUD_NODES.md \
  views/dashboard.ejs.bak \
  views/nodes.ejs.bak \
  views/partials_footer.ejs.bak \
  views/partials_header.ejs.bak
printf '%s\n' 'Stage102 cleanup completed.'
