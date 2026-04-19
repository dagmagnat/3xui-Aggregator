require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const fetch = require('node-fetch');
const { encrypt, decrypt } = require('./lib_crypto');

const COUNTRIES = [
  { code: 'NL', name_ru: 'Нидерланды', flag: '🇳🇱' },
  { code: 'DE', name_ru: 'Германия', flag: '🇩🇪' },
  { code: 'FI', name_ru: 'Финляндия', flag: '🇫🇮' },
  { code: 'AM', name_ru: 'Армения', flag: '🇦🇲' },
  { code: 'RU', name_ru: 'Россия', flag: '🇷🇺' },
  { code: 'US', name_ru: 'США', flag: '🇺🇸' },
  { code: 'FR', name_ru: 'Франция', flag: '🇫🇷' },
  { code: 'GB', name_ru: 'Великобритания', flag: '🇬🇧' },
  { code: 'PL', name_ru: 'Польша', flag: '🇵🇱' },
  { code: 'SE', name_ru: 'Швеция', flag: '🇸🇪' },
  { code: 'NO', name_ru: 'Норвегия', flag: '🇳🇴' },
  { code: 'CH', name_ru: 'Швейцария', flag: '🇨🇭' },
  { code: 'AT', name_ru: 'Австрия', flag: '🇦🇹' },
  { code: 'CZ', name_ru: 'Чехия', flag: '🇨🇿' },
  { code: 'ES', name_ru: 'Испания', flag: '🇪🇸' },
  { code: 'IT', name_ru: 'Италия', flag: '🇮🇹' },
  { code: 'TR', name_ru: 'Турция', flag: '🇹🇷' },
  { code: 'CA', name_ru: 'Канада', flag: '🇨🇦' },
  { code: 'JP', name_ru: 'Япония', flag: '🇯🇵' },
  { code: 'SG', name_ru: 'Сингапур', flag: '🇸🇬' }
];

function getCountryFlag(countryName) {
  const found = COUNTRIES.find(c => c.name_ru === countryName);
  return found?.flag || '🌐';
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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      uuid TEXT NOT NULL,
      sub_slug TEXT UNIQUE NOT NULL,
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
  let url = String(panelUrl || '').trim().replace(/\/$/, '');
  let path = String(panelPath || '').trim();
  if (path && !path.startsWith('/')) path = `/${path}`;
  return `${url}${path}`.replace(/\/$/, '');
}

function normalizeSubscriptionBaseUrl(node) {
  const explicit = String(node?.sub_base_url || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return normalizeRootUrl(node?.panel_url || '', node?.panel_path || '');
}

async function safeJson(response) {
  const text = await response.text();
  try {