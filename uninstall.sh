#!/usr/bin/env bash
set -euo pipefail
cd /opt/3xui-aggregator || { echo "Каталог /opt/3xui-aggregator не найден"; exit 1; }
docker compose down -v || true
cd /
rm -rf /opt/3xui-aggregator
echo "3xui-Aggregator удалён."
