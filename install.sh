#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/3xui-aggregator"
REPO_URL_DEFAULT="https://github.com/dagmagnat/3xui-Aggregator.git"
BRANCH_DEFAULT="main"

GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
CYAN='\033[1;36m'
NC='\033[0m'

ENV_FILE="$APP_DIR/.env"
INSTALL_CONF="$APP_DIR/.install.conf"
BACKUP_DIR="/opt/3xui-backups"
SHORTCUT_BIN="/usr/local/bin/agg"

say() { echo -e "${GREEN}$*${NC}"; }
warn() { echo -e "${YELLOW}$*${NC}"; }
err() { echo -e "${RED}$*${NC}"; }
info() { echo -e "${CYAN}$*${NC}"; }

require_root() {
  if [ "${EUID}" -ne 0 ]; then
    err "Запусти установку от root: sudo -i"
    exit 1
  fi
}

ask() {
  local prompt="$1"
  local default="${2-}"
  local value
  if [ -n "$default" ]; then
    read -r -p "$prompt [$default]: " value || true
    value="${value//$'\r'/}"
    echo "${value:-$default}"
  else
    read -r -p "$prompt: " value || true
    value="${value//$'\r'/}"
    echo "$value"
  fi
}

ask_secret_optional() {
  local prompt="$1"
  local value
  read -r -s -p "$prompt: " value || true
  echo
  value="${value//$'\r'/}"
  echo "$value"
}

trim() {
  local var="$1"
  var="${var//$'\r'/}"
  var="${var#\"${var%%[![:space:]]*}\"}"
  var="${var%\"${var##*[![:space:]]}\"}"
  echo "$var"
}

validate_domain() {
  local domain="$1"
  domain="$(trim "$domain")"
  if ! printf '%s' "$domain" | grep -Eq '^[A-Za-z0-9.-]+$'; then
    err "Домен введён некорректно: $domain"
    exit 1
  fi
}

validate_email() {
  local email="$1"
  email="$(trim "$email")"
  if ! printf '%s' "$email" | grep -Eq '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; then
    err "Email введён некорректно."
    exit 1
  fi
}

port_in_use() {
  local port="$1"
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${port}$"
}

check_domain_ports_if_needed() {
  local need_80_443="0"

  if [ "${PANEL_MODE}" = "domain" ] || [ "${SUB_MODE}" = "domain" ]; then
    need_80_443="1"
  fi

  if [ "$need_80_443" != "1" ]; then
    return
  fi

  local bad=0

  if port_in_use 80; then
    err "Порт 80 уже занят. Для доменного режима через встроенный Caddy он должен быть свободен."
    bad=1
  fi

  if port_in_use 443; then
    err "Порт 443 уже занят. Для доменного режима через встроенный Caddy он должен быть свободен."
    bad=1
  fi

  if [ "$bad" -eq 1 ]; then
    warn "На этом сервере уже заняты 80/443."
    warn "Если это был старый стек агрегатора, он должен был быть уже остановлен."
    warn "Если порты всё ещё заняты — их использует другой сервис, не сам агрегатор."
    warn "Кто держит порты:"
    ss -ltnp 2>/dev/null | grep -E '(:80 |:443 )' || true
    warn "Варианты:"
    warn "1) установить агрегатор по IP"
    warn "2) вынести агрегатор на отдельный сервер"
    warn "3) настроить общий reverse proxy вручную"
    exit 1
  fi
}

ensure_dir() {
  mkdir -p "$APP_DIR"
  mkdir -p "$APP_DIR/data"
  mkdir -p "$BACKUP_DIR"
}

