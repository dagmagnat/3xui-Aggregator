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
const fs = require('fs');
const path = require('path');
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
const TRUST_PROXY = String(process.env.TRUST_PROXY || '').toLowerCase() === '1' || String(process.env.TRUST_PROXY || '').toLowerCase() === 'true';
const SESSION_SECURE = String(process.env.SESSION_SECURE || '').toLowerCase() === '1' || String(process.env.SESSION_SECURE || '').toLowerCase() === 'true';
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);

if (TRUST_PROXY) app.set('trust proxy', 1);

const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 12000);

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function setSubscriptionNoCacheHeaders(res, subscriptionName = 'VPN', ext = 'txt') {
  const safeName = String(subscriptionName || 'VPN').trim() || 'VPN';
  const base64Title = Buffer.from(safeName).toString('base64');
  const fileName = `${safeName}.${ext}`;

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Profile-Title', `base64:${base64Title}`);
  res.setHeader('Subscription-Title', `base64:${base64Title}`);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
}


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: SESSION_SECURE
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
      limit_ip INTEGER NOT NULL DEFAULT 1,
      expiry_time INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      node_id INTEGER NOT NULL,
      remote_email TEXT NOT NULL,
      remote_uuid TEXT NOT NULL,
      remote_sub_url TEXT DEFAULT '',
      traffic_gb INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, node_id)
    );

    CREATE TABLE IF NOT EXISTS node_inbound_cache (
      node_id INTEGER PRIMARY KEY,
      inbound_id INTEGER NOT NULL,
      inbound_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try { db.prepare(`ALTER TABLE nodes ADD COLUMN country_code TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN country_name_ru TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN country_flag TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN sub_base_url TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE nodes ADD COLUMN label_suffix TEXT DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 0`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN traffic_gb INTEGER NOT NULL DEFAULT 0`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN limit_ip INTEGER NOT NULL DEFAULT 1`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN expiry_time INTEGER NOT NULL DEFAULT 0`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE clients ADD COLUMN comment TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}
  try { db.prepare(`ALTER TABLE client_nodes ADD COLUMN traffic_gb INTEGER NOT NULL DEFAULT 0`).run(); } catch (_) {}

  const existingAdmin = db.prepare('SELECT id FROM app_users WHERE username = ?').get(ADMIN_USERNAME);
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO app_users (username, password_hash) VALUES (?, ?)').run(ADMIN_USERNAME, passwordHash);
  }

  const existingSubName = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('subscription_name');
  if (!existingSubName) {
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('subscription_name', DEFAULT_SUBSCRIPTION_NAME);
  }

  const existingAllowedIps = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('admin_allowed_ips');
  if (!existingAllowedIps) {
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('admin_allowed_ips', '');
  }
}

initDb();

function getClientIp(req) {
  const raw = TRUST_PROXY
    ? String(req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '')
    : String(req.socket.remoteAddress || req.ip || '');

  return raw
    .split(',')[0]
    .trim()
    .replace(/^::ffff:/, '');
}

function parseAllowedIps() {
  const raw = getSetting('admin_allowed_ips', '');
  return String(raw || '')
    .split(/[\s,;]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function isAdminIpAllowed(req) {
  const allowed = parseAllowedIps();
  if (!allowed.length) return true;
  return allowed.includes(getClientIp(req));
}

function requireAllowedAdminIp(req, res, next) {
  if (isAdminIpAllowed(req)) return next();
  return res.status(403).send('Access denied: this IP is not allowed for admin panel.');
}

const loginFailures = new Map();

function loginFailureKey(req, username) {
  return `${getClientIp(req)}:${String(username || '').toLowerCase()}`;
}

function getLoginFailure(req, username) {
  const key = loginFailureKey(req, username);
  const item = loginFailures.get(key);
  if (!item) return { key, count: 0, lockedUntil: 0 };
  if (item.lockedUntil && Date.now() > item.lockedUntil) {
    loginFailures.delete(key);
    return { key, count: 0, lockedUntil: 0 };
  }
  return { key, ...item };
}

function requireAuth(req, res, next) {
  if (!isAdminIpAllowed(req)) {
    return req.session.destroy(() => res.status(403).send('Access denied: this IP is not allowed for admin panel.'));
  }

  if (!req.session.userId) return res.redirect('/login');
  const now = Date.now();
  const currentIp = getClientIp(req);
  const lastActivity = Number(req.session.lastActivity || 0);
  const loginIp = String(req.session.loginIp || '');

  if (loginIp && currentIp && loginIp !== currentIp) {
    return req.session.destroy(() => res.redirect('/login'));
  }

  if (lastActivity && now - lastActivity > 30 * 60 * 1000) {
    return req.session.destroy(() => res.redirect('/login'));
  }

  req.session.loginIp = currentIp;
  req.session.lastActivity = now;
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

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value ?? ''));
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

  const response = await fetchWithTimeout(`${rootUrl}/login`, {
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

  const response = await fetchWithTimeout(`${rootUrl}${path}`, {
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

  const response = await fetchWithTimeout(`${rootUrl}${path}`, {
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

function getCachedInbound(node) {
  const row = db.prepare('SELECT inbound_json FROM node_inbound_cache WHERE node_id = ? AND inbound_id = ?')
    .get(Number(node.id), Number(node.inbound_id));

  if (!row || !row.inbound_json) return null;
  return safeParseJsonField(row.inbound_json, null);
}

function saveInboundCache(node, inbound) {
  if (!node || !node.id || !inbound) return;

  db.prepare(`
    INSERT INTO node_inbound_cache (node_id, inbound_id, inbound_json, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(node_id) DO UPDATE SET
      inbound_id = excluded.inbound_id,
      inbound_json = excluded.inbound_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(Number(node.id), Number(node.inbound_id), JSON.stringify(inbound));
}

async function getInbound(node) {
  const data = await apiGet(node, `/panel/api/inbounds/get/${node.inbound_id}`);
  const inbound = data.obj || data;
  saveInboundCache(node, inbound);
  return inbound;
}

async function getInboundFast(node) {
  const cached = getCachedInbound(node);
  if (cached) return cached;

  const data = await apiGet(node, `/panel/api/inbounds/get/${node.inbound_id}`);
  const inbound = data.obj || data;
  saveInboundCache(node, inbound);
  return inbound;
}

async function getInbounds(node) {
  const data = await apiGet(node, '/panel/api/inbounds/list');
  return data.obj || data;
}

async function addClient(node, payload) {
  return apiPost(node, '/panel/api/inbounds/addClient', payload, true);
}

async function updateClient(node, clientUuid, payload) {
  return apiPost(node, `/panel/api/inbounds/updateClient/${encodeURIComponent(clientUuid)}`, payload, true);
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
  const response = await fetchWithTimeout(url, {
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
  // v9: subscriptions/JSON must not depend on live API responses from every node.
  // The aggregator uses its local DB mappings first and cached inbound settings when a node is offline.
  // If a client was created outside the aggregator but uses the same UUID/email, enabled nodes are added as
  // fallback rows too; this prevents one unavailable node from making other regions disappear.
  const mappedRows = db.prepare(`
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
    ORDER BY n.id DESC, cn.id ASC
  `).all(clientRow.id);

  const mappedNodeIds = new Set(mappedRows.map(row => Number(row.node_id)));
  const fallbackNodes = db.prepare(`
    SELECT
      NULL AS client_node_id,
      '' AS remote_sub_url,
      ? AS remote_uuid,
      ? AS remote_email,
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
    FROM nodes n
    WHERE n.enabled = 1
    ORDER BY n.id DESC
  `).all(clientRow.uuid, clientRow.login).filter(row => !mappedNodeIds.has(Number(row.node_id)));

  const rows = [...mappedRows, ...fallbackNodes];
  const lines = [];
  const seen = new Set();

  for (const row of rows) {
    try {
      if (Number(row.enabled) !== 1) continue;
      if (!includeOffline && row.last_status === 'offline') continue;

      let inbound = getCachedInbound(row);

      if (!inbound) {
        try {
          inbound = await getInboundFast(row);
        } catch (err) {
          console.error(`No cached inbound and node is unavailable (${row.node_id}):`, err.message);
          continue;
        }
      }

      const stream = safeParseJsonField(inbound.streamSettings, {});
      let subUrl = '';

      if (inbound.protocol === 'vless' && stream.security === 'reality') {
        subUrl = buildVlessRealityLink(
          row,
          inbound,
          row.remote_uuid || clientRow.uuid,
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
      comment: String(c.comment || c.remark || c.description || "").trim(),
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


function findRemoteClient(settings, uuid, email) {
  const clients = Array.isArray(settings?.clients) ? settings.clients : [];
  uuid = String(uuid || '').trim();
  email = String(email || '').trim();
  return clients.find(c => uuid && String(c.id || '').trim() === uuid) ||
         clients.find(c => email && String(c.email || '').trim() === email) || null;
}

function upsertClientNodeMap(clientRow, node, rc, trafficGb) {
  const subUrl = buildNativeSubUrl(node, rc.subId || clientRow.sub_slug);
  const old = db.prepare('SELECT * FROM client_nodes WHERE client_id = ? AND node_id = ?').get(clientRow.id, node.id);
  if (!old) {
    const info = db.prepare('INSERT INTO client_nodes (client_id,node_id,remote_email,remote_uuid,remote_sub_url,traffic_gb) VALUES (?,?,?,?,?,?)')
      .run(clientRow.id, node.id, rc.email || clientRow.login, rc.uuid || clientRow.uuid, subUrl, trafficGb);
    return { row: db.prepare('SELECT * FROM client_nodes WHERE id = ?').get(info.lastInsertRowid), created: true };
  }
  db.prepare('UPDATE client_nodes SET remote_email = ?, remote_uuid = ?, remote_sub_url = ?, traffic_gb = ? WHERE id = ?')
    .run(rc.email || clientRow.login, rc.uuid || clientRow.uuid, subUrl, trafficGb, old.id);
  return { row: db.prepare('SELECT * FROM client_nodes WHERE id = ?').get(old.id), created: false };
}

function buildClientPayloadForImport(node, inbound, rc, clientRow, oldRemote) {
  const settings = safeParseJsonField(inbound.settings, {});
  const trafficGb = fromTotalGbBytes(rc.totalGB || 0) || Number(clientRow.traffic_gb || 0);
  return {
    id: Number(node.inbound_id),
    settings: JSON.stringify({ clients: [{
      id: rc.uuid || clientRow.uuid,
      email: rc.email || clientRow.login,
      flow: rc.flow || oldRemote?.flow || settings.clients?.[0]?.flow || '',
      limitIp: Number(rc.limitIp || clientRow.limit_ip || oldRemote?.limitIp || 1),
      totalGB: Number(rc.totalGB || toTotalGbBytes(trafficGb)),
      expiryTime: Number(rc.expiryTime || clientRow.expiry_time || oldRemote?.expiryTime || 0),
      enable: rc.enable !== false && clientRow.enabled !== 0,
      tgId: rc.tgId || oldRemote?.tgId || '',
      subId: rc.subId || oldRemote?.subId || clientRow.sub_slug,
      reset: Number(rc.reset || clientRow.duration_days || oldRemote?.reset || 0),
      comment: String(rc.comment || clientRow.comment || oldRemote?.comment || '').trim()
    }] })
  };
}

async function ensureImportedClientOnNode(node, clientRow, rc) {
  const trafficGb = fromTotalGbBytes(rc.totalGB || 0);
  const map = upsertClientNodeMap(clientRow, node, rc, trafficGb);
  const inbound = await getInbound(node);
  const settings = safeParseJsonField(inbound.settings, {});
  const oldRemote = findRemoteClient(settings, rc.uuid || clientRow.uuid, rc.email || clientRow.login);
  const payload = buildClientPayloadForImport(node, inbound, rc, clientRow, oldRemote);
  if (!oldRemote) {
    await addClient(node, payload);
    return { mapCreated: map.created, remoteCreated: true, remoteUpdated: false };
  }
  try {
    await updateClient(node, oldRemote.id || rc.uuid || clientRow.uuid, payload);
    return { mapCreated: map.created, remoteCreated: false, remoteUpdated: true };
  } catch (e) {
    const freshInbound = await getInbound(node);
    const freshSettings = safeParseJsonField(freshInbound.settings, {});
    if (!findRemoteClient(freshSettings, rc.uuid || clientRow.uuid, rc.email || clientRow.login)) {
      await addClient(node, payload);
      return { mapCreated: map.created, remoteCreated: true, remoteUpdated: false };
    }
    throw e;
  }
}

async function syncClientsFromSourceNode(sourceNode) {
  const allNodes = db.prepare('SELECT * FROM nodes WHERE enabled = 1 ORDER BY id ASC').all();
  if (!allNodes.length) throw new Error('Нет доступных узлов');
  const remoteClients = await importClientsFromNode(sourceNode);
  let imported = 0, updated = 0, mappingsCreated = 0, remoteCreated = 0, remoteUpdated = 0, skipped = 0, failed = 0;
  const errors = [];
  for (const rc of remoteClients) {
    let clientRow = db.prepare('SELECT * FROM clients WHERE uuid = ?').get(rc.uuid);
    const remoteTrafficGb = fromTotalGbBytes(rc.totalGB);
    const remoteLogin = String(rc.email || '').trim() || 'imported';
    if (!clientRow) {
      let subSlug = rc.subId || randomUUID().replace(/-/g, '').slice(0, 16);
      if (db.prepare('SELECT id FROM clients WHERE sub_slug = ?').get(subSlug)) subSlug += '-' + randomUUID().replace(/-/g, '').slice(0, 6);
      const info = db.prepare('INSERT INTO clients (login,display_name,uuid,sub_slug,duration_days,traffic_gb,limit_ip,expiry_time,enabled,comment) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(makeUniqueLogin(remoteLogin), remoteLogin, rc.uuid, subSlug, Number(rc.reset || 0), remoteTrafficGb, rc.limitIp || 1, rc.expiryTime || 0, rc.enable !== false ? 1 : 0, rc.comment || '');
      clientRow = db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid);
      imported++;
    } else {
      let subSlug = clientRow.sub_slug;
      if (rc.subId && clientRow.sub_slug !== rc.subId && !db.prepare('SELECT id FROM clients WHERE sub_slug = ? AND id != ?').get(rc.subId, clientRow.id)) subSlug = rc.subId;
      const newLogin = makeUniqueLogin(remoteLogin, clientRow.id);
      db.prepare('UPDATE clients SET login=?,display_name=?,sub_slug=?,duration_days=?,traffic_gb=?,limit_ip=?,expiry_time=?,enabled=?,comment=? WHERE id=?')
        .run(newLogin, remoteLogin, subSlug, Number(rc.reset || clientRow.duration_days || 0), remoteTrafficGb, rc.limitIp || 1, rc.expiryTime || 0, rc.enable !== false ? 1 : 0, rc.comment || '', clientRow.id);
      clientRow = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientRow.id);
      updated++;
    }
    for (const node of allNodes) {
      try {
        const r = await ensureImportedClientOnNode(node, clientRow, rc);
        if (r.mapCreated) mappingsCreated++;
        if (r.remoteCreated) remoteCreated++;
        if (r.remoteUpdated) remoteUpdated++;
        if (Number(node.id) === Number(sourceNode.id)) skipped++;
      } catch (e) {
        failed++;
        const msg = 'Узел ' + node.id + ' (' + (node.name || node.country_name_ru || 'без имени') + '): ' + (e.message || e);
        errors.push(msg);
        console.error('Не удалось синхронизировать клиента ' + rc.email + ': ' + msg);
      }
    }
  }
  return { imported, updated, mappingsCreated, remoteCreated, remoteUpdated, skipped, failed, errors: errors.slice(0, 10), totalSourceClients: remoteClients.length };
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

function pickClientFlow(settings, uuid, fallback = '') {
  const clients = Array.isArray(settings?.clients) ? settings.clients : [];
  return clients.find(c => c.id === uuid)?.flow || clients[0]?.flow || fallback || '';
}

async function updateClientOnNode(node, map, client, opts = {}) {
  const inbound = await getInbound(node);
  const settings = safeParseJsonField(inbound.settings, {});
  const current = (settings.clients || []).find(c => c.id === map.remote_uuid) ||
                  (settings.clients || []).find(c => c.email === map.remote_email) || {};

  const durationDays = Math.max(0, Number(opts.duration_days ?? client.duration_days ?? 0));
  const trafficGb = Math.max(0, Number(opts.traffic_gb ?? map.traffic_gb ?? client.traffic_gb ?? 0));
  const limitIp = Math.max(1, Number(opts.limit_ip ?? client.limit_ip ?? current.limitIp ?? 1));
  const expiryTime = Math.max(0, Number(opts.expiry_time ?? client.expiry_time ?? current.expiryTime ?? 0));
  const email = String(opts.email || client.login || map.remote_email || current.email || '').trim();
  const subId = opts.subId || current.subId || client.sub_slug || randomUUID().replace(/-/g, '').slice(0, 16);
  const comment = String(opts.comment ?? client.comment ?? current.comment ?? '').trim();

  const payload = {
    id: Number(node.inbound_id),
    settings: JSON.stringify({
      clients: [{
        id: map.remote_uuid,
        email,
        flow: current.flow || pickClientFlow(settings, map.remote_uuid),
        limitIp,
        totalGB: toTotalGbBytes(trafficGb),
        expiryTime,
        enable: opts.enabled !== undefined ? Boolean(opts.enabled) : (client.enabled !== 0 && current.enable !== false),
        tgId: current.tgId || '',
        subId,
        reset: durationDays > 0 && trafficGb > 0 ? durationDays : 0,
        comment
      }]
    })
  };

  await updateClient(node, map.remote_uuid, payload);
  db.prepare('UPDATE client_nodes SET remote_email = ?, traffic_gb = ? WHERE id = ?').run(email, trafficGb, map.id);
}

async function updateClientEverywhere(client, opts = {}) {
  const mappings = db.prepare('SELECT * FROM client_nodes WHERE client_id = ?').all(client.id);
  for (const map of mappings) {
    try {
      const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(map.node_id);
      if (!node) continue;
      await updateClientOnNode(node, map, client, opts);
    } catch (err) {
      console.error('Update remote client failed:', err.message);
    }
  }
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

app.get('/login', requireAllowedAdminIp, (req, res) => render(res, 'login', { error: req.query.message || null }));

app.post('/login', requireAllowedAdminIp, (req, res) => {
  const username = String(req.body.username || '');
  const failure = getLoginFailure(req, username);

  if (failure.lockedUntil && Date.now() < failure.lockedUntil) {
    const minutes = Math.ceil((failure.lockedUntil - Date.now()) / 60000);
    return render(res, 'login', { error: `Слишком много попыток входа. Повтори через ${minutes} мин.` });
  }

  const user = db.prepare('SELECT * FROM app_users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash)) {
    const count = Number(failure.count || 0) + 1;
    const lockedUntil = count >= LOGIN_MAX_ATTEMPTS ? Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000 : 0;
    loginFailures.set(failure.key, { count, lockedUntil });
    return render(res, 'login', { error: 'Неверный логин или пароль' });
  }

  loginFailures.delete(failure.key);
  req.session.regenerate((err) => {
    if (err) return render(res, 'login', { error: 'Не удалось создать сессию' });
    req.session.userId = user.id;
    req.session.loginIp = getClientIp(req);
    req.session.lastActivity = Date.now();
    res.redirect('/dashboard');
  });
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

  const now = Date.now();
  const week = now + 7 * 24 * 60 * 60 * 1000;
  const nodes = db.prepare('SELECT * FROM nodes ORDER BY id DESC').all();
  const expiringClients = db.prepare(`
    SELECT * FROM clients
    WHERE enabled = 1 AND expiry_time > 0 AND expiry_time <= ?
    ORDER BY expiry_time ASC
    LIMIT 25
  `).all(week);

  render(res, 'dashboard', {
    stats,
    nodes,
    expiringClients,
    now,
    baseUrl: BASE_URL,
    message: req.query.message || '',
    error: req.query.error || ''
  });
});

app.get('/routing', requireAuth, (req, res) => {
  const cfg = getRoutingConfig();
  render(res, 'routing', {
    routingPresets: ROUTING_PRESETS,
    selectedPresets: cfg.presets,
    customDomainsText: (cfg.customDomains || []).join('\n'),
    customIpsText: (cfg.customIps || []).join('\n'),
    routingEnabled: cfg.enabled !== false,
    proxyDomains: getRoutingProxyDomains(),
    proxyIps: getRoutingProxyIps(),
    jsonUrlExample: `${BASE_URL}/json/<slug>`,
    message: req.query.message || '',
    error: req.query.error || ''
  });
});

app.post('/routing', requireAuth, (req, res) => {
  try {
    const presetsRaw = req.body.presets;
    const selectedPresets = Array.isArray(presetsRaw) ? presetsRaw : (presetsRaw ? [presetsRaw] : []);
    const allowedPresetKeys = new Set(ROUTING_PRESETS.map(p => p.key));
    const presets = uniqueList(selectedPresets.map(v => String(v || '').trim()).filter(v => allowedPresetKeys.has(v)));
    const parsedDomains = parseRoutingLines(req.body.custom_domains || '', 'domain');
    const parsedIps = parseRoutingLines(req.body.custom_ips || '', 'ip');
    const errors = [...parsedDomains.errors, ...parsedIps.errors];
    if (errors.length) throw new Error(errors.join(' | '));
    const cfg = {
      enabled: req.body.routing_enabled === '1',
      presets,
      customDomains: parsedDomains.values,
      customIps: parsedIps.values
    };
    setSetting('routing_config', JSON.stringify(cfg));
    res.redirect('/routing?message=' + encodeURIComponent('Маршрутизация сохранена. Старые JSON-ссылки применят новые правила при следующем обновлении клиента.'));
  } catch (err) {
    res.redirect('/routing?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.get('/settings', requireAuth, (req, res) => {
  const subscriptionName = getSetting('subscription_name', DEFAULT_SUBSCRIPTION_NAME);
  const currentUser = db.prepare('SELECT username FROM app_users WHERE id = ?').get(req.session.userId);

  render(res, 'settings', {
    subscriptionName,
    adminUsername: currentUser?.username || '',
    adminAllowedIps: getSetting('admin_allowed_ips', ''),
    currentIp: getClientIp(req),
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

    const adminAllowedIps = String(req.body.admin_allowed_ips || '')
      .split(/[\s,;]+/)
      .map(v => v.trim())
      .filter(Boolean)
      .join('\n');

    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run('admin_allowed_ips', adminAllowedIps);

    const currentPassword = String(req.body.current_password || '');
    const newUsername = String(req.body.admin_username || '').trim();
    const newPassword = String(req.body.new_password || '');
    const newPassword2 = String(req.body.new_password_confirm || '');
    const wantsAccountChange = Boolean(newUsername || newPassword || currentPassword || newPassword2);

    if (wantsAccountChange) {
      const user = db.prepare('SELECT * FROM app_users WHERE id = ?').get(req.session.userId);
      if (!user) throw new Error('Администратор не найден');
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        throw new Error('Текущий пароль указан неверно');
      }

      const finalUsername = newUsername || user.username;
      const owner = db.prepare('SELECT id FROM app_users WHERE username = ? AND id != ?').get(finalUsername, user.id);
      if (owner) throw new Error('Такой логин администратора уже существует');

      let finalHash = user.password_hash;
      if (newPassword) {
        if (newPassword.length < 8) throw new Error('Новый пароль должен быть минимум 8 символов');
        if (newPassword !== newPassword2) throw new Error('Новый пароль и повтор не совпадают');
        finalHash = bcrypt.hashSync(newPassword, 12);
      }

      db.prepare('UPDATE app_users SET username = ?, password_hash = ? WHERE id = ?')
        .run(finalUsername, finalHash, user.id);
    }

    res.redirect('/settings?message=' + encodeURIComponent('Настройки сохранены'));
  } catch (err) {
    res.redirect('/settings?error=' + encodeURIComponent(String(err.message || err)));
  }
});

function exportBackupPayload() {
  const tables = ['app_users', 'app_settings', 'nodes', 'clients', 'client_nodes'];
  const data = {};
  for (const table of tables) data[table] = db.prepare(`SELECT * FROM ${table}`).all();
  return { app: '3xui-aggregator', version: 1, created_at: new Date().toISOString(), data };
}

function restoreBackupPayload(payload) {
  if (!payload || payload.app !== '3xui-aggregator' || !payload.data) throw new Error('Неверный файл резервной копии');
  const deleteTables = ['client_nodes', 'clients', 'nodes', 'app_settings', 'app_users'];
  const restoreTables = ['app_users', 'app_settings', 'nodes', 'clients', 'client_nodes'];
  const tx = db.transaction(() => {
    for (const table of deleteTables) db.prepare(`DELETE FROM ${table}`).run();
    for (const table of restoreTables) {
      const rows = Array.isArray(payload.data[table]) ? payload.data[table] : [];
      for (const row of rows) {
        const keys = Object.keys(row);
        if (!keys.length) continue;
        const cols = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map(k => `@${k}`).join(', ');
        db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).run(row);
      }
    }
  });
  tx();
}

app.get('/backup/download', requireAuth, (req, res) => {
  const payload = exportBackupPayload();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="3xui-aggregator-backup-${stamp}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

app.post('/backup/restore', requireAuth, bodyParser.text({ type: '*/*', limit: '50mb' }), (req, res) => {
  try {
    const text = String(req.body || '').trim();
    if (!text) throw new Error('Файл резервной копии пустой');
    restoreBackupPayload(JSON.parse(text));
    req.session.destroy(() => res.redirect('/login?message=' + encodeURIComponent('Резервная копия восстановлена. Войди заново.')));
  } catch (err) {
    res.status(400).send(String(err.message || err));
  }
});

app.get('/nodes', requireAuth, (req, res) => {
  const nodes = db.prepare('SELECT * FROM nodes ORDER BY id DESC').all();

  render(res, 'nodes', {
    nodes,
    countries: [...COUNTRIES].sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru')),
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


app.post('/nodes/:id/toggle', requireAuth, (req, res) => {
  try {
    const nodeId = Number(req.params.id);
    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);

    if (!node) {
      return res.redirect('/nodes?error=' + encodeURIComponent('Узел не найден'));
    }

    const nextEnabled = Number(node.enabled) === 1 ? 0 : 1;

    db.prepare('UPDATE nodes SET enabled = ? WHERE id = ?').run(nextEnabled, nodeId);

    const msg = nextEnabled
      ? 'Узел включён и снова будет попадать в SUB/JSON'
      : 'Узел отключён и не будет попадать в SUB/JSON';

    res.redirect('/nodes?message=' + encodeURIComponent(msg));
  } catch (err) {
    res.redirect('/nodes?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.get('/nodes/:id/edit', requireAuth, (req, res) => {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(req.params.id));

  if (!node) {
    return res.redirect('/nodes?error=' + encodeURIComponent('Узел не найден'));
  }

  render(res, 'node_edit', {
    node,
    countries: [...COUNTRIES].sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru')),
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
        WHERE c.login LIKE ? OR c.display_name LIKE ? OR c.uuid LIKE ? OR IFNULL(c.comment, '') LIKE ?
        ORDER BY c.id DESC
      `).all(like, like, like, like)
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
    const { login, limit_ip, duration_days, traffic_gb, comment } = req.body;
    let nodeIds = req.body.node_ids || [];

    if (!Array.isArray(nodeIds)) nodeIds = [nodeIds];
    if (!nodeIds.length) throw new Error('Нужно выбрать хотя бы один узел');

    const cleanLogin = String(login || '').trim() || getNextAutoLogin();
    const cleanDisplayName = cleanLogin;
    const cleanComment = String(comment || "").trim();
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
      INSERT INTO clients (login, display_name, uuid, sub_slug, duration_days, traffic_gb, limit_ip, expiry_time, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cleanLogin, cleanDisplayName, uuid, subSlug, cleanDurationDays, cleanTrafficGb, cleanLimitIp, expiryTime, cleanComment);

    const clientId = clientInfo.lastInsertRowid;

    for (const nodeIdRaw of nodeIds) {
      const nodeId = Number(nodeIdRaw);
      const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);

      if (!node) throw new Error(`Узел ${nodeId} не найден`);

      const inbound = await getInbound(node);
      const settings = safeParseJsonField(inbound.settings, {});
      const clientEmail = cleanLogin;
      const nodeTrafficRaw = req.body[`node_traffic_gb_${node.id}`];
      const nodeTrafficGb = String(nodeTrafficRaw || '').trim() === '' ? cleanTrafficGb : Math.max(0, Number(nodeTrafficRaw || 0));
      const nodeTotalGbBytes = toTotalGbBytes(nodeTrafficGb);

      const clientPayload = {
        id: Number(node.inbound_id),
        settings: JSON.stringify({
          clients: [{
            id: uuid,
            email: clientEmail,
            flow: settings.clients?.[0]?.flow || '',
            limitIp: cleanLimitIp,
            totalGB: nodeTotalGbBytes,
            expiryTime,
            enable: true,
            tgId: '',
            subId: sharedSubId,
            reset: cleanDurationDays > 0 && nodeTrafficGb > 0 ? cleanDurationDays : 0,
            comment: cleanComment
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
          remote_sub_url,
          traffic_gb
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(clientId, node.id, clientEmail, uuid, subUrl, nodeTrafficGb);
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
      `Импорт завершён. Источник: ${result.totalSourceClients}, новых: ${result.imported}, обновлено: ${result.updated}, создано на узлах: ${result.remoteCreated}, обновлено на узлах: ${result.remoteUpdated}, связей: ${result.mappingsCreated}`
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
      `Синхронизация завершена. Новых: ${result.imported}, обновлено: ${result.updated}, создано на узлах: ${result.remoteCreated}, обновлено на узлах: ${result.remoteUpdated}, связей: ${result.mappingsCreated}`
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
          remote_sub_url,
          traffic_gb
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(clientId, node.id, clientEmail, client.uuid, subUrl, 0);
    }

    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.get('/clients/:id', requireAuth, async (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(req.params.id));

    if (!client) {
      return res.status(404).send('Client not found');
    }

    const mappings = db.prepare(`
      SELECT
        cn.*,
        n.id AS node_real_id,
        n.name AS node_name,
        n.country_code,
        n.country_name_ru,
        n.country_flag,
        n.label_suffix,
        n.last_status,
        n.inbound_id
      FROM client_nodes cn
      JOIN nodes n ON n.id = cn.node_id
      WHERE cn.client_id = ?
      ORDER BY cn.id ASC
    `).all(client.id);

    const lines = await buildSubscriptionLines(client, true);
    const nodes = db.prepare(`
      SELECT * FROM nodes
      WHERE enabled = 1
        AND id NOT IN (SELECT node_id FROM client_nodes WHERE client_id = ?)
      ORDER BY id ASC
    `).all(client.id);

    const sourceSubUrl =
      mappings.find(m => m.remote_sub_url && /^https?:\/\//.test(m.remote_sub_url))?.remote_sub_url || '';

    render(res, 'client_detail', {
      client,
      mappings,
      subscription: lines.join('\n'),
      baseUrl: BASE_URL,
      sourceSubUrl,
      nodes,
      message: req.query.message || '',
      error: req.query.error || ''
    });
  } catch (err) {
    console.error('Client detail error:', err);
    res.status(500).send('Internal Server Error: ' + String(err.message || err));
  }
});

app.post('/clients/:id/edit', requireAuth, async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!client) throw new Error('Клиент не найден');

    const login = String(req.body.login || '').trim() || client.login;
    const displayName = String(req.body.display_name || login).trim() || login;
    const limitIp = Math.max(1, Number(req.body.limit_ip || client.limit_ip || 1));
    const durationDays = Math.max(0, Number(req.body.duration_days || 0));
    const trafficGb = Math.max(0, Number(req.body.traffic_gb || 0));
    const comment = String(req.body.comment || "").trim();
    const expiryTime = durationDays > 0 ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : 0;

    const loginOwner = db.prepare('SELECT id FROM clients WHERE login = ? AND id != ?').get(login, clientId);
    if (loginOwner) throw new Error('Такой логин уже существует');

    db.prepare(`
      UPDATE clients
      SET login = ?, display_name = ?, limit_ip = ?, duration_days = ?, traffic_gb = ?, expiry_time = ?, comment = ?
      WHERE id = ?
    `).run(login, displayName, limitIp, durationDays, trafficGb, expiryTime, comment, clientId);

    const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    const mappings = db.prepare('SELECT * FROM client_nodes WHERE client_id = ?').all(clientId);

    for (const map of mappings) {
      const raw = req.body[`node_traffic_gb_${map.node_id}`];
      const nodeTrafficGb = String(raw || '').trim() === '' ? trafficGb : Math.max(0, Number(raw || 0));
      try {
        const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(map.node_id);
        if (!node) continue;
        await updateClientOnNode(node, map, updatedClient, {
          email: login,
          limit_ip: limitIp,
          duration_days: durationDays,
          traffic_gb: nodeTrafficGb,
          expiry_time: expiryTime,
          comment
        });
      } catch (err) {
        console.error('Update client node failed:', err.message);
      }
    }

    const back = String(req.body.back || '/clients');
    if (back === '/clients') {
      return res.redirect('/clients?message=' + encodeURIComponent('Клиент обновлён'));
    }
    res.redirect('/clients/' + clientId + '?message=' + encodeURIComponent('Клиент обновлён'));
  } catch (err) {
    const back = String(req.body.back || '/clients');
    if (back === '/clients') {
      return res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
    }
    res.redirect('/clients/' + req.params.id + '?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/clients/:id/extend', requireAuth, async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const days = Math.max(1, Number(req.body.days || 30));
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!client) throw new Error('Клиент не найден');

    const base = client.expiry_time && client.expiry_time > Date.now() ? client.expiry_time : Date.now();
    const expiryTime = base + days * 24 * 60 * 60 * 1000;
    const durationDays = Math.max(0, Number(client.duration_days || days));

    db.prepare('UPDATE clients SET expiry_time = ?, duration_days = ? WHERE id = ?').run(expiryTime, durationDays, clientId);

    const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    await updateClientEverywhere(updatedClient, { expiry_time: expiryTime, duration_days: durationDays });

    const back = String(req.body.back || '/dashboard');
    if (back === '/clients') {
      return res.redirect('/clients?message=' + encodeURIComponent('Клиент продлён'));
    }
    if (back.includes(`/clients/${clientId}`)) {
      return res.redirect(`/clients/${clientId}?message=${encodeURIComponent('Клиент продлён')}`);
    }
    res.redirect('/dashboard?message=' + encodeURIComponent('Клиент продлён'));
  } catch (err) {
    const back = String(req.body.back || '/dashboard');
    if (back === '/clients') {
      return res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
    }
    res.redirect('/dashboard?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/clients/:id/toggle', requireAuth, async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!client) throw new Error('Клиент не найден');

    const enabled = client.enabled === 1 ? 0 : 1;
    db.prepare('UPDATE clients SET enabled = ? WHERE id = ?').run(enabled, clientId);

    const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    await updateClientEverywhere(updatedClient, { enabled: Boolean(enabled) });

    const msg = enabled ? 'Клиент включён' : 'Клиент отключён';
    const back = String(req.body.back || '');
    if (back.includes(`/clients/${clientId}`)) {
      return res.redirect(`/clients/${clientId}?message=${encodeURIComponent(msg)}`);
    }
    res.redirect(`/clients?message=${encodeURIComponent(msg)}`);
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
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
  const happRoutingLink = buildHappRoutingLink(subscriptionName);

  setSubscriptionNoCacheHeaders(res, subscriptionName, 'txt');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  // HAPP accepts routing/app-management through headers and through body lines.
  // Send both because QR/import flows on iOS may ignore one of the channels.
  res.setHeader('routing', happRoutingLink);
  res.setHeader('profile-title', subscriptionName);
  res.setHeader('profile-update-interval', '1');
  res.setHeader('subscription-auto-update-enable', '1');
  res.setHeader('subscription-auto-update-open-enable', '1');
  res.setHeader('subscription-ping-onopen-enabled', '1');
  res.setHeader('ping-type', 'tcp');
  res.setHeader('ping-result', 'icon');
  res.setHeader('check-url-via-proxy', 'https://www.gstatic.com/generate_204');
  res.setHeader('sniffing-enable', '1');
  res.setHeader('subscriptions-collapse', '0');
  res.setHeader('subscriptions-expand-now', '1');

  const body = [
    `#profile-title: ${subscriptionName}`,
    '#profile-update-interval: 1',
    '#subscription-auto-update-enable: 1',
    '#subscription-auto-update-open-enable: 1',
    '#subscription-ping-onopen-enabled: 1',
    '#ping-type: tcp',
    '#ping-result: icon',
    '#check-url-via-proxy: https://www.gstatic.com/generate_204',
    '#sniffing-enable: 1',
    '#subscriptions-collapse: 0',
    '#subscriptions-expand-now: 1',
    happRoutingLink,
    ...lines
  ].join('\n');

  res.send(body);
});



function parseVlessLineToOutbound(line, index = 0) {
  const url = new URL(line);
  const q = url.searchParams;
  const tag = index === 0 ? 'proxy' : `proxy-${index + 1}`;
  const network = q.get('type') || 'tcp';
  const security = q.get('security') || 'reality';
  const flow = q.get('flow') || '';
  const fp = q.get('fp') || 'chrome';
  const pbk = q.get('pbk') || '';
  const sni = q.get('sni') || '';
  const sid = q.get('sid') || '';
  const spx = q.get('spx') || '/';

  const user = {
    id: decodeURIComponent(url.username || ''),
    encryption: 'none',
    level: 8,
    security: 'auto'
  };

  if (flow) user.flow = flow;

  const outbound = {
    tag,
    protocol: 'vless',
    settings: {
      vnext: [{
        address: url.hostname,
        port: Number(url.port || 443),
        users: [user]
      }]
    },
    streamSettings: {
      network,
      security,
      tcpSettings: {
        header: { type: 'none' }
      }
    },
    mux: {
      enabled: false,
      concurrency: -1,
      xudpConcurrency: 8,
      xudpProxyUDP443: ''
    }
  };

  const remark = getRemarkFromVlessLine(line);
  if (remark) outbound.remarks = remark;

  if (security === 'reality') {
    outbound.streamSettings.realitySettings = {
      show: false,
      fingerprint: fp,
      publicKey: pbk,
      serverName: sni,
      shortId: sid,
      spiderX: spx || '/',
      allowInsecure: false
    };
  }

  return outbound;
}

function getRemarkFromVlessLine(line) {
  try {
    const raw = String(line || '');
    const idx = raw.indexOf('#');
    if (idx >= 0) return decodeURIComponent(raw.slice(idx + 1)).trim();
  } catch (_) {}
  return '';
}



function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function loadIplistDomains(serviceName) {
  try {
    const ipListPath = path.join(__dirname, 'data', 'ip-list.json');
    if (!fs.existsSync(ipListPath)) return [];

    const data = JSON.parse(fs.readFileSync(ipListPath, 'utf8'));
    const entry = data[serviceName];
    if (!entry || !Array.isArray(entry.domains)) return [];

    return entry.domains
      .map(domain => String(domain || '').trim().toLowerCase())
      .filter(domain => domain && !domain.endsWith('.ru'))
      .map(domain => `domain:${domain}`);
  } catch (error) {
    console.warn('Unable to load ip-list domains:', error.message);
    return [];
  }
}


function buildHappRoutingProfile(subscriptionName) {
  const now = Math.floor(Date.now() / 1000).toString();
  return {
    Name: `${subscriptionName || DEFAULT_SUBSCRIPTION_NAME} routing`,
    GlobalProxy: 'false',
    RouteOrder: 'block-proxy-direct',
    UseChunkFiles: 'true',
    RemoteDns: '1.1.1.1',
    RemoteDNSType: 'DoU',
    RemoteDNSDomain: 'https://cloudflare-dns.com/dns-query',
    RemoteDNSIP: '1.1.1.1',
    DomesticDNSType: 'DoU',
    DomesticDNSDomain: 'https://dns.google/dns-query',
    DomesticDNSIP: '8.8.8.8',
    Geoipurl: 'https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat',
    Geositeurl: 'https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat',
    LastUpdated: now,
    DnsHosts: {
      'cloudflare-dns.com': '1.1.1.1',
      'dns.google': '8.8.8.8'
    },
    DirectSites: [],
    DirectIp: [],
    ProxySites: getRoutingProxyDomains(),
    ProxyIp: getRoutingProxyIps(),
    BlockSites: [],
    BlockIp: [],
    DomainStrategy: 'IPIfNonMatch',
    FakeDNS: 'false'
  };
}

function buildHappRoutingLink(subscriptionName) {
  const json = JSON.stringify(buildHappRoutingProfile(subscriptionName));
  const encoded = Buffer.from(json, 'utf8').toString('base64');
  return `happ://routing/onadd/${encoded}`;
}

const ROUTING_PROXY_DOMAINS = uniqueList([
  'geosite:youtube',
  'geosite:meta',
  'geosite:facebook',
  'geosite:instagram',
  'geosite:whatsapp',
  'geosite:openai',
  'geosite:telegram',
  'domain:fbcdn.net',
  'domain:fbsbx.com',
  'domain:messenger.com',
  'domain:m.me',
  'domain:instagram.com',
  'domain:cdninstagram.com',
  'domain:whatsapp.com',
  'domain:whatsapp.net',
  'domain:wa.me'
]);

const ROUTING_PROXY_IPS = uniqueList([
  // These are the only checked service GeoIP tags available in the target
  // /usr/local/x-ui/bin/geoip.dat. Do not add geoip:youtube/instagram/whatsapp/openai/chatgpt
  // unless they exist on the server, otherwise routing may become unreliable.
  'geoip:telegram',
  'geoip:facebook'
]);

const ROUTING_PRESETS = [
  { key: 'youtube', label: 'YouTube', domains: ['geosite:youtube'], ips: [] },
  { key: 'meta', label: 'Meta', domains: ['geosite:meta'], ips: [] },
  { key: 'facebook', label: 'Facebook', domains: ['geosite:facebook'], ips: ['geoip:facebook'] },
  { key: 'instagram', label: 'Instagram', domains: ['geosite:instagram'], ips: [] },
  { key: 'whatsapp', label: 'WhatsApp', domains: ['geosite:whatsapp'], ips: [] },
  { key: 'openai', label: 'OpenAI / ChatGPT', domains: ['geosite:openai'], ips: [] },
  { key: 'telegram', label: 'Telegram', domains: ['geosite:telegram'], ips: ['geoip:telegram'] }
];

const ROUTING_DEFAULT_CUSTOM_DOMAINS = [
  'domain:fbcdn.net',
  'domain:fbsbx.com',
  'domain:messenger.com',
  'domain:m.me',
  'domain:instagram.com',
  'domain:cdninstagram.com',
  'domain:whatsapp.com',
  'domain:whatsapp.net',
  'domain:wa.me'
];

function getDefaultRoutingConfig() {
  return {
    presets: ROUTING_PRESETS.map(p => p.key),
    customDomains: ROUTING_DEFAULT_CUSTOM_DOMAINS,
    customIps: [],
    enabled: true
  };
}

function getRoutingConfig() {
  const raw = getSetting('routing_config', '');
  if (!raw) return getDefaultRoutingConfig();
  try {
    const parsed = JSON.parse(raw);
    const fallback = getDefaultRoutingConfig();
    return {
      enabled: parsed.enabled !== false,
      presets: Array.isArray(parsed.presets) ? parsed.presets : fallback.presets,
      customDomains: Array.isArray(parsed.customDomains) ? parsed.customDomains : fallback.customDomains,
      customIps: Array.isArray(parsed.customIps) ? parsed.customIps : fallback.customIps
    };
  } catch (_) {
    return getDefaultRoutingConfig();
  }
}

function normalizeRoutingLine(value, kind) {
  let line = String(value || '').trim().toLowerCase();
  if (!line) return '';
  line = line.replace(/\s+/g, '');
  if (kind === 'domain') {
    if (/^(geosite|domain|regexp|keyword|full):.+/.test(line)) return line;
    if (/^[a-z0-9*_.-]+\.[a-z0-9_.-]+$/.test(line)) return `domain:${line.replace(/^\*\./, '')}`;
    return null;
  }
  if (kind === 'ip') {
    if (/^geoip:[a-z0-9_-]+$/.test(line)) return line;
    if (/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(line)) return line;
    if (/^[0-9a-f:]+(\/\d{1,3})?$/i.test(line) && line.includes(':')) return line;
    return null;
  }
  return null;
}

function parseRoutingLines(text, kind) {
  const errors = [];
  const values = [];
  String(text || '').split(/[\n,;]+/).map(v => v.trim()).filter(Boolean).forEach((raw, index) => {
    const normalized = normalizeRoutingLine(raw, kind);
    if (!normalized) {
      errors.push(`Строка ${index + 1}: "${raw}" не подходит для ${kind === 'domain' ? 'domain/geosite' : 'ip/geoip'}. Используй geosite:tag, domain:example.com, regexp:..., geoip:tag или CIDR.`);
    } else {
      values.push(normalized);
    }
  });
  return { values: uniqueList(values), errors };
}

function getRoutingProxyDomains() {
  const cfg = getRoutingConfig();
  if (cfg.enabled === false) return [];
  const presetDomains = ROUTING_PRESETS.filter(p => cfg.presets.includes(p.key)).flatMap(p => p.domains);
  return uniqueList([...presetDomains, ...cfg.customDomains]);
}

function getRoutingProxyIps() {
  const cfg = getRoutingConfig();
  if (cfg.enabled === false) return [];
  const presetIps = ROUTING_PRESETS.filter(p => cfg.presets.includes(p.key)).flatMap(p => p.ips);
  return uniqueList([...presetIps, ...cfg.customIps]);
}

const ROUTING_DIRECT_DOMAINS = uniqueList([
  'geosite:private',
  'geosite:category-ru',
  'geosite:apple',
  'geosite:apple-pki',
  'geosite:huawei',
  'geosite:xiaomi',
  'geosite:category-android-app-download',
  'geosite:f-droid',
  'domain:ozon.ru',
  'domain:wildberries.ru',
  'domain:wb.ru',
  'domain:yandex.ru',
  'domain:ya.ru',
  'domain:vk.com',
  'domain:gosuslugi.ru',
  'domain:sber.ru',
  'domain:tbank.ru',
  'domain:alfabank.ru',
  'domain:vtb.ru',
  'domain:mail.ru'
]);

function buildHappJsonConfigFromLine(client, line, subscriptionName, index = 0) {
  const remark = getRemarkFromVlessLine(line) || `Server ${index + 1}`;
  const config = buildHappJsonConfig(client, [line], remark);
  // HAPP and other JSON-array importers use these fields as the visible
  // subscription/server title. Keep them equal to the node remark so every
  // country/region from the node settings is shown as a separate region.
  config.remarks = remark;
  config.name = remark;
  config.ps = remark;
  config.title = remark;
  return config;
}

function buildHappJsonConfig(client, lines, subscriptionName) {
  const proxyOutbounds = lines
    .filter(line => String(line).startsWith('vless://'))
    .map((line, index) => parseVlessLineToOutbound(line, index));

  if (!proxyOutbounds.length) {
    proxyOutbounds.push({
      tag: 'proxy',
      protocol: 'freedom',
      settings: { domainStrategy: 'UseIP' }
    });
  }

  return {
    dns: {
      queryStrategy: 'UseIPv4',
      servers: [
        { address: '1.1.1.1', port: 53, skipFallback: false },
        { address: '8.8.8.8', port: 53, skipFallback: false }
      ],
      tag: 'dns_out'
    },
    inbounds: [
      {
        tag: 'socks',
        port: 10808,
        protocol: 'socks',
        settings: {
          auth: 'noauth',
          udp: true,
          userLevel: 8
        },
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls']
        }
      },
      {
        tag: 'http',
        port: 10809,
        protocol: 'http',
        settings: {
          userLevel: 8
        },
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls']
        }
      }
    ],
    log: {
      loglevel: 'warning'
    },
    outbounds: [
      ...proxyOutbounds,
      {
        tag: 'direct',
        protocol: 'freedom',
        settings: {
          domainStrategy: 'UseIP'
        }
      },
      {
        tag: 'block',
        protocol: 'blackhole',
        settings: {
          response: { type: 'http' }
        }
      }
    ],
    policy: {
      levels: {
        '0': {
          statsUserDownlink: true,
          statsUserUplink: true
        },
        '8': {
          connIdle: 300,
          downlinkOnly: 1,
          handshake: 4,
          uplinkOnly: 1
        }
      },
      system: {
        statsInboundDownlink: true,
        statsInboundUplink: true,
        statsOutboundDownlink: true,
        statsOutboundUplink: true
      }
    },
    remarks: subscriptionName || DEFAULT_SUBSCRIPTION_NAME,
    routing: {
      domainStrategy: 'IPIfNonMatch',
      rules: [
        {
          type: 'field',
          domain: getRoutingProxyDomains(),
          outboundTag: 'proxy'
        },
        {
          type: 'field',
          ip: getRoutingProxyIps(),
          outboundTag: 'proxy'
        },
        {
          type: 'field',
          network: 'tcp,udp',
          outboundTag: 'direct'
        }
      ]
    },
    stats: {},
    happ: {
      routingTitle: `${subscriptionName || 'AMG'} routing`,
      pingType: 'tcp',
      pingResult: 'icon',
      subscriptionUpdateIntervalHours: 1,
      updateOnLaunch: true,
      connectOnLaunch: true,
      preferredMode: 'proxy'
    }
  };
}

app.get('/happ-routing/:slug', async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE sub_slug = ? AND enabled = 1').get(req.params.slug);

  if (!client) {
    return res.status(404).send('Subscription not found');
  }

  const subscriptionName = getSetting('subscription_name', DEFAULT_SUBSCRIPTION_NAME);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(buildHappRoutingLink(subscriptionName));
});

app.get('/happ-routing-json/:slug', async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE sub_slug = ? AND enabled = 1').get(req.params.slug);

  if (!client) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const subscriptionName = getSetting('subscription_name', DEFAULT_SUBSCRIPTION_NAME);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(buildHappRoutingProfile(subscriptionName));
});

app.get('/json/:slug', async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE sub_slug = ? AND enabled = 1').get(req.params.slug);

  if (!client) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const lines = await buildSubscriptionLines(client, true);
  const subscriptionName = getSetting('subscription_name', DEFAULT_SUBSCRIPTION_NAME);
  const base64Title = Buffer.from(subscriptionName).toString('base64');

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(subscriptionName + '.json')}`);
  res.setHeader('Profile-Title', `base64:${base64Title}`);
  res.setHeader('Subscription-Title', `base64:${base64Title}`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const vlessLines = lines.filter(line => String(line).startsWith('vless://'));

  if (vlessLines.length >= 1) {
    const requestedNodeRaw = String(req.query.node || '').trim();
    const singleMode = requestedNodeRaw || ['single', 'object'].includes(String(req.query.format || '').toLowerCase());

    // Default JSON subscription must be a JSON array: HAPP treats an array as
    // several configs/regions, while a single object is imported as only one
    // visible server. This was the reason only the last/random region appeared.
    if (!singleMode) {
      return res.json(vlessLines.map((line, index) => buildHappJsonConfigFromLine(client, line, subscriptionName, index)));
    }

    // Compatibility endpoint for clients that require a single Xray object:
    // /json/:slug?node=2 or /json/:slug?format=single
    const requestedNode = Number.parseInt(requestedNodeRaw || '1', 10);
    const selectedIndex = Number.isFinite(requestedNode)
      ? Math.min(Math.max(requestedNode - 1, 0), vlessLines.length - 1)
      : 0;
    return res.json(buildHappJsonConfigFromLine(client, vlessLines[selectedIndex], subscriptionName, selectedIndex));
  }

  return res.json({
    name: subscriptionName,
    remarks: subscriptionName,
    error: 'No active VLESS nodes in subscription',
    subscriptions: []
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
