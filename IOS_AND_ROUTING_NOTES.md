# iOS, DNS and routing notes

## Region selection

Use the normal subscription URL `/sub/:slug` for iPhone/iPad when you need region selection. It returns separate VLESS links, so iOS clients can show every region as a separate profile.

The JSON endpoint `/json/:slug` exports one standalone Xray JSON profile by default for better iOS compatibility. Use `/json/:slug?node=2` to export the second node as standalone JSON, or `/json/:slug?format=array` only for clients that explicitly support an array of JSON configs.

## DNS

The client JSON uses plain DNS over UDP:

- `1.1.1.1`
- `8.8.8.8`

This is more compatible across iOS clients than DoH URLs inside Xray JSON. Cloudflare and Google together give a simple fallback without tying the config to one resolver.

## Routing policy

Proxy routing is limited to selected foreign services:

- YouTube
- Telegram
- Instagram
- WhatsApp
- Facebook / Meta
- OpenAI / ChatGPT

Russian domains are not force-proxied. The config also does not add broad CDN CIDR ranges from `ip-list.json` by default because that can accidentally proxy unrelated traffic.

## Why the old copied JSON could work differently

The copied JSON contained a single VLESS outbound, so it was easy for iOS clients to import. Aggregated JSON with multiple regions is not universally supported by iOS apps. For multiple regions, subscription links are safer than a JSON array.
