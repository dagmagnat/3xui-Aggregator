# 3xui-Aggregator 1.0.4 — перенос клиентов в Nexus Panel

Эта совместимая обнова предназначена для старой установки 3xui-Aggregator.

Добавлено:

- экспорт клиентов напрямую из `data/app.db`, даже если веб-панель не открывается;
- SSH-команды `agg clients export`, `agg clients inspect`, `agg clients import`;
- кнопка «Перенос клиентов» на странице клиентов;
- единый с Nexus Panel JSON-формат;
- сохранение UUID, `sub_slug`, сроков, лимитов и потраченного трафика;
- транзакционный `--dry-run`, защита конфликтов и автоматический backup.

Минимальный сценарий:

```bash
# Старый сервер Aggregator
agg clients export /root/aggregator-clients.json

# Новый сервер Nexus
agg clients import /root/aggregator-clients.json --dry-run
agg clients import /root/aggregator-clients.json --mode update --node-mode none
```

Файл переноса содержит клиентские идентификаторы. Передавайте его через SCP/SFTP и удалите после успешного переноса.

Если обновление старого Git-репозитория запрашивает `Username for 'https://github.com'`, не запускайте его. Распакуйте changed-files ZIP в отдельный каталог на сервере и выполните:

```bash
bash apply-client-transfer-patch.sh
```

Этого достаточно для SSH-экспорта и это не останавливает контейнер. Чтобы также добавить кнопку в веб-интерфейс:

```bash
bash apply-client-transfer-patch.sh --with-ui
```

Исправление rev.2: helper больше не требует Node.js на хостовой системе. В штатной установке Node.js находится внутри Docker-образа; при его отсутствии снаружи пропускается только дополнительная JS syntax-check, а установка и SSH-экспорт продолжаются.