load_existing_config() {
  APP_PORT="${APP_PORT:-3000}"
  ADMIN_USER="${ADMIN_USER:-admin}"
  ADMIN_PASS="${ADMIN_PASS:-}"
  APP_SECRET_VALUE="${APP_SECRET_VALUE:-}"
  SESSION_SECRET_VALUE="${SESSION_SECRET_VALUE:-}"
  PANEL_PUBLIC_URL="${PANEL_PUBLIC_URL:-}"
  SUB_PUBLIC_URL="${SUB_PUBLIC_URL:-}"

  if [ -f "$ENV_FILE" ]; then
    while IFS='=' read -r key value; do
      [ -z "$key" ] && continue
      case "$key" in
        PORT) APP_PORT="$value" ;;
        ADMIN_USERNAME) ADMIN_USER="$value" ;;
        ADMIN_PASSWORD) ADMIN_PASS="$value" ;;
        APP_SECRET) APP_SECRET_VALUE="$value" ;;
        SESSION_SECRET) SESSION_SECRET_VALUE="$value" ;;
        PANEL_PUBLIC_URL) PANEL_PUBLIC_URL="$value" ;;
        SUB_PUBLIC_URL) SUB_PUBLIC_URL="$value" ;;
      esac
    done < <(grep -E '^(PORT|ADMIN_USERNAME|ADMIN_PASSWORD|APP_SECRET|SESSION_SECRET|PANEL_PUBLIC_URL|SUB_PUBLIC_URL)=' "$ENV_FILE" || true)
  fi

  if [ -f "$INSTALL_CONF" ]; then
    # shellcheck disable=SC1090
    source "$INSTALL_CONF"
  fi

  PANEL_MODE="${PANEL_MODE:-ip}"
  PANEL_DOMAIN="${PANEL_DOMAIN:-}"
  PANEL_IP="${PANEL_IP:-}"
  PANEL_EMAIL="${PANEL_EMAIL:-}"

  SUB_MODE="${SUB_MODE:-$PANEL_MODE}"
  SUB_DOMAIN="${SUB_DOMAIN:-}"
  SUB_IP="${SUB_IP:-}"
}

save_install_conf() {
  cat > "$INSTALL_CONF" <<EOF
PANEL_MODE=${PANEL_MODE}
PANEL_DOMAIN=${PANEL_DOMAIN}
PANEL_IP=${PANEL_IP}
PANEL_EMAIL=${PANEL_EMAIL}
SUB_MODE=${SUB_MODE}
SUB_DOMAIN=${SUB_DOMAIN}
SUB_IP=${SUB_IP}
APP_PORT=${APP_PORT}
EOF
}

write_env_file() {
  if [ -z "${APP_SECRET_VALUE:-}" ]; then
    APP_SECRET_VALUE="$(openssl rand -hex 32)"
  fi

  if [ -z "${SESSION_SECRET_VALUE:-}" ]; then
    SESSION_SECRET_VALUE="$(openssl rand -hex 32)"
  fi

  ADMIN_USER="$(printf '%s' "$ADMIN_USER" | tr -d '\r\n')"
  ADMIN_PASS="$(printf '%s' "$ADMIN_PASS" | tr -d '\r\n')"

  cat > "$ENV_FILE" <<EOF
PORT=${APP_PORT}
APP_SECRET=${APP_SECRET_VALUE}
SESSION_SECRET=${SESSION_SECRET_VALUE}
ADMIN_USERNAME=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASS}
BASE_URL=${SUB_PUBLIC_URL}
PANEL_PUBLIC_URL=${PANEL_PUBLIC_URL}
SUB_PUBLIC_URL=${SUB_PUBLIC_URL}
NODE_ENV=production
EOF
}

install_packages() {
  say "Обновляю пакеты..."
  apt-get update -y
  apt-get install -y ca-certificates curl git lsb-release openssl apt-transport-https software-properties-common
}

install_docker_if_needed() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    say "Docker и Docker Compose уже установлены."
    return
  fi

  say "Устанавливаю Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker

  if ! docker compose version >/dev/null 2>&1; then
    err "Docker установлен, но docker compose недоступен."
    exit 1
  fi
}

