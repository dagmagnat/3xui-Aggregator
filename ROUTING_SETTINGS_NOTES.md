# Routing settings for JSON

Added `/routing` admin page.

- Presets: YouTube, Meta, Facebook, Instagram, WhatsApp, OpenAI/ChatGPT, Telegram.
- Manual domain rules support: `geosite:tag`, `domain:example.com`, `regexp:...`, `keyword:...`, `full:...`.
- Manual IP rules support: `geoip:tag`, IPv4, IPv4 CIDR, IPv6, IPv6 CIDR.
- Validation blocks invalid rules and shows an error.
- Saved rules are stored in `app_settings.routing_config` and are applied dynamically to `/json/:slug`, `/happ-routing-json/:slug` and Happ routing generation.
- Existing client links do not need to be re-sent. Clients just need to refresh/update the old JSON profile.
