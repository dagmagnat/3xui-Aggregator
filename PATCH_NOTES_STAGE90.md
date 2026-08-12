# Stage90: security + live UI development

## Start UI development

```bash
nvm use
npm ci
npm run dev
```

Open `http://localhost:3001`. The first run prints the generated development password.

- Runtime templates: `views/*.ejs`
- Last CSS override layer: `public/css/stage90.css`
- Shared shell/navigation: `views/partials_header.ejs`
- Shared footer/browser logic: `views/partials_footer.ejs`
- Exact screen map: `docs/UI_MAP.md`

The **UI inspector** button is development-only and never appears with `NODE_ENV=production`.

## Included security changes

- production secret validation;
- `.env` mode 0600 in installer;
- CSRF protection and baseline security headers;
- encrypted Telegram settings;
- custom flag validation/XSS fix;
- production error redaction;
- H1Cloud TLS verification for new installs;
- reproducible npm install through lockfile.

## Known follow-up

`node-telegram-bot-api` still uses the legacy 0.x API because the 1.x line changes constructor and proxy behavior. Upgrade it only together with Telegram polling/proxy integration tests.