clone_or_update_repo() {
  local repo_url="$1"
  local branch="$2"

  if [ -d "$APP_DIR/.git" ]; then
    warn "Каталог $APP_DIR уже существует. Принудительно обновляю проект..."
    git -C "$APP_DIR" fetch --all
    git -C "$APP_DIR" checkout "$branch"
    git -C "$APP_DIR" reset --hard "origin/$branch"
  else
    say "Клонирую проект в $APP_DIR ..."
    rm -rf "$APP_DIR"
    git clone -b "$branch" "$repo_url" "$APP_DIR"
  fi
}

write_dockerfile_patch_note() {
  if [ -f "$APP_DIR/Dockerfile" ]; then
    info "Проверь, чтобы в Dockerfile был фикс IPv4 для npm:"
    info "ENV NODE_OPTIONS=--dns-result-order=ipv4first"
  fi
}

write_compose_ip_only() {
  cat > "$APP_DIR/docker-compose.yml" <<EOF
services:
  aggregator:
    build: .
    container_name: 3xui-aggregator
    restart: unless-stopped
    ports:
      - "${APP_PORT}:${APP_PORT}"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
EOF
}

write_caddyfile_single_or_dual() {
  local domains=()
  local email="$PANEL_EMAIL"

  if [ "${PANEL_MODE}" = "domain" ]; then
    domains+=("$PANEL_DOMAIN")
  fi

  if [ "${SUB_MODE}" = "domain" ] && [ "$SUB_DOMAIN" != "$PANEL_DOMAIN" ]; then
    domains+=("$SUB_DOMAIN")
  fi

  if [ -z "$email" ]; then
    err "Для доменного режима нужен email для SSL."
    exit 1
  fi

  {
    echo "{"
    echo "    email $email"
    echo "}"
    echo
    for d in "${domains[@]}"; do
      echo "$d {"
      echo "    encode gzip"
      echo "    reverse_proxy aggregator:${APP_PORT}"
      echo "}"
      echo
    done
  } > "$APP_DIR/Caddyfile"
}

write_compose_domain_only() {
  cat > "$APP_DIR/docker-compose.yml" <<EOF
services:
  aggregator:
    build: .
    container_name: 3xui-aggregator
    restart: unless-stopped
    expose:
      - "${APP_PORT}"
    env_file:
      - .env
    volumes:
      - ./data:/app/data

  caddy:
    image: caddy:2
    container_name: 3xui-aggregator-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - aggregator

volumes:
  caddy_data:
  caddy_config:
EOF
}

write_compose_mixed_domain_ip() {
  cat > "$APP_DIR/docker-compose.yml" <<EOF
services:
  aggregator:
    build: .
    container_name: 3xui-aggregator
    restart: unless-stopped
    ports:
      - "${APP_PORT}:${APP_PORT}"
    env_file:
      - .env
    volumes:
      - ./data:/app/data

  caddy:
    image: caddy:2
    container_name: 3xui-aggregator-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - aggregator

volumes:
  caddy_data:
  caddy_config:
EOF
}

write_runtime_files() {
  local has_domain="0"
  local has_ip="0"

  [ "$PANEL_MODE" = "domain" ] && has_domain="1"
  [ "$SUB_MODE" = "domain" ] && has_domain="1"
  [ "$PANEL_MODE" = "ip" ] && has_ip="1"
  [ "$SUB_MODE" = "ip" ] && has_ip="1"

  rm -f "$APP_DIR/Caddyfile"

  if [ "$has_domain" = "1" ]; then
    write_caddyfile_single_or_dual
    if [ "$has_ip" = "1" ]; then
      write_compose_mixed_domain_ip
    else
      write_compose_domain_only
    fi
  else
    write_compose_ip_only
  fi
}

start_stack() {
  say "Собираю и запускаю контейнеры..."
  cd "$APP_DIR"
  docker compose up -d --build
}

