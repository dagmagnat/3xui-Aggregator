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

trim() {
  local var="$1"
  var="${var//$'\r'/}"
  var="${var#"${var%%[![:space:]]*}"}"
  var="${var%"${var##*[![:space:]]}"}"
  echo "$var"
}

port_in_use() {
  local port="$1"
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${port}$"
}

check_required_ports_for_domain() {
  local bad=0

  if port_in_use 80; then
    err "Порт 80 уже занят. Для домена и SSL он должен быть свободен."
    bad=1
  fi

  if port_in_use 443; then
    err "Порт 443 уже занят. Для домена и SSL он должен быть свободен."
    bad=1
  fi

  if [ "$bad" -eq 1 ]; then
    warn "Если на этом сервере уже работает 3x-ui или другой reverse proxy на 80/443,"
    warn "то установку по домену этим скриптом лучше не продолжать."
    warn "Можно установить агрегатор по IP или вынести его на отдельный сервер."
    exit 1
  fi
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
    warn "Каталог $APP_DIR уже существует. Обновляю проект..."
    git -C "$APP_DIR" fetch --all
    git -C "$APP_DIR" checkout "$branch"
    git -C "$APP_DIR" pull --ff-only origin "$branch"
  else
    say "Клонирую проект в $APP_DIR ..."
    rm -rf "$APP_DIR"
    git clone -b "$branch" "$repo_url" "$APP_DIR"
  fi
}

write_env_file() {
  local port="$1"
  local base_url="$2"
  local admin_user="$3"
  local admin_pass="$4"

  local app_secret session_secret
  app_secret="$(openssl rand -hex 32)"
  session_secret="$(openssl rand -hex 32)"

  cat > "$APP_DIR/.env" <<EOF
PORT=${port}
APP_SECRET=${app_secret}
SESSION_SECRET=${session_secret}
ADMIN_USERNAME=${admin_user}
ADMIN_PASSWORD=${admin_pass}
BASE_URL=${base_url}
NODE_ENV=production
EOF
}

write_compose_ip() {
  local port="$1"

  cat > "$APP_DIR/docker-compose.yml" <<EOF
services:
  aggregator:
    build: .
    container_name: 3xui-aggregator
    restart: unless-stopped
    ports:
      - "${port}:${port}"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
EOF
}

write_caddyfile() {
  local domain="$1"
  local email="$2"

  domain="$(trim "$domain")"
  email="$(trim "$email")"

  cat > "$APP_DIR/Caddyfile" <<EOF
{
    email $email
}

$domain {
    encode gzip
    reverse_proxy aggregator:3000
}
EOF
}

write_compose_domain() {
  cat > "$APP_DIR/docker-compose.yml" <<'EOF'
services:
  aggregator:
    build: .
    container_name: 3xui-aggregator
    restart: unless-stopped
    expose:
      - "3000"
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

start_stack() {
  say "Собираю и запускаю контейнеры..."
  cd "$APP_DIR"
  docker compose up -d --build
}

main() {
  clear || true
  say "=============================================="
  say "Установка 3xui-Aggregator"
  say "=============================================="
  say "Этот скрипт установит проект из GitHub и настроит запуск."
  say "Текст специально выводится зелёным, чтобы не терять шаги."
  echo

  require_root
  install_packages
  install_docker_if_needed

  local repo_url branch install_mode app_port domain email base_url admin_user admin_pass server_ip
  repo_url="$REPO_URL_DEFAULT"
  branch="$BRANCH_DEFAULT"

  echo
  say "Выбери режим установки:"
  say "1 - По IP без сертификата"
  say "2 - По домену с автоматическим SSL"
  install_mode="$(ask 'Режим установки' '1')"

  app_port="$(ask 'Порт панели агрегатора' '3000')"
  app_port="$(trim "$app_port")"

  if ! [[ "$app_port" =~ ^[0-9]+$ ]]; then
    err "Порт должен быть числом."
    exit 1
  fi

  if [ "$install_mode" = "1" ]; then
    if port_in_use "$app_port"; then
      err "Порт ${app_port} уже занят. Выбери другой порт."
      exit 1
    fi

    server_ip="$(curl -4 -fsSL https://api.ipify.org || echo "127.0.0.1")"
    server_ip="$(trim "$server_ip")"
    base_url="http://${server_ip}:${app_port}"

  elif [ "$install_mode" = "2" ]; then
    check_required_ports_for_domain

    domain="$(ask "Домен для панели" "")"
    email="$(ask "Email для SSL (Let's Encrypt / Caddy)" "")"

    domain="$(trim "$domain")"
    email="$(trim "$email")"

    if [ -z "$domain" ] || [ -z "$email" ]; then
      err "Для доменного режима нужно указать и домен, и email."
      exit 1
    fi

    if ! printf '%s' "$email" | grep -Eq '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; then
      err "Email введён некорректно."
      exit 1
    fi

    if ! printf '%s' "$domain" | grep -Eq '^[A-Za-z0-9.-]+$'; then
      err "Домен введён некорректно."
      exit 1
    fi

    base_url="https://${domain}"
  else
    err "Неизвестный режим установки."
    exit 1
  fi

  admin_user="$(ask 'Логин администратора панели' 'admin')"
  admin_user="$(trim "$admin_user")"

  admin_pass="$(ask 'Пароль администратора панели' '')"
  admin_pass="$(trim "$admin_pass")"

  if [ -z "$admin_pass" ]; then
    err "Пароль не должен быть пустым."
    exit 1
  fi

  clone_or_update_repo "$repo_url" "$branch"
  mkdir -p "$APP_DIR/data"
  write_env_file "$app_port" "$base_url" "$admin_user" "$admin_pass"

  if [ "$install_mode" = "1" ]; then
    write_compose_ip "$app_port"
  else
    write_compose_domain
    write_caddyfile "$domain" "$email"
  fi

  start_stack

  echo
  say "=============================================="
  say "Установка завершена"
  say "=============================================="
  say "Адрес панели: ${base_url}"
  say "Логин: ${admin_user}"
  say "Пароль: ${admin_pass}"
  say "Каталог проекта: ${APP_DIR}"
  echo
  warn "Если это тот же сервер, где уже стоит 3x-ui, следи за конфликтами портов."
  warn "Для режима с доменом порты 80 и 443 должны быть свободны."
}

main "$@"
