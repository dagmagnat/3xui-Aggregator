# 3xui-Aggregator 1.0.5 — перенос настроек в Nexus Panel

Добавлен отдельный защищённый файл `.nxsettings`, который дополняет уже созданный `aggregator-clients.json`.

```bash
# Старый сервер
agg settings export /root/aggregator-settings.nxsettings
agg settings inspect /root/aggregator-settings.nxsettings

# Новый сервер Nexus
agg settings import /root/aggregator-settings.nxsettings --dry-run
agg settings import /root/aggregator-settings.nxsettings
cd /opt/3xui-aggregator && docker compose restart aggregator
agg clients import /root/aggregator-clients.json --dry-run --node-mode match
agg clients import /root/aggregator-clients.json --mode update --node-mode match
```

Парольная фраза содержит минимум 12 символов и нигде не сохраняется. Пакет зашифрован AES-256-GCM. Секреты соединений расшифровываются внутри контейнера старой панели и при импорте шифруются ключом новой установки.

Клиенты и параметры доступа к новой панели не входят в пакет настроек. Редиректы и VPN-сервисы переносятся выключенными.