stop_existing_aggregator_stack() {
  if [ ! -d "$APP_DIR" ]; then
    return
  fi

  info "Обнаружен существующий стек агрегатора. Временно останавливаю для обновления..."
  cd "$APP_DIR" || return

  docker compose down --remove-orphans || true
  docker stop 3xui-aggregator-caddy >/dev/null 2>&1 || true
  docker rm -f 3xui-aggregator-caddy >/dev/null 2>&1 || true
  docker stop 3xui-aggregator >/dev/null 2>&1 || true
  docker rm -f 3xui-aggregator >/dev/null 2>&1 || true
}

install_shortcut_command() {
  cat > "$SHORTCUT_BIN" <<EOF
#!/usr/bin/env bash
exec bash "$APP_DIR/install.sh" "\$@"
EOF
  chmod +x "$SHORTCUT_BIN"
}

create_backup() {
  say "Создаю резервную копию..."
  mkdir -p "$BACKUP_DIR"

  local stamp archive_name archive_path
  stamp="$(date +%F-%H%M%S)"
  archive_name="3xui-aggregator-backup-${stamp}.tar.gz"
  archive_path="$BACKUP_DIR/$archive_name"

  stop_existing_aggregator_stack
  tar -czf "$archive_path" -C /opt 3xui-aggregator

  say "Резервная копия создана:"
  say "$archive_path"

  if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    docker compose up -d --build || true
  fi
}

restore_from_backup() {
  say "Восстановление из резервной копии"
  mkdir -p "$BACKUP_DIR"

  local latest_backup=""
  latest_backup="$(ls -1t "$BACKUP_DIR"/3xui-aggregator-backup-*.tar.gz 2>/dev/null | head -n 1 || true)"

  local archive_path
  archive_path="$(ask 'Путь к архиву резервной копии' "${latest_backup:-/opt/3xui-backups/backup.tar.gz}")"
  archive_path="$(trim "$archive_path")"

  if [ ! -f "$archive_path" ]; then
    err "Архив не найден: $archive_path"
    exit 1
  fi

  stop_existing_aggregator_stack
  rm -rf "$APP_DIR"
  mkdir -p /opt

  say "Распаковываю резервную копию..."
  tar -xzf "$archive_path" -C /opt

  if [ ! -d "$APP_DIR" ]; then
    err "После распаковки каталог $APP_DIR не найден."
    exit 1
  fi

  install_docker_if_needed
  install_shortcut_command

  cd "$APP_DIR"
  docker compose up -d --build

  say "Восстановление завершено."
}

get_public_server_ip() {
  local server_ip
  server_ip="$(curl -4 -fsSL https://api.ipify.org || echo "127.0.0.1")"
  server_ip="$(trim "$server_ip")"
  echo "$server_ip"
}

build_urls() {
  local server_ip="${1:-}"

  if [ "$PANEL_MODE" = "domain" ]; then
    PANEL_PUBLIC_URL="https://${PANEL_DOMAIN}"
  else
    if [ -z "${PANEL_IP:-}" ]; then
      PANEL_IP="$server_ip"
    fi
    PANEL_PUBLIC_URL="http://${PANEL_IP}:${APP_PORT}"
  fi

  if [ "$SUB_MODE" = "domain" ]; then
    SUB_PUBLIC_URL="https://${SUB_DOMAIN}"
  else
    if [ -z "${SUB_IP:-}" ]; then
      SUB_IP="$server_ip"
    fi
    SUB_PUBLIC_URL="http://${SUB_IP}:${APP_PORT}"
  fi
}

