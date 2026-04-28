# Happ minimal routing

This build keeps Happ routing under the 50 MB route-memory limit by using only the requested route entries.

Proxy sites:
- geosite:youtube
- geosite:meta
- geosite:facebook
- geosite:instagram
- geosite:whatsapp
- geosite:openai
- geosite:telegram
- domain:fbcdn.net
- domain:fbsbx.com
- domain:messenger.com
- domain:m.me
- domain:instagram.com
- domain:cdninstagram.com
- domain:whatsapp.com
- domain:whatsapp.net
- domain:wa.me

Proxy IP:
- geoip:telegram
- geoip:facebook

Everything else goes direct because GlobalProxy is false and the generated JSON has a direct fallback rule.
