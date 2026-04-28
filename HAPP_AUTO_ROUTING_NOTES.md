# HAPP auto routing notes

This build sends HAPP-specific routing and app settings in both ways supported by HAPP:

1. HTTP headers on `/sub/:slug`:
   - `routing: happ://routing/onadd/<base64-json>`
   - `ping-type: tcp`
   - `ping-result: icon`
   - subscription auto-update / on-open ping / sniffing parameters

2. Subscription body lines:
   - `happ://routing/onadd/<base64-json>`
   - `#ping-type: tcp`
   - `#ping-result: icon`
   - other HAPP app-management parameters

The routing profile uses HAPP's native capitalized schema:
- `GlobalProxy: "false"` so unmatched traffic goes Direct.
- `RouteOrder: "block-proxy-direct"`.
- `ProxySites`: YouTube, Telegram, Instagram, WhatsApp, Facebook/Meta, OpenAI/ChatGPT.
- `ProxyIp`: `geoip:telegram`, `geoip:facebook`.
- `BlockSites`: `geosite:category-ads-all`.
- `UseChunkFiles: "true"` to reduce memory usage on iOS.

Debug endpoints:
- `/happ-routing/:slug` returns only the HAPP routing deeplink.
- `/happ-routing-json/:slug` returns the decoded routing JSON.

If an existing profile with the same name already exists in HAPP, delete it or refresh the subscription. The `onadd` link should overwrite and activate the profile, but some iOS builds may cache an older profile until it is removed.
