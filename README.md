# Nexus Panel

Современная панель управления для агрегации подписок 3x-ui узлов и VPN-сервисов.

![Nexus Panel](https://img.shields.io/badge/version-1.0.5-gray)
![Node.js](https://img.shields.io/badge/node-%3E%3D22-gray)
![License](https://img.shields.io/badge/license-MIT-gray)

## Возможности

- **Дашборд** — обзор состояния системы, узлов и клиентов
- **Управление узлами** — добавление, редактирование, мониторинг 3x-ui узлов
- **VPN-сервисы** — управление VPN-конфигурациями
- **Клиенты** — просмотр и управление подписками
- **Перенос клиентов** — экспорт/импорт через JSON, интерфейс или SSH с сохранением UUID и `sub_slug`
- **Перенос настроек** — отдельный зашифрованный пакет с узлами, секретами и конфигурацией панели
- **Маршрутизация** — гибкая настройка маршрутов
- **Telegram бот** — интеграция с Telegram для уведомлений
- **Светлая/Тёмная тема** — переключение цветовой схемы
- **Адаптивный дизайн** — удобная работа на ПК и мобильных устройствах

## Дизайн

Панель выполнена в серых тонах с акцентом на удобство использования:

- **Цветовая схема**: нейтральные серые тона (не тёмно-синие)
- **Шрифты**: Inter (основной), JetBrains Mono (код/IP)
- **Размеры**: крупные элементы для удобного управления
- **Мобильная версия**: drawer-меню, оптимизированные отступы

## Установка

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/nexus-panel.git
cd nexus-panel

# Установить зависимости
npm install

# Настроить окружение
cp .env.example .env
# Отредактировать .env

# Запустить
npm start
```

## Разработка

```bash
# Запуск в режиме разработки
npm run dev

# Проверка кода
npm run check
```

## Перенос настроек и клиентов из 3xui-Aggregator в Nexus Panel

Создайте два отдельных файла. Настройки защищаются парольной фразой и должны импортироваться первыми, чтобы Nexus создал узлы до восстановления связей клиентов:

```bash
agg settings export /root/aggregator-settings.nxsettings
agg settings inspect /root/aggregator-settings.nxsettings
agg clients export /root/aggregator-clients.json
agg clients inspect /root/aggregator-clients.json
```

`.nxsettings` переносит настройки подписок, Happ, routing и Telegram, узлы с паролями/API-токенами, кэш inbound, SNI, редиректы и VPN-хосты/сервисы. Клиенты, история, администратор, ключ входа, разрешённые admin IP и адрес развёртывания нового сервера не заменяются. На новом сервере:

```bash
agg settings import /root/aggregator-settings.nxsettings --dry-run
agg settings import /root/aggregator-settings.nxsettings
cd /opt/3xui-aggregator && docker compose restart aggregator
agg clients import /root/aggregator-clients.json --dry-run --node-mode match
agg clients import /root/aggregator-clients.json --mode update --node-mode match
```

Перед настоящим импортом создаётся SQLite-backup. Редиректы и VPN-сервисы импортируются отключёнными до ручной проверки адресов и портов нового VPS.

### Только клиенты

Экспорт работает напрямую с `/opt/3xui-aggregator/data/app.db`, поэтому веб-панель и Docker-контейнер могут не запускаться. На старом сервере выполните:

```bash
agg clients export /root/aggregator-clients.json
agg clients inspect /root/aggregator-clients.json
```

Если команда `agg` ещё использует прежний `install.sh`, можно вызвать переносчик напрямую:

```bash
python3 /opt/3xui-aggregator/scripts/client-transfer.py export \
  --db /opt/3xui-aggregator/data/app.db \
  --output /root/aggregator-clients.json
```

Перенесите JSON на новый сервер и сначала проверьте импорт без записи:

```bash
agg clients import /root/aggregator-clients.json --dry-run
agg clients import /root/aggregator-clients.json --mode update --node-mode none
```

Чтобы восстановить статистику и связи после предварительного создания таких же узлов в Nexus Panel:

```bash
agg clients import /root/aggregator-clients.json --mode update --node-mode match
```

Формат сохраняет UUID, `sub_slug`, сроки, лимиты, комментарии и трафик. Пароли/API-токены узлов не экспортируются. Настоящий импорт создаёт резервную копию базы и не обращается к удалённым 3x-ui/Remnawave-серверам.

Если старое обновление зависает на запросе GitHub Username, распакуйте changed-files ZIP вне `/opt/3xui-aggregator` и наложите патч напрямую, без Git:

```bash
bash apply-client-transfer-patch.sh
```

Команда сохранит копию базы и файлов, не остановит контейнер и сразу включит SSH-экспорт. Для обновления также веб-интерфейса используйте `bash apply-client-transfer-patch.sh --with-ui`.

## Структура проекта

```
nexus-panel/
├── app.js                 # Главный сервер
├── lib_crypto.js          # Криптография
├── lib_vpn_manager.js     # Управление VPN
├── package.json           # Зависимости
├── public/
│   ├── css/
│   │   └── nexus-ui.css   # Дизайн-система
│   ├── js/                # Клиентские скрипты
│   ├── flags/             # Флаги стран
│   └── fonts/             # Шрифты
├── views/                 # EJS шаблоны
│   ├── dashboard.ejs
│   ├── nodes.ejs
│   ├── clients.ejs
│   ├── login.ejs
│   └── ...
├── scripts/               # Утилиты
└── docs/                  # Документация
```

## Ошибка `Not found` при входе

Если `/login?key=...` показывает `Not found`, хотя ссылка получена от
установщика, обновите проект до версии 1.0.1 или новее и откройте эту же ссылку повторно.
После первой успешной проверки ключ текущего `.env` синхронизируется с SQLite,
а параметр `key` удаляется из адресной строки безопасным редиректом.

## Технологии

- **Backend**: Node.js, Express, SQLite
- **Frontend**: EJS, CSS Custom Properties
- **База данных**: better-sqlite3
- **Telegram**: node-telegram-bot-api

## Лицензия

MIT
