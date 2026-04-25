require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const fetch = require('node-fetch');
const QRCode = require('qrcode');
const { encrypt, decrypt } = require('./lib_crypto');

const COUNTRIES = [
  { code: 'AE', name_ru: 'ОАЭ', flag: '🇦🇪' },
  { code: 'AL', name_ru: 'Албания', flag: '🇦🇱' },
  { code: 'AM', name_ru: 'Армения', flag: '🇦🇲' },
  { code: 'AR', name_ru: 'Аргентина', flag: '🇦🇷' },
  { code: 'AT', name_ru: 'Австрия', flag: '🇦🇹' },
  { code: 'AU', name_ru: 'Австралия', flag: '🇦🇺' },
  { code: 'AZ', name_ru: 'Азербайджан', flag: '🇦🇿' },
  { code: 'BA', name_ru: 'Босния и Герцеговина', flag: '🇧🇦' },
  { code: 'BE', name_ru: 'Бельгия', flag: '🇧🇪' },
  { code: 'BG', name_ru: 'Болгария', flag: '🇧🇬' },
  { code: 'BH', name_ru: 'Бахрейн', flag: '🇧🇭' },
  { code: 'BR', name_ru: 'Бразилия', flag: '🇧🇷' },
  { code: 'BY', name_ru: 'Беларусь', flag: '🇧🇾' },
  { code: 'CA', name_ru: 'Канада', flag: '🇨🇦' },
  { code: 'CH', name_ru: 'Швейцария', flag: '🇨🇭' },
  { code: 'CL', name_ru: 'Чили', flag: '🇨🇱' },
  { code: 'CN', name_ru: 'Китай', flag: '🇨🇳' },
  { code: 'CO', name_ru: 'Колумбия', flag: '🇨🇴' },
  { code: 'CR', name_ru: 'Коста-Рика', flag: '🇨🇷' },
  { code: 'CY', name_ru: 'Кипр', flag: '🇨🇾' },
  { code: 'CZ', name_ru: 'Чехия', flag: '🇨🇿' },
  { code: 'DE', name_ru: 'Германия', flag: '🇩🇪' },
  { code: 'DK', name_ru: 'Дания', flag: '🇩🇰' },
  { code: 'EE', name_ru: 'Эстония', flag: '🇪🇪' },
  { code: 'EG', name_ru: 'Египет', flag: '🇪🇬' },
  { code: 'ES', name_ru: 'Испания', flag: '🇪🇸' },
  { code: 'FI', name_ru: 'Финляндия', flag: '🇫🇮' },
  { code: 'FR', name_ru: 'Франция', flag: '🇫🇷' },
  { code: 'GB', name_ru: 'Великобритания', flag: '🇬🇧' },
  { code: 'GE', name_ru: 'Грузия', flag: '🇬🇪' },
  { code: 'GR', name_ru: 'Греция', flag: '🇬🇷' },
  { code: 'HK', name_ru: 'Гонконг', flag: '🇭🇰' },
  { code: 'HR', name_ru: 'Хорватия', flag: '🇭🇷' },
  { code: 'HU', name_ru: 'Венгрия', flag: '🇭🇺' },
  { code: 'ID', name_ru: 'Индонезия', flag: '🇮🇩' },
  { code: 'IE', name_ru: 'Ирландия', flag: '🇮🇪' },
  { code: 'IL', name_ru: 'Израиль', flag: '🇮🇱' },
  { code: 'IN', name_ru: 'Индия', flag: '🇮🇳' },
  { code: 'IQ', name_ru: 'Ирак', flag: '🇮🇶' },
  { code: 'IS', name_ru: 'Исландия', flag: '🇮🇸' },
  { code: 'IT', name_ru: 'Италия', flag: '🇮🇹' },
  { code: 'JO', name_ru: 'Иордания', flag: '🇯🇴' },
  { code: 'JP', name_ru: 'Япония', flag: '🇯🇵' },
  { code: 'KG', name_ru: 'Кыргызстан', flag: '🇰🇬' },
  { code: 'KR', name_ru: 'Южная Корея', flag: '🇰🇷' },
  { code: 'KW', name_ru: 'Кувейт', flag: '🇰🇼' },
  { code: 'KZ', name_ru: 'Казахстан', flag: '🇰🇿' },
  { code: 'LT', name_ru: 'Литва', flag: '🇱🇹' },
  { code: 'LU', name_ru: 'Люксембург', flag: '🇱🇺' },
  { code: 'LV', name_ru: 'Латвия', flag: '🇱🇻' },
  { code: 'MA', name_ru: 'Марокко', flag: '🇲🇦' },
  { code: 'MD', name_ru: 'Молдова', flag: '🇲🇩' },
  { code: 'ME', name_ru: 'Черногория', flag: '🇲🇪' },
  { code: 'MK', name_ru: 'Северная Македония', flag: '🇲🇰' },
  { code: 'MT', name_ru: 'Мальта', flag: '🇲🇹' },
  { code: 'MX', name_ru: 'Мексика', flag: '🇲🇽' },
  { code: 'MY', name_ru: 'Малайзия', flag: '🇲🇾' },
  { code: 'NG', name_ru: 'Нигерия', flag: '🇳🇬' },
  { code: 'NL', name_ru: 'Нидерланды', flag: '🇳🇱' },
  { code: 'NO', name_ru: 'Норвегия', flag: '🇳🇴' },
  { code: 'NZ', name_ru: 'Новая Зеландия', flag: '🇳🇿' },
  { code: 'OM', name_ru: 'Оман', flag: '🇴🇲' },
  { code: 'PA', name_ru: 'Панама', flag: '🇵🇦' },
  { code: 'PE', name_ru: 'Перу', flag: '🇵🇪' },
  { code: 'PH', name_ru: 'Филиппины', flag: '🇵🇭' },
  { code: 'PK', name_ru: 'Пакистан', flag: '🇵🇰' },
  { code: 'PL', name_ru: 'Польша', flag: '🇵🇱' },
  { code: 'PT', name_ru: 'Португалия', flag: '🇵🇹' },
  { code: 'QA', name_ru: 'Катар', flag: '🇶🇦' },
  { code: 'RO', name_ru: 'Румыния', flag: '🇷🇴' },
  { code: 'RS', name_ru: 'Сербия', flag: '🇷🇸' },
  { code: 'RU', name_ru: 'Россия', flag: '🇷🇺' },
  { code: 'SA', name_ru: 'Саудовская Аравия', flag: '🇸🇦' },
  { code: 'SE', name_ru: 'Швеция', flag: '🇸🇪' },
  { code: 'SG', name_ru: 'Сингапур', flag: '🇸🇬' },
  { code: 'SI', name_ru: 'Словения', flag: '🇸🇮' },
  { code: 'SK', name_ru: 'Словакия', flag: '🇸🇰' },
  { code: 'TH', name_ru: 'Таиланд', flag: '🇹🇭' },
  { code: 'TJ', name_ru: 'Таджикистан', flag: '🇹🇯' },
  { code: 'TR', name_ru: 'Турция', flag: '🇹🇷' },
  { code: 'TW', name_ru: 'Тайвань', flag: '🇹🇼' },
  { code: 'UA', name_ru: 'Украина', flag: '🇺🇦' },
  { code: 'US', name_ru: 'США', flag: '🇺🇸' },
  { code: 'UZ', name_ru: 'Узбекистан', flag: '🇺🇿' },
  { code: 'VN', name_ru: 'Вьетнам', flag: '🇻🇳' },
  { code: 'ZA', name_ru: 'ЮАР', flag: '🇿🇦' }
];

