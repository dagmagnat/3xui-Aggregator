# Happ iOS JSON routing fix

The Xray JSON routing rules are split into separate domain and IP rules.

Do not put `domain` and `ip` in the same field rule for this use case, because some clients may not match the proxy rule reliably when both conditions are in one rule.

Current JSON routing order:
1. Proxy domains: YouTube, Meta/Facebook/Instagram/WhatsApp, OpenAI, Telegram and requested explicit domains.
2. Proxy IP: Telegram and Facebook only.
3. Direct fallback: all TCP/UDP that did not match proxy rules.
