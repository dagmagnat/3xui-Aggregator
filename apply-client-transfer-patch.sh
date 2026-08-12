#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/3xui-aggregator}"
BACKUP_DIR="${BACKUP_DIR:-/opt/3xui-backups}"
PATCH_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WITH_UI="${1:-}"

FILES=(
  app.js
  install.sh
  scripts/client-transfer.py
  views/clients.ejs
  public/js/client-transfer.js
  package.json
  package-lock.json
  VERSION
  update.json
  README.md
  PATCH_NOTES_CLIENT_TRANSFER_2026-08-12.md
)

if [ "${EUID}" -ne 0 ]; then
  echo "Запусти от root: sudo -i"
  exit 1
fi
if [ ! -d "$APP_DIR" ] || [ ! -f "$APP_DIR/data/app.db" ]; then
  echo "Не найдена установка Aggregator или база: $APP_DIR/data/app.db"
  exit 1
fi
if [ "$PATCH_DIR" = "$APP_DIR" ]; then
  echo "Распакуй patch ZIP в отдельный каталог, например /root/agg-client-transfer-patch, и запусти скрипт оттуда."
  exit 1
fi
for relative_path in "${FILES[@]}"; do
  if [ ! -f "$PATCH_DIR/$relative_path" ]; then
    echo "В патче отсутствует файл: $relative_path"
    exit 1
  fi
done

stamp="$(date +%F-%H%M%S)"
backup_dir="$BACKUP_DIR/client-transfer-patch-$stamp"
mkdir -p "$backup_dir/files"
chmod 700 "$backup_dir"

echo "Создаю резервную копию базы и заменяемых файлов: $backup_dir"
cp -a "$APP_DIR/data/app.db" "$backup_dir/app.db"
for relative_path in "${FILES[@]}"; do
  if [ -f "$APP_DIR/$relative_path" ]; then
    mkdir -p "$backup_dir/files/$(dirname "$relative_path")"
    cp -a "$APP_DIR/$relative_path" "$backup_dir/files/$relative_path"
  fi
done

echo "Накладываю только файлы переноса; data, .env и настройки не изменяются."
for relative_path in "${FILES[@]}"; do
  install -D -m 0644 "$PATCH_DIR/$relative_path" "$APP_DIR/$relative_path"
done
chmod 0755 "$APP_DIR/install.sh" "$APP_DIR/scripts/client-transfer.py"

bash -n "$APP_DIR/install.sh"
if command -v node >/dev/null 2>&1; then
  node --check "$APP_DIR/app.js"
  node --check "$APP_DIR/public/js/client-transfer.js"
else
  echo "Node.js на хосте не установлен — это нормально для Docker-установки. JS-проверка будет выполнена при сборке контейнера."
fi
python3 -B "$APP_DIR/scripts/client-transfer.py" --help >/dev/null

echo "SSH-экспорт уже готов и не требует перезапуска панели:"
echo "  agg clients export /root/aggregator-clients.json"

if [ "$WITH_UI" = "--with-ui" ]; then
  echo "Собираю образ с кнопкой переноса в интерфейсе..."
  (cd "$APP_DIR" && docker compose build aggregator)
  (cd "$APP_DIR" && docker compose up -d)
  echo "Интерфейс Aggregator обновлён."
else
  echo "Контейнер не перезапускался. Для кнопки в интерфейсе позже выполни:"
  echo "  cd $APP_DIR && docker compose up -d --build"
fi

echo "Готово. Резервная копия: $backup_dir"