function getCountryFlag(countryName) {
  const found = COUNTRIES.find(c => c.name_ru === countryName);
  return found?.flag || '🌐';
}

function getNodeDisplayName(node) {
  const base = String(node?.country_name_ru || node?.name || 'Узел').trim();
  const suffix = String(node?.label_suffix || '').trim();

  if (!suffix) return base;
  if (/^\d+$/.test(suffix)) return `${base}-${suffix}`;

  return `${base} ${suffix}`;
}

function getNodePublicName(node) {
  const name = getNodeDisplayName(node);
  const flag = node?.country_flag || getCountryFlag(node?.country_name_ru || node?.name);
  return `${flag} ${name}`.trim();
}

const app = express();
const db = new Database('./data/app.db');

const PORT = Number(process.env.PORT || 3000);
const APP_SECRET = process.env.APP_SECRET || 'change-me';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-session-secret';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DEFAULT_SUBSCRIPTION_NAME = process.env.SUBSCRIPTION_NAME || 'VPN';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      panel_url TEXT NOT NULL,
      panel_path TEXT DEFAULT '',
      sub_base_url TEXT DEFAULT '',
      username TEXT NOT NULL,
      password_enc TEXT NOT NULL,
      inbound_id INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_status TEXT DEFAULT 'unknown',
      last_error TEXT DEFAULT '',
      country_code TEXT DEFAULT '',
      country_name_ru TEXT DEFAULT '',
      country_flag TEXT DEFAULT '',
      label_suffix TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      uuid TEXT NOT NULL,
      sub_slug TEXT UNIQUE NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 0,
      traffic_gb INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      node_id INTEGER NOT NULL,
      remote_email TEXT NOT NULL,
      remote_uuid TEXT NOT NULL,
      remote_sub_url TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, node_id)
    );
  `);

  try { db.prepare(`ALTER TABLE nodes ADD COLUMN country_code TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN country_name_ru TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN country_flag TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN sub_base_url TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN label_suffix TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 0`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN traffic_gb INTEGER NOT NULL DEFAULT 0`).run(); } catch (_) {}

  const existingAdmin = db.prepare('SELECT id FROM app_users WHERE username = ?').get(ADMIN_USERNAME);
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO app_users (username, password_hash) VALUES (?, ?)').run(ADMIN_USERNAME, passwordHash);
  }

  const existingSubName = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('subscription_name');
  if (!existingSubName) {
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('subscription_name', DEFAULT_SUBSCRIPTION_NAME);
  }
}

initDb();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function render(res, view, params = {}) {
  res.render(view, {
    ...params,
    currentPath: res.req.path
  });
}

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

function normalizeRootUrl(panelUrl, panelPath) {
  let url = String(panelUrl || '').trim().replace(/\/+$/, '');
  let path = String(panelPath || '').trim();

  if (path && !path.startsWith('/')) path = `/${path}`;

  return `${url}${path}`.replace(/\/+$/, '');
}

function normalizeSubscriptionBaseUrl(node) {
  return String(BASE_URL || `http://localhost:${PORT}`).trim().replace(/\/+$/, '');
}

function buildNativeSubUrl(node, subId) {
  if (!subId) return '';
  return `${normalizeSubscriptionBaseUrl(node)}/sub/${subId}`;
}

