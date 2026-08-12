# Nexus Panel 1.0.2 — 3x-ui XHTTP External Proxy

Дата: 2026-08-10

## Симптом

Оригинальный JSON из 3x-ui работал через публичный CDN endpoint:

```text
la57l.cdn.amored.ru:443 · XHTTP · TLS
```

JSON агрегатора для того же inbound ошибочно публиковал внутренний endpoint:

```text
pnl220.cdn.amored.ru:2053 · XHTTP · security=none
```

## Причина

Генератор обычных 3x-ui узлов игнорировал `streamSettings.externalProxy`.
Поддержка External Proxy была ошибочно ограничена отдельным старым типом узла,
поэтому адрес брался из URL админ-панели, а порт — из backend inbound.
Дополнительно JSON отключал `xPaddingObfsMode`, меняя XHTTP-параметры клиента.

## Исправление

- External Proxy используется для любого обычного VLESS/XHTTP узла 3x-ui.
- `dest`, `port` и `forceTls` переносятся в SUB и JSON.
- Режимы `same`, `tls` и `none` обрабатываются согласно схеме 3x-ui.
- Сохраняются XHTTP padding/obfuscation и XMUX-параметры.
- Без External Proxy генератор учитывает `shareAddrStrategy` и `shareAddr`.

## Проверка

```bash
npm run check
npm test
```

Регрессионный тест подтверждает преобразование:

```text
pnl220.cdn.amored.ru:2053 / none
             ↓ External Proxy
la57l.cdn.amored.ru:443 / tls
```