prompt_panel_mode() {
  echo
  say "Выбери режим для панели:"
  say "1 - По IP"
  say "2 - По домену"
  say "3 - Пропустить, оставить как есть"
  local choice
  choice="$(ask 'Выбор для панели' '3')"
  choice="$(trim "$choice")"

  case "$choice" in
    1)
      PANEL_MODE="ip"
      local default_ip
      default_ip="${PANEL_IP:-$(get_public_server_ip)}"
      PANEL_IP="$(ask 'IP для панели' "$default_ip")"
      PANEL_IP="$(trim "$PANEL_IP")"
      ;;
    2)
      PANEL_MODE="domain"
      PANEL_DOMAIN="$(ask 'Домен для панели' "${PANEL_DOMAIN:-}")"
      PANEL_DOMAIN="$(trim "$PANEL_DOMAIN")"
      validate_domain "$PANEL_DOMAIN"

      PANEL_EMAIL="$(ask 'Email для SSL (LE / Caddy)' "${PANEL_EMAIL:-}")"
      PANEL_EMAIL="$(trim "$PANEL_EMAIL")"
      validate_email "$PANEL_EMAIL"
      ;;
    3)
      info "Настройки панели оставлены без изменений."
      ;;
    *)
      err "Неверный выбор."
      exit 1
      ;;
  esac
}

prompt_sub_mode() {
  echo
  say "Настройка адреса подписок:"
  say "1 - По IP"
  say "2 - По домену"
  say "3 - Пропустить, оставить как есть"
  local choice
  choice="$(ask 'Выбор для подписок' '3')"
  choice="$(trim "$choice")"

  case "$choice" in
    1)
      SUB_MODE="ip"
      local default_ip
      default_ip="${SUB_IP:-$(get_public_server_ip)}"
      SUB_IP="$(ask 'IP для подписок' "$default_ip")"
      SUB_IP="$(trim "$SUB_IP")"
      ;;
    2)
      SUB_MODE="domain"
      SUB_DOMAIN="$(ask 'Домен для подписок' "${SUB_DOMAIN:-}")"
      SUB_DOMAIN="$(trim "$SUB_DOMAIN")"
      validate_domain "$SUB_DOMAIN"

      if [ -z "${PANEL_EMAIL:-}" ]; then
        PANEL_EMAIL="$(ask 'Email для SSL (LE / Caddy)' '')"
        PANEL_EMAIL="$(trim "$PANEL_EMAIL")"
        validate_email "$PANEL_EMAIL"
      fi
      ;;
    3)
      info "Настройки подписок оставлены без изменений."
      ;;
    *)
      err "Неверный выбор."
      exit 1
      ;;
  esac
}

prompt_port_change() {
  echo
  say "Порт приложения:"
  say "1 - Изменить порт"
  say "2 - Оставить текущий"
  local choice
  choice="$(ask 'Выбор по порту' '2')"
  choice="$(trim "$choice")"

  case "$choice" in
    1)
      local new_port
      new_port="$(ask 'Порт панели агрегатора' "${APP_PORT:-3000}")"
      new_port="$(trim "$new_port")"
      if ! [[ "$new_port" =~ ^[0-9]+$ ]]; then
        err "Порт должен быть числом."
        exit 1
      fi
      APP_PORT="$new_port"
      ;;
    2)
      info "Порт оставлен без изменений."
      ;;
    *)
      err "Неверный выбор."
      exit 1
      ;;
  esac
}

prompt_admin_change() {
  echo
  say "Учетные данные панели:"
  say "1 - Изменить логин и/или пароль"
  say "2 - Оставить текущие"
  local choice
  choice="$(ask 'Выбор по логину/паролю' '2')"
  choice="$(trim "$choice")"

  case "$choice" in
    1)
      ADMIN_USER="$(ask 'Логин администратора панели' "${ADMIN_USER:-admin}")"
      ADMIN_USER="$(trim "$ADMIN_USER")"

      local new_pass
      new_pass="$(ask_secret_optional 'Новый пароль администратора (оставь пустым, чтобы не менять)')"
      new_pass="$(trim "$new_pass")"

      if [ -n "$new_pass" ]; then
        ADMIN_PASS="$new_pass"
      fi

      if [ -z "${ADMIN_PASS:-}" ]; then
        err "Пароль не должен быть пустым."
        exit 1
      fi
      ;;
    2)
      info "Логин и пароль оставлены без изменений."
      ;;
    *)
      err "Неверный выбор."
      exit 1
      ;;
  esac
}