function buildNativeJsonUrl(node, subId) {
  if (!subId) return '';
  return `${normalizeSubscriptionBaseUrl(node)}/json/${subId}`;
}

async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractCookieHeader(response) {
  if (!response || !response.headers) return '';

  if (typeof response.headers.raw === 'function') {
    const rawCookies = response.headers.raw()['set-cookie'] || [];
    return rawCookies.map(c => c.split(';')[0]).join('; ');
  }

  if (typeof response.headers.get === 'function') {
    const cookie = response.headers.get('set-cookie');
    if (cookie) return cookie.split(';')[0];
  }

  return '';
}

function safeParseJsonField(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;

  const text = String(value).trim();
  if (!text) return fallback;

  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function loginNode(node) {
  const rootUrl = normalizeRootUrl(node.panel_url, node.panel_path);
  const password = decrypt(node.password_enc, APP_SECRET);

  const body = new URLSearchParams({
    username: node.username,
    password
  });

  const response = await fetch(`${rootUrl}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, text/plain, */*'
    },
    body: body.toString(),
    redirect: 'manual'
  });

  const cookie = extractCookieHeader(response);
  const data = await safeJson(response);

  if (!cookie) {
    throw new Error(data?.msg || `Login failed (${response.status})`);
  }

  return { rootUrl, cookie };
}

async function apiGet(node, path) {
  const { rootUrl, cookie } = await loginNode(node);

  const response = await fetch(`${rootUrl}${path}`, {
    headers: {
      'Accept': 'application/json',
      'Cookie': cookie
    }
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(data?.msg || `GET ${path} failed (${response.status})`);
  }

  return data;
}

async function apiPost(node, path, body, asForm = false) {
  const { rootUrl, cookie } = await loginNode(node);

  let headers = {
    'Accept': 'application/json',
    'Cookie': cookie
  };

  let payload;

  if (asForm) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    payload = new URLSearchParams(flattenForm(body)).toString();
  } else {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${rootUrl}${path}`, {
    method: 'POST',
    headers,
    body: payload
  });

  const data = await safeJson(response);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.msg || `POST ${path} failed (${response.status})`);
  }

  return data;
}

function flattenForm(obj, prefix = '', out = {}) {
  Object.entries(obj).forEach(([key, value]) => {
    const formKey = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          flattenForm(item, `${formKey}[${index}]`, out);
        } else {
          out[`${formKey}[${index}]`] = item;
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      flattenForm(value, formKey, out);
    } else {
      out[formKey] = value;
    }
  });

  return out;
}

async function getInbound(node) {
  const data = await apiGet(node, `/panel/api/inbounds/get/${node.inbound_id}`);
  return data.obj || data;
}

async function getInbounds(node) {
  const data = await apiGet(node, '/panel/api/inbounds/list');
  return data.obj || data;
}

async function addClient(node, payload) {
  return apiPost(node, '/panel/api/inbounds/addClient', payload, true);
}

async function deleteClient(node, clientUuid, email) {
  try {
    return await apiPost(
      node,
      `/panel/api/inbounds/${node.inbound_id}/delClient/${encodeURIComponent(clientUuid)}`,
      {},
      true
    );
  } catch {
    return apiPost(
      node,
      `/panel/api/inbounds/${node.inbound_id}/delClientByEmail/${encodeURIComponent(email)}`,
      {},
      true
    );
  }
}

async function checkNode(node) {
  try {
    await apiGet(node, '/panel/api/server/status');
    await getInbounds(node);

    db.prepare('UPDATE nodes SET last_status = ?, last_error = ? WHERE id = ?')
      .run('online', '', node.id);

    return { ok: true, status: 'online' };
  } catch (err) {
    db.prepare('UPDATE nodes SET last_status = ?, last_error = ? WHERE id = ?')
      .run('offline', String(err.message || err), node.id);

    return { ok: false, status: 'offline', error: String(err.message || err) };
  }
}

function decodeMaybeBase64Subscription(text) {
  const raw = String(text || '').trim();

  if (!raw) return '';
  if (raw.includes('://')) return raw;

  try {
    const normalized = raw.replace(/\s+/g, '');
    const decoded = Buffer.from(normalized, 'base64').toString('utf8').trim();
    if (decoded.includes('://')) return decoded;
  } catch (_) {}

  return raw;
}

