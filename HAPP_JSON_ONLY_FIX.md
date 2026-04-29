# Fix: Happ JSON-only routing

Изменения в этой версии:

- Убран отдельный VPN Routing для Happ из страницы `/routing`.
- `/sub/:slug` больше не добавляет `happ://routing/onadd/...` ни в headers, ни в тело подписки.
- `/happ-routing/:slug` и `/happ-routing-json/:slug` отключены и возвращают `410`.
- Внешние `Happ GeoIP URL` / `Happ GeoSite URL` больше не используются, поэтому Happ не должен пытаться создавать свой routing-файл и падать с ошибкой `code not found in geosite.dat: RU`.
- Маршрутизация остаётся только внутри `/json/:slug`.
- `/json/:slug` по умолчанию возвращает массив JSON-конфигов: один объект на один VLESS-узел/регион. Для совместимости одиночный объект доступен через `/json/:slug?node=1` или `/json/:slug?format=single`.

После обновления перезапусти контейнер/Node.js процесс и заново добавь JSON-ссылку в Happ.