first_install_wizard() {
  local server_ip
  server_ip="$(get_public_server_ip)"

  say "Выбери режим для панели:"
  say "1 - По IP"
  say "2 - По домену"
  local panel_choice
  panel_choice="$(ask 'Режим панели' '1')"
  panel_choice="$(trim "$panel_choice")"

  case "$panel_choice" in
    1)
      PANEL_MODE="ip"
      PANEL_IP="$(ask 'IP для панели' "$server_ip")"
      PANEL_IP="$(trim "$PANEL_IP")"
      ;;
    2)
      PANEL_MODE="domain"
      PANEL_DOMAIN="$(ask 'Домен для панели' '')"
      PANEL_DOMAIN="$(trim "$PANEL_DOMAIN")"
      validate_domain "$PANEL_DOMAIN"

      PANEL_EMAIL="$(ask 'Email для SSL (LE / Caddy)' '')"
      PANEL_EMAIL="$(trim "$PANEL_EMAIL")"
      validate_email "$PANEL_EMAIL"
      ;;
    *)
      err "Неизвестный режим панели."
      exit 1
      ;;
  esac

  echo
  say "Выбери режим для подписок:"
  say "1 - По IP"
  say "2 - По домену"
  local sub_choice
  sub_choice="$(ask 'Режим подписок' '1')"
  sub_choice="$(trim "$sub_choice")"

  case "$sub_choice" in
    1)
      SUB_MODE="ip"
      SUB_IP="$(ask 'IP для подписок' "$server_ip")"
      SUB_IP="$(trim "$SUB_IP")"
      ;;
    2)
      SUB_MODE="domain"
      SUB_DOMAIN="$(ask 'Домен для подписок' '')"
      SUB_DOMAIN="$(trim "$SUB_DOMAIN")"
      validate_domain "$SUB_DOMAIN"

      if [ -z "${PANEL_EMAIL:-}" ]; then
        PANEL_EMAIL="$(ask 'Email для SSL (LE / Caddy)' '')"
        PANEL_EMAIL="$(trim "$PANEL_EMAIL")"
        validate_email "$PANEL_EMAIL"
      fi
      ;;
    *)
      err "Неизвестный режим подписок."
      exit 1
      ;;
  esac

  echo
  APP_PORT="$(ask 'Порт панели агрегатора' '3000')"
  APP_PORT="$(trim "$APP_PORT")"
  if ! [[ "$APP_PORT" =~ ^[0-9]+$ ]]; then
    err "Порт должен быть числом."
    exit 1
  fi

  ADMIN_USER="$(ask 'Логин администратора панели' 'admin')"
  ADMIN_USER="$(trim "$ADMIN_USER")"

  ADMIN_PASS="$(ask_secret_optional 'Пароль администратора панели')"
  ADMIN_PASS="$(trim "$ADMIN_PASS")"
  if [ -z "$ADMIN_PASS" ]; then
    err "Пароль не должен быть пустым."
    exit 1
  fi

  build_urls "$server_ip"
}

prepare_config_and_run() {
  local server_ip
  server_ip="$(get_public_server_ip)"

  local had_existing_stack="0"
  if [ -f "$APP_DIR/docker-compose.yml" ]; then
    had_existing_stack="1"
  fi

  if [ "$had_existing_stack" = "1" ]; then
    stop_existing_aggregator_stack
  fi

  sleep 2
  check_domain_ports_if_needed
  build_urls "$server_ip"

  if [ "$PANEL_MODE" = "ip" ] && port_in_use "$APP_PORT"; then
    if [ "$had_existing_stack" = "1" ]; then
      info "Порт ${APP_PORT} ранее использовался текущим агрегатором. Продолжаю обновление."
    else
      err "Порт ${APP_PORT} уже занят. Выбери другой порт."
      exit 1
    fi
  fi

  ensure_dir
  save_install_conf
  write_env_file
  write_runtime_files
  write_dockerfile_patch_note
  start_stack
  install_shortcut_command
}