async function fetchSubscriptionLines(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/plain,*/*'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription (${response.status})`);
  }

  const text = decodeMaybeBase64Subscription(await response.text());

  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => (
      line.startsWith('vless://') ||
      line.startsWith('vmess://') ||
      line.startsWith('trojan://') ||
      line.startsWith('ss://') ||
      line.startsWith('hysteria://') ||
      line.startsWith('hy2://') ||
      line.startsWith('tuic://')
    ));
}

async function buildSubscriptionLines(clientRow, includeOffline = true) {
  const rows = db.prepare(`
    SELECT
      cn.id AS client_node_id,
      cn.remote_sub_url,
      cn.remote_uuid,
      cn.remote_email,
      n.id AS node_id,
      n.name,
      n.panel_url,
      n.panel_path,
      n.sub_base_url,
      n.username,
      n.password_enc,
      n.inbound_id,
      n.enabled,
      n.last_status,
      n.last_error,
      n.country_code,
      n.country_name_ru,
      n.country_flag,
      n.label_suffix
    FROM client_nodes cn
    JOIN nodes n ON n.id = cn.node_id
    WHERE cn.client_id = ?
    ORDER BY cn.id ASC
  `).all(clientRow.id);

  const lines = [];
  const seen = new Set();

  for (const row of rows) {
    try {
      if (!includeOffline && row.last_status === 'offline') continue;

      const inbound = await getInbound(row);
      const stream = safeParseJsonField(inbound.streamSettings, {});
      let subUrl = '';

      if (inbound.protocol === 'vless' && stream.security === 'reality') {
        subUrl = buildVlessRealityLink(
          row,
          inbound,
          row.remote_uuid,
          clientRow.display_name,
          getNodePublicName(row)
        );
      }

      if (subUrl && !seen.has(subUrl)) {
        seen.add(subUrl);
        lines.push(subUrl);
      }
    } catch (err) {
      console.error('Build subscription line failed:', err.message);
    }
  }

  return lines;
}

function buildVlessRealityLink(node, inbound, uuid, displayName, nodeName) {
  const streamSettings = safeParseJsonField(inbound.streamSettings, {});
  const settings = safeParseJsonField(inbound.settings, {});
  const realitySettings = streamSettings?.realitySettings || {};
  const realityInner = realitySettings?.settings || {};

  const panelUrl = new URL(node.panel_url);
  const host = panelUrl.hostname;
  const port = inbound.port || panelUrl.port || 443;

  const pbk =
    realityInner?.publicKey ||
    realitySettings?.publicKey ||
    '';

  const sni =
    realitySettings?.serverNames?.[0] ||
    realityInner?.serverNames?.[0] ||
    realitySettings?.targetSni ||
    '';

  const sid =
    realitySettings?.shortIds?.[0] ||
    realityInner?.shortIds?.[0] ||
    '';

  const fp =
    realityInner?.fingerprint ||
    realitySettings?.fingerprint ||
    streamSettings?.fingerprint ||
    'chrome';

  const flow =
    settings?.clients?.find(c => c.id === uuid)?.flow ||
    settings?.clients?.[0]?.flow ||
    '';

  const query = new URLSearchParams({
    type: streamSettings.network || 'tcp',
    security: 'reality',
    pbk,
    fp,
    sni,
    sid,
    spx: '/'
  });

  if (flow) query.set('flow', flow);

  const remark = encodeURIComponent(nodeName || getNodePublicName(node));
  return `vless://${uuid}@${host}:${port}?${query.toString()}#${remark}`;
}

async function importClientsFromNode(node) {
  const inbound = await getInbound(node);
  const settings = safeParseJsonField(inbound.settings, {});
  const clients = Array.isArray(settings.clients) ? settings.clients : [];

  return clients.map(c => {
    const subId = c.subId || randomUUID().replace(/-/g, '').slice(0, 16);

    return {
      uuid: c.id,
      email: c.email,
      limitIp: c.limitIp || 1,
      expiryTime: c.expiryTime || 0,
      flow: c.flow || '',
      enable: c.enable !== false,
      subId,
      tgId: c.tgId || '',
      reset: c.reset || 0,
      totalGB: Number(c.totalGB || 0),
      originalSub: buildNativeSubUrl(node, subId),
      originalJson: buildNativeJsonUrl(node, subId)
    };
  }).filter(c => c.uuid && c.email);
}

function makeUniqueLogin(baseLogin, existingId = 0) {
  const base = String(baseLogin || 'imported').trim() || 'imported';
  let login = base;
  let i = 2;

  while (true) {
    const existing = db.prepare('SELECT id FROM clients WHERE login = ?').get(login);

    if (!existing || Number(existing.id) === Number(existingId)) {
      return login;
    }

    login = `${base}_${i}`;
    i++;
  }
}

function getNextAutoLogin() {
  const rows = db.prepare(`
    SELECT login FROM clients
    WHERE login LIKE 'user%'
  `).all();

  let maxNumber = 0;
  for (const row of rows) {
    const match = String(row.login || '').match(/^user(\d+)$/i);
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
  }

  return `user${String(maxNumber + 1).padStart(3, '0')}`;
}

function toTotalGbBytes(gb) {
  const n = Math.max(0, Number(gb || 0));
  return n > 0 ? Math.floor(n * 1024 * 1024 * 1024) : 0;
}

function fromTotalGbBytes(bytes) {
  const n = Math.max(0, Number(bytes || 0));
  return n > 0 ? Math.round(n / 1024 / 1024 / 1024) : 0;
}

async function syncClientsFromSourceNode(sourceNode) {
  const allNodes = db.prepare('SELECT * FROM nodes WHERE enabled = 1 ORDER BY id ASC').all();

  if (!allNodes.length) {
    throw new Error('Нет доступных узлов');
  }

  const remoteClients = await importClientsFromNode(sourceNode);

  let imported = 0;
  let mappingsCreated = 0;
  let remoteCreated = 0;
  let skipped = 0;

  for (const rc of remoteClients) {
    let clientRow = db.prepare('SELECT * FROM clients WHERE uuid = ?').get(rc.uuid);

    if (!clientRow) {
      const subSlug = rc.subId;
      const login = makeUniqueLogin(rc.email);
      const displayName = rc.email;

      const clientInfo = db.prepare(`
        INSERT INTO clients (login, display_name, uuid, sub_slug, duration_days, traffic_gb)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(login, displayName, rc.uuid, subSlug, 0, fromTotalGbBytes(rc.totalGB));

      clientRow = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientInfo.lastInsertRowid);
      imported++;
    } else {
      if (rc.subId && clientRow.sub_slug !== rc.subId) {
        const conflict = db.prepare('SELECT id FROM clients WHERE sub_slug = ? AND id != ?')
          .get(rc.subId, clientRow.id);

        if (!conflict) {
          db.prepare('UPDATE clients SET sub_slug = ? WHERE id = ?').run(rc.subId, clientRow.id);
          clientRow = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientRow.id);
        }
      }
    }

    for (const node of allNodes) {
      const alreadyExists = db.prepare(`
        SELECT id FROM client_nodes
        WHERE client_id = ? AND node_id = ?
      `).get(clientRow.id, node.id);

      if (alreadyExists) {
        skipped++;
        continue;
      }

      const clientEmail = rc.email;
      let subUrl = rc.originalSub || buildNativeSubUrl(sourceNode, rc.subId);

      if (node.id !== sourceNode.id) {
        let inbound;
        let settings;

        try {
          inbound = await getInbound(node);
          settings = safeParseJsonField(inbound.settings, {});
        } catch (err) {
          console.error(`Не удалось получить inbound узла ${node.id}:`, err.message);
          continue;
        }

        const payload = {
          id: Number(node.inbound_id),
          settings: JSON.stringify({
            clients: [{
              id: rc.uuid,
              email: clientEmail,
              flow: rc.flow || settings.clients?.[0]?.flow || '',
              limitIp: rc.limitIp || 1,
              totalGB: Number(rc.totalGB || 0),
              expiryTime: rc.expiryTime || 0,
              enable: rc.enable !== false,
              tgId: rc.tgId || '',
              subId: rc.subId,
              reset: rc.reset || 0
            }]
          })
        };

        try {
          await addClient(node, payload);
          remoteCreated++;
        } catch (err) {
          console.error(`Не удалось добавить клиента ${rc.email} на узел ${node.id}:`, err.message);
        }
      } else {
  subUrl = rc.originalSub || buildNativeSubUrl(sourceNode, rc.subId);
}

      db.prepare(`
        INSERT OR IGNORE INTO client_nodes (
          client_id,
          node_id,
          remote_email,
          remote_uuid,
          remote_sub_url
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(clientRow.id, node.id, clientEmail, rc.uuid, subUrl);

      mappingsCreated++;
    }
  }

  return {
    imported,
    mappingsCreated,
    remoteCreated,
    skipped,
    totalSourceClients: remoteClients.length
  };
}

async function getClientConfigFromNode(node, clientUuid, clientEmail) {
  const inbound = await getInbound(node);
  const settings = safeParseJsonField(inbound.settings, {});
  const clients = settings.clients || [];

  const clientCfg =
    clients.find(c => c.id === clientUuid) ||
    clients.find(c => c.email === clientEmail);

  return { inbound, clientCfg };
}

async function deleteClientEverywhere(client, deleteMode) {
  const mappings = db.prepare('SELECT * FROM client_nodes WHERE client_id = ?').all(client.id);

  if (deleteMode === 'all') {
    for (const map of mappings) {
      try {
        const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(map.node_id);
        if (node) await deleteClient(node, map.remote_uuid, map.remote_email);
      } catch (err) {
        console.error('Delete remote client failed:', err.message);
      }
    }
  }

  if (deleteMode === 'secondary') {
    const sourceMap = mappings[0];

    for (const map of mappings) {
      if (sourceMap && map.id === sourceMap.id) continue;

      try {
        const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(map.node_id);
        if (node) await deleteClient(node, map.remote_uuid, map.remote_email);
      } catch (err) {
        console.error('Delete remote client failed:', err.message);
      }
    }
  }

  db.prepare('DELETE FROM client_nodes WHERE client_id = ?').run(client.id);
  db.prepare('DELETE FROM clients WHERE id = ?').run(client.id);
}

app.get('/', requireAuth, (req, res) => res.redirect('/dashboard'));

app.get('/login', (req, res) => render(res, 'login', { error: null }));

app.post('/login', (req, res) => {
  const user = db.prepare('SELECT * FROM app_users WHERE username = ?').get(req.body.username || '');

  if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash)) {
    return render(res, 'login', { error: 'Неверный логин или пароль' });
  }

  req.session.userId = user.id;
  res.redirect('/dashboard');
});

app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  const stats = {
    nodes: db.prepare('SELECT COUNT(*) AS c FROM nodes').get().c,
    clients: db.prepare('SELECT COUNT(*) AS c FROM clients').get().c,
    online: db.prepare("SELECT COUNT(*) AS c FROM nodes WHERE last_status = 'online'").get().c,
    offline: db.prepare("SELECT COUNT(*) AS c FROM nodes WHERE last_status = 'offline'").get().c,
  };

  const nodes = db.prepare('SELECT * FROM nodes ORDER BY id DESC').all();
  const clients = db.prepare('SELECT * FROM clients ORDER BY id DESC LIMIT 10').all();

  render(res, 'dashboard', { stats, nodes, clients, baseUrl: BASE_URL });
});

app.get('/settings', requireAuth, (req, res) => {
  const subscriptionName = getSetting('subscription_name', DEFAULT_SUBSCRIPTION_NAME);

  render(res, 'settings', {
    subscriptionName,
    message: req.query.message || '',
    error: req.query.error || ''
  });
});

app.post('/settings', requireAuth, (req, res) => {
  try {
    const subscriptionName = String(req.body.subscription_name || '').trim();
    if (!subscriptionName) throw new Error('Нужно указать название подписки');

    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run('subscription_name', subscriptionName);

    res.redirect('/settings?message=' + encodeURIComponent('Настройки сохранены'));
  } catch (err) {
    res.redirect('/settings?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.get('/nodes', requireAuth, (req, res) => {
  const nodes = db.prepare('SELECT * FROM nodes ORDER BY id DESC').all();

  render(res, 'nodes', {
    nodes,
    countries: COUNTRIES,
    message: req.query.message || '',
    error: req.query.error || ''
  });
});

app.post('/nodes', requireAuth, async (req, res) => {
  try {
    const { panel_url, panel_path, username, password, inbound_id, country_code, label_suffix } = req.body;

    const country = COUNTRIES.find(c => c.code === country_code);
    if (!country) throw new Error('Страна не найдена');

    const info = db.prepare(`
      INSERT INTO nodes (
        name,
        panel_url,
        panel_path,
        sub_base_url,
        username,
        password_enc,
        inbound_id,
        country_code,
        country_name_ru,
        country_flag,
        label_suffix
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      country.name_ru,
      String(panel_url || '').trim(),
      String(panel_path || '').trim(),
      '',
      String(username || '').trim(),
      encrypt(String(password || '').trim(), APP_SECRET),
      Number(inbound_id),
      country.code,
      country.name_ru,
      country.flag,
      String(label_suffix || '').trim()
    );

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(info.lastInsertRowid);
    await checkNode(node);

    res.redirect('/nodes?message=' + encodeURIComponent('Узел добавлен и проверен'));
  } catch (err) {
    res.redirect('/nodes?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/nodes/:id/check', requireAuth, async (req, res) => {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(req.params.id));

  if (!node) {
    return res.redirect('/nodes?error=' + encodeURIComponent('Узел не найден'));
  }

  const result = await checkNode(node);
  const msg = result.ok ? 'Узел онлайн' : `Узел офлайн: ${result.error}`;

  res.redirect('/nodes?message=' + encodeURIComponent(msg));
});

app.get('/nodes/:id/edit', requireAuth, (req, res) => {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(req.params.id));

  if (!node) {
    return res.redirect('/nodes?error=' + encodeURIComponent('Узел не найден'));
  }

  render(res, 'node_edit', {
    node,
    countries: COUNTRIES,
    message: req.query.message || '',
    error: req.query.error || ''
  });
});

app.post('/nodes/:id/edit', requireAuth, async (req, res) => {
  try {
    const nodeId = Number(req.params.id);
    const existingNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);

    if (!existingNode) {
      return res.redirect('/nodes?error=' + encodeURIComponent('Узел не найден'));
    }

    const {
      panel_url,
      panel_path,
      username,
      password,
      inbound_id,
      country_code,
      label_suffix
    } = req.body;

    const country = COUNTRIES.find(c => c.code === country_code);
    if (!country) throw new Error('Страна не найдена');

    const updatedPasswordEnc = String(password || '').trim()
      ? encrypt(String(password).trim(), APP_SECRET)
      : existingNode.password_enc;

    db.prepare(`
      UPDATE nodes
      SET
        name = ?,
        panel_url = ?,
        panel_path = ?,
        sub_base_url = ?,
        username = ?,
        password_enc = ?,
        inbound_id = ?,
        country_code = ?,
        country_name_ru = ?,
        country_flag = ?,
        label_suffix = ?
      WHERE id = ?
    `).run(
      country.name_ru,
      String(panel_url || '').trim(),
      String(panel_path || '').trim(),
      '',
      String(username || '').trim(),
      updatedPasswordEnc,
      Number(inbound_id),
      country.code,
      country.name_ru,
      country.flag,
      String(label_suffix || '').trim(),
      nodeId
    );

    const updatedNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
    await checkNode(updatedNode);

    res.redirect('/nodes?message=' + encodeURIComponent('Узел обновлён'));
  } catch (err) {
    res.redirect('/nodes/' + req.params.id + '/edit?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/nodes/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM nodes WHERE id = ?').run(Number(req.params.id));
  res.redirect('/nodes?message=' + encodeURIComponent('Узел удалён'));
});

app.get('/clients', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim();
  const like = `%${q}%`;
  const clients = q
    ? db.prepare(`
        SELECT c.*,
          (
            SELECT cn.remote_sub_url
            FROM client_nodes cn
            WHERE cn.client_id = c.id
              AND cn.remote_sub_url LIKE 'http%'
            ORDER BY cn.id ASC
            LIMIT 1
          ) AS source_sub_url
        FROM clients c
        WHERE c.login LIKE ? OR c.display_name LIKE ? OR c.uuid LIKE ?
        ORDER BY c.id DESC
      `).all(like, like, like)
    : db.prepare(`
        SELECT c.*,
          (
            SELECT cn.remote_sub_url
            FROM client_nodes cn
            WHERE cn.client_id = c.id
              AND cn.remote_sub_url LIKE 'http%'
            ORDER BY cn.id ASC
            LIMIT 1
          ) AS source_sub_url
        FROM clients c
        ORDER BY c.id DESC
      `).all();

  const nodes = db.prepare('SELECT * FROM nodes WHERE enabled = 1 ORDER BY id ASC').all();

  render(res, 'clients', {
    clients,
    nodes,
    message: req.query.message || '',
    error: req.query.error || '',
    baseUrl: BASE_URL,
    q,
    nextLogin: getNextAutoLogin()
  });
});

app.post('/clients', requireAuth, async (req, res) => {
  try {
    const { login, limit_ip, duration_days, traffic_gb } = req.body;
    let nodeIds = req.body.node_ids || [];

    if (!Array.isArray(nodeIds)) nodeIds = [nodeIds];
    if (!nodeIds.length) throw new Error('Нужно выбрать хотя бы один узел');

    const cleanLogin = String(login || '').trim() || getNextAutoLogin();
    const cleanDisplayName = cleanLogin;
    const cleanLimitIp = Math.max(1, Number(limit_ip || 1));
    const cleanDurationDays = Math.max(0, Number(duration_days || 0));
    const cleanTrafficGb = Math.max(0, Number(traffic_gb || 0));
    const totalGbBytes = toTotalGbBytes(cleanTrafficGb);

    const expiryTime = cleanDurationDays > 0
      ? Date.now() + cleanDurationDays * 24 * 60 * 60 * 1000
      : 0;

    const uuid = randomUUID();
    const sharedSubId = randomUUID().replace(/-/g, '').slice(0, 16);
    const subSlug = sharedSubId;

    const clientInfo = db.prepare(`
      INSERT INTO clients (login, display_name, uuid, sub_slug, duration_days, traffic_gb)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cleanLogin, cleanDisplayName, uuid, subSlug, cleanDurationDays, cleanTrafficGb);

    const clientId = clientInfo.lastInsertRowid;

    for (const nodeIdRaw of nodeIds) {
      const nodeId = Number(nodeIdRaw);
      const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);

      if (!node) throw new Error(`Узел ${nodeId} не найден`);

      const inbound = await getInbound(node);
      const settings = safeParseJsonField(inbound.settings, {});
      const clientEmail = cleanLogin;

      const clientPayload = {
        id: Number(node.inbound_id),
        settings: JSON.stringify({
          clients: [{
            id: uuid,
            email: clientEmail,
            flow: settings.clients?.[0]?.flow || '',
            limitIp: cleanLimitIp,
            totalGB: totalGbBytes,
            expiryTime,
            enable: true,
            tgId: '',
            subId: sharedSubId,
            reset: cleanDurationDays > 0 && cleanTrafficGb > 0 ? cleanDurationDays : 0
          }]
        })
      };

      await addClient(node, clientPayload);

      const subUrl = buildNativeSubUrl(node, sharedSubId);

      db.prepare(`
        INSERT INTO client_nodes (
          client_id,
          node_id,
          remote_email,
          remote_uuid,
          remote_sub_url
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(clientId, node.id, clientEmail, uuid, subUrl);
    }

    res.redirect('/clients?message=' + encodeURIComponent('Клиент создан на выбранных узлах'));
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/clients/import', requireAuth, async (req, res) => {
  try {
    const sourceNodeId = Number(req.body.node_id);
    const sourceNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(sourceNodeId);

    if (!sourceNode) throw new Error('Узел не найден');

    const result = await syncClientsFromSourceNode(sourceNode);

    res.redirect('/clients?message=' + encodeURIComponent(
      `Импорт завершён. Источник: ${result.totalSourceClients}, новых клиентов: ${result.imported}, создано на узлах: ${result.remoteCreated}, связей: ${result.mappingsCreated}`
    ));
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/clients/refresh-subscriptions', requireAuth, async (req, res) => {
  try {
    const sourceNodeId = Number(req.body.node_id);
    const sourceNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(sourceNodeId);

    if (!sourceNode) throw new Error('Узел не найден');

    const result = await syncClientsFromSourceNode(sourceNode);

    res.redirect('/clients?message=' + encodeURIComponent(
      `Синхронизация завершена. Новых клиентов: ${result.imported}, создано на узлах: ${result.remoteCreated}, связей: ${result.mappingsCreated}`
    ));
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/clients/delete-all', requireAuth, async (req, res) => {
  try {
    const deleteMode = String(req.body.delete_mode || 'aggregator');
    const clients = db.prepare('SELECT * FROM clients ORDER BY id ASC').all();

    for (const client of clients) {
      await deleteClientEverywhere(client, deleteMode);
    }

    res.redirect('/clients?message=' + encodeURIComponent('Все клиенты удалены'));
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/clients/bulk-delete', requireAuth, async (req, res) => {
  try {
    let ids = req.body.client_ids || [];
    const deleteMode = String(req.body.delete_mode || 'aggregator');

    if (!Array.isArray(ids)) ids = [ids];
    ids = ids.map(Number).filter(Boolean);

    for (const id of ids) {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (client) await deleteClientEverywhere(client, deleteMode);
    }

    res.redirect('/clients?message=' + encodeURIComponent(`Удалено клиентов: ${ids.length}`));
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/clients/:id/sync', requireAuth, async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    let nodeIds = req.body.node_ids || [];

    if (!Array.isArray(nodeIds)) nodeIds = [nodeIds];
    if (!nodeIds.length) throw new Error('Нужно выбрать хотя бы один узел');

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!client) throw new Error('Клиент не найден');

    const mappings = db.prepare(`
      SELECT * FROM client_nodes
      WHERE client_id = ?
      ORDER BY id ASC
    `).all(clientId);

    if (!mappings.length) throw new Error('У клиента нет исходного узла');

    const sourceMap = mappings[0];
    const sourceNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(sourceMap.node_id);

    if (!sourceNode) throw new Error('Исходный узел не найден');

    const { clientCfg } = await getClientConfigFromNode(sourceNode, sourceMap.remote_uuid, sourceMap.remote_email);

    for (const nodeIdRaw of nodeIds) {
      const nodeId = Number(nodeIdRaw);

      const alreadyExists = db.prepare(`
        SELECT id FROM client_nodes
        WHERE client_id = ? AND node_id = ?
      `).get(clientId, nodeId);

      if (alreadyExists) continue;

      const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
      if (!node) continue;

      const inbound = await getInbound(node);
      const settings = safeParseJsonField(inbound.settings, {});

      const clientEmail = sourceMap.remote_email;
      const subId = clientCfg?.subId || client.sub_slug || randomUUID().replace(/-/g, '').slice(0, 16);

      const payload = {
        id: Number(node.inbound_id),
        settings: JSON.stringify({
          clients: [{
            id: client.uuid,
            email: clientEmail,
            flow: clientCfg?.flow || settings.clients?.[0]?.flow || '',
            limitIp: clientCfg?.limitIp || 1,
            totalGB: Number(clientCfg?.totalGB || 0),
            expiryTime: clientCfg?.expiryTime || 0,
            enable: clientCfg?.enable !== false,
            tgId: clientCfg?.tgId || '',
            subId,
            reset: clientCfg?.reset || 0
          }]
        })
      };

      await addClient(node, payload);

      const subUrl = buildNativeSubUrl(node, subId);

      db.prepare(`
        INSERT INTO client_nodes (
          client_id,
          node_id,
          remote_email,
          remote_uuid,
          remote_sub_url
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(clientId, node.id, clientEmail, client.uuid, subUrl);
    }

    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.get('/clients/:id', requireAuth, async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(req.params.id));

  if (!client) {
    return res.status(404).send('Client not found');
  }

  const mappings = db.prepare(`
    SELECT cn.*, n.name AS node_name, n.country_code, n.country_name_ru, n.country_flag, n.label_suffix, n.last_status, n.inbound_id
    FROM client_nodes cn
    JOIN nodes n ON n.id = cn.node_id
    WHERE cn.client_id = ?
    ORDER BY cn.id ASC
  `).all(client.id);

  const lines = await buildSubscriptionLines(client, true);
  const nodes = db.prepare('SELECT * FROM nodes WHERE enabled = 1 ORDER BY id ASC').all();

  const sourceSubUrl =
    mappings.find(m => m.remote_sub_url && /^https?:\/\//.test(m.remote_sub_url))?.remote_sub_url || '';

  render(res, 'client_detail', {
    client,
    mappings,
    subscription: lines.join('\n'),
    baseUrl: BASE_URL,
    sourceSubUrl,
    nodes
  });
});

app.post('/clients/:id/delete', requireAuth, async (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(req.params.id));

    if (!client) {
      return res.redirect('/clients?error=' + encodeURIComponent('Клиент не найден'));
    }

    const deleteMode = String(req.body.delete_mode || 'all');

    await deleteClientEverywhere(client, deleteMode);

    res.redirect('/clients?message=' + encodeURIComponent('Клиент удалён'));
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.get('/sub/:slug', async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE sub_slug = ? AND enabled = 1').get(req.params.slug);

  if (!client) {
    return res.status(404).send('Subscription not found');
  }

  const lines = await buildSubscriptionLines(client, true);
  const subscriptionName = getSetting('subscription_name', DEFAULT_SUBSCRIPTION_NAME);

  const fileName = `${subscriptionName}.txt`;
  const base64Title = Buffer.from(subscriptionName).toString('base64');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.setHeader('Profile-Title', `base64:${base64Title}`);

  res.send(lines.join('\n'));
});

app.get('/json/:slug', async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE sub_slug = ? AND enabled = 1').get(req.params.slug);

  if (!client) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const lines = await buildSubscriptionLines(client, true);
  const subscriptionName = getSetting('subscription_name', DEFAULT_SUBSCRIPTION_NAME);

  res.json({
    name: subscriptionName,
    slug: client.sub_slug,
    login: client.login,
    count: lines.length,
    subscriptions: lines
  });
});


app.get('/qr', async (req, res) => {
  try {
    const text = String(req.query.text || '').trim();
    if (!text) return res.status(400).send('Missing text');

    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M'
    });

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  } catch (err) {
    res.status(500).send(String(err.message || err));
  }
});

app.get('/open/:slug', async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE sub_slug = ? AND enabled = 1').get(req.params.slug);
  if (!client) return res.status(404).send('Subscription not found');

  render(res, 'open_sub', {
    client,
    subUrl: `${BASE_URL}/sub/${client.sub_slug}`,
    jsonUrl: `${BASE_URL}/json/${client.sub_slug}`,
    baseUrl: BASE_URL
  });
});

app.get('/healthz', async (req, res) => {
  res.json({
    ok: true,
    service: '3xui-aggregator',
    now: new Date().toISOString()
  });
});

app.get('/debug/inbound/:nodeId', requireAuth, async (req, res) => {
  try {
    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(req.params.nodeId));

    if (!node) {
      return res.status(404).json({ error: 'node not found' });
    }

    const inbound = await getInbound(node);
    res.json(inbound);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log(`3xui-aggregator started on :${PORT}`));
