# Совместимость с 3x-ui main — 22 июля 2026

Этот набор изменений синхронизирует критические места `3xui-Aggregator` с текущим `MHSanaei/3x-ui` v3.5.0/main.

## Что исправлено

- Clients API: импорт сначала использует полный `/panel/api/clients/list`; paged API обрабатывается с лимитом 200 и дозагрузкой `/clients/get/:email`.
- Безопасное обновление клиента: перед replacement-update загружается полная запись, чтобы не стирать `reverse`, `adTag`, `group` и протокольные credentials.
- Убрана генерация случайных `password`/`auth` при обычном update.
- REALITY: `publicKey`, `fingerprint`, `spiderX`, `mldsa65Verify` читаются из текущего вложенного `realitySettings.settings`.
- SpiderX формируется так же, как в upstream: SHA-256 от `seed|clientKey`, первые 15 hex-символов.
- VLESS URI теперь содержит `encryption`; `pqv` добавляется при наличии ML-DSA-65 verify key.
- Vision разрешается для RAW/TCP + TLS/REALITY и XHTTP + VLESS encryption.
- XHTTP URI `extra` формируется по текущему набору клиентских полей 3x-ui, с миграцией `sessionPlacement/sessionKey` в `sessionIDPlacement/sessionIDKey`.
- Старые фиксированные XHTTP значения `1000000` и `30` не сериализуются; по умолчанию поля оставлены пустыми.
- XHTTP редактор принимает диапазоны вроде `500000-1000000` и `10-50`.

## Проверка перед production

1. Применить патч на отдельной ветке.
2. Подключить тестовую 3x-ui v3.5.0/main с копией базы.
3. Проверить add/update/delete клиента для VLESS, Trojan и Hysteria; убедиться, что пароль/auth не меняются при изменении квоты.
4. Проверить импорт более 200 клиентов.
5. Сравнить VLESS URI, созданный 3x-ui и Aggregator, для:
   - RAW + REALITY + Vision;
   - RAW + TLS + Vision;
   - XHTTP + VLESS encryption + Vision;
   - REALITY с `mldsa65Verify`.
6. Проверить сохранение `reverse`, `adTag`, `group`, WireGuard-полей.
7. Проверить старые XHTTP конфиги с legacy `sessionPlacement/sessionKey`.

## Ограничения проверки

`node --check app.js` и отдельные assertions для новых helper-функций прошли. Полный `npm run check` не завершён, потому что в загруженном архиве отсутствует `node_modules`, а установка npm-зависимостей в изолированной среде недоступна. Обязателен запуск `npm ci && npm run check` в CI проекта.