update_files_only() {
  say "Обновляю файлы проекта без изменения настроек..."
  load_existing_config

  if [ -z "${ADMIN_PASS:-}" ]; then
    err "Не найден существующий .env с настройками. Для первого запуска выбери установку."
    exit 1
  fi

  stop_existing_aggregator_stack
  clone_or_update_repo "$REPO_URL_DEFAULT" "$BRANCH_DEFAULT"
  load_existing_config
  prepare_config_and_run
}

change_settings_and_update() {
  say "Изменяю настройки и обновляю проект..."
  load_existing_config

  if [ -z "${ADMIN_PASS:-}" ]; then
    warn "Старые настройки не найдены, запускаю мастер первой установки."
    clone_or_update_repo "$REPO_URL_DEFAULT" "$BRANCH_DEFAULT"
    load_existing_config
    first_install_wizard
    prepare_config_and_run
    return
  fi

  prompt_panel_mode
  prompt_sub_mode
  prompt_port_change
  prompt_admin_change

  stop_existing_aggregator_stack
  clone_or_update_repo "$REPO_URL_DEFAULT" "$BRANCH_DEFAULT"
  load_existing_config
  prepare_config_and_run
}

reinstall_full() {
  warn "Полная переустановка..."
  stop_existing_aggregator_stack
  rm -rf "$APP_DIR"
  mkdir -p "$APP_DIR"

  clone_or_update_repo "$REPO_URL_DEFAULT" "$BRANCH_DEFAULT"
  load_existing_config
  first_install_wizard
  prepare_config_and_run
}

fresh_install_flow() {
  clone_or_update_repo "$REPO_URL_DEFAULT" "$BRANCH_DEFAULT"
  load_existing_config
  first_install_wizard
  prepare_config_and_run
  install_shortcut_command
}

print_result() {
  echo
  say "=============================================="
  say "Готово"
  say "=============================================="
  say "Адрес панели: ${PANEL_PUBLIC_URL}"
  say "Адрес подписок (базовый): ${SUB_PUBLIC_URL}"
  say "Логин: ${ADMIN_USER}"
  say "Каталог проекта: ${APP_DIR}"
  echo
  warn "BASE_URL в .env выставлен в адрес подписок."
  warn "Если приложение генерирует ссылки подписки через BASE_URL, они будут идти через адрес подписок."
  if [ "$PANEL_MODE" = "domain" ] || [ "$SUB_MODE" = "domain" ]; then
    warn "Для доменного режима порты 80 и 443 должны быть свободны."
  fi
  warn "Быстрый запуск меню: agg"
}

main_menu() {
  echo >&2
  say "Обнаружена существующая установка." >&2
  say "1 - Новая установка" >&2
  say "2 - Обновить" >&2
  say "3 - Переустановить" >&2
  say "4 - Создать резервную копию" >&2
  say "5 - Восстановить из резервной копии" >&2
  say "0 - Выход" >&2
  ask 'Выбери действие' '2'
}

main() {
  clear || true
  say "=============================================="
  say "Установка / обновление 3xui-Aggregator"
  say "=============================================="
  say "Скрипт умеет: установка, обновление, изменение настроек, резервное копирование и восстановление."
  echo

  require_root
  install_packages
  install_docker_if_needed
  ensure_dir
  load_existing_config

  if [ -f "$ENV_FILE" ] || [ -f "$INSTALL_CONF" ]; then
    local action
    action="$(main_menu)"
    action="$(trim "$action")"

    case "$action" in
      1)
        fresh_install_flow
        ;;
      2)
        update_files_only
        ;;
      3)
        reinstall_full
        ;;
      4)
        create_backup
        ;;
      5)
        restore_from_backup
        ;;
      0)
        say "Выход."
        exit 0
        ;;
      *)
        err "Неверный выбор."
        exit 1
        ;;
    esac
  else
    fresh_install_flow
  fi

  print_result
}

main "$@"
