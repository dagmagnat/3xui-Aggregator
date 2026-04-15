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

const app = express();
const db = new Database('./data/app.db');

const PORT = Number(process.env.PORT || 3000);
const APP_SECRET = process.env.APP_SECRET || 'change-me';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-session-secret';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
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

    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      panel_url TEXT NOT NULL,
      panel_path TEXT DEFAULT '',
      username TEXT NOT NULL,
      password_enc TEXT NOT NULL,
      inbound_id INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_status TEXT DEFAULT 'unknown',
      last_error TEXT DEFAULT '',
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

  const existingAdmin = db.prepare('SELECT id FROM app_users WHERE username = ?').get(ADMIN_USERNAME);
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO app_users (username, password_hash) VALUES (?, ?)').run(ADMIN_USERNAME, passwordHash);
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

function normalizeRootUrl(panelUrl, panelPath) {
  let url = (panelUrl || '').trim().replace(/\/$/, '');
  let path = (panelPath || '').trim();
  if (path && !path.startsWith('/')) path = `/${path}`;
  return `${url}${path}`.replace(/\/$/, '');
}

async function loginNode(node) {
  const rootUrl = normalizeRootUrl(node.panel_url, node.panel_path);
  const password = decrypt(node.password_enc, APP_SECRET);
  const response = await fetch(`${rootUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ username: node.username, password })
  });
  const setCookie = response.headers.raw()['set-cookie'] || [];
  const cookie = setCookie.map(c => c.split(';')[0]).join('; ');
  const data = await safeJson(response);
  if (!response.ok && !cookie) throw new Error(data?.msg || `Login failed (${response.status})`);
  return { rootUrl, cookie };
}

async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function apiGet(node, path) {
  const { rootUrl, cookie } = await loginNode(node);
  const response = await fetch(`${rootUrl}${path}`, {
    headers: { 'Accept': 'application/json', 'Cookie': cookie }
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.msg || `GET ${path} failed (${response.status})`);
  return data;
}

async function apiPost(node, path, body, asForm = false) {
  const { rootUrl, cookie } = await loginNode(node);
  let headers = { 'Accept': 'application/json', 'Cookie': cookie };
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
  if (!response.ok || data?.success === false) throw new Error(data?.msg || `POST ${path} failed (${response.status})`);
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
    return await apiPost(node, `/panel/api/inbounds/${node.inbound_id}/delClient/${encodeURIComponent(clientUuid)}`, {}, true);
  } catch {
    return apiPost(node, `/panel/api/inbounds/${node.inbound_id}/delClientByEmail/${encodeURIComponent(email)}`, {}, true);
  }
}

async function checkNode(node) {
  try {
    await apiGet(node, '/panel/api/server/status');
    await getInbounds(node);
    db.prepare('UPDATE nodes SET last_status = ?, last_error = ? WHERE id = ?').run('online', '', node.id);
    return { ok: true, status: 'online' };
  } catch (err) {
    db.prepare('UPDATE nodes SET last_status = ?, last_error = ? WHERE id = ?').run('offline', String(err.message || err), node.id);
    return { ok: false, status: 'offline', error: String(err.message || err) };
  }
}

async function buildSubscriptionLines(clientRow, includeOffline = true) {
  const rows = db.prepare(`
    SELECT cn.remote_sub_url, n.name, n.enabled, n.last_status
    FROM client_nodes cn
    JOIN nodes n ON n.id = cn.node_id
    WHERE cn.client_id = ?
    ORDER BY n.id ASC
  `).all(clientRow.id);

  const lines = [];
  for (const row of rows) {
    if (!row.remote_sub_url) continue;
    if (!includeOffline && row.last_status === 'offline') continue;
    lines.push(row.remote_sub_url);
  }
  return lines;
}

function buildVlessRealityLink(inbound, uuid, displayName, nodeName) {
  const streamSettings = typeof inbound.streamSettings === 'string' ? JSON.parse(inbound.streamSettings || '{}') : (inbound.streamSettings || {});
  const settings = typeof inbound.settings === 'string' ? JSON.parse(inbound.settings || '{}') : (inbound.settings || {});
  const realitySettings = streamSettings?.realitySettings || {};
  const host = realitySettings.dest ? String(realitySettings.dest).split(':')[0] : '';
  const port = realitySettings.dest ? Number(String(realitySettings.dest).split(':')[1] || 443) : (inbound.port || 443);
  const pbk = realitySettings.settings?.publicKey || '';
  const sni = realitySettings.serverNames?.[0] || '';
  const sid = realitySettings.shortIds?.[0] || '';
  const fp = 'chrome';
  const flow = settings.clients?.[0]?.flow || '';
  const query = new URLSearchParams({ type: streamSettings.network || 'tcp', security: 'reality', pbk, fp, sni, sid, spx: '/' });
  if (flow) query.set('flow', flow);
  const remark = encodeURIComponent(`${displayName} | ${nodeName}`);
  return `vless://${uuid}@${host}:${port}?${query.toString()}#${remark}`;
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
app.post('/logout', requireAuth, (req, res) => req.session.destroy(() => res.redirect('/login')));

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

app.get('/nodes', requireAuth, (req, res) => {
  const nodes = db.prepare('SELECT * FROM nodes ORDER BY id DESC').all();
  render(res, 'nodes', { nodes, message: req.query.message || '', error: req.query.error || '' });
});

app.post('/nodes', requireAuth, async (req, res) => {
  try {
    const { name, panel_url, panel_path, username, password, inbound_id } = req.body;
    const info = db.prepare(`INSERT INTO nodes (name, panel_url, panel_path, username, password_enc, inbound_id)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(name, panel_url, panel_path || '', username, encrypt(password, APP_SECRET), Number(inbound_id));
    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(info.lastInsertRowid);
    await checkNode(node);
    res.redirect('/nodes?message=' + encodeURIComponent('Узел добавлен и проверен'));
  } catch (err) {
    res.redirect('/nodes?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.post('/nodes/:id/check', requireAuth, async (req, res) => {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(req.params.id));
  if (!node) return res.redirect('/nodes?error=' + encodeURIComponent('Узел не найден'));
  const result = await checkNode(node);
  const msg = result.ok ? 'Узел онлайн' : `Узел офлайн: ${result.error}`;
  res.redirect('/nodes?message=' + encodeURIComponent(msg));
});

app.post('/nodes/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM nodes WHERE id = ?').run(Number(req.params.id));
  res.redirect('/nodes?message=' + encodeURIComponent('Узел удалён'));
});

app.get('/clients', requireAuth, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY id DESC').all();
  const nodes = db.prepare('SELECT * FROM nodes WHERE enabled = 1 ORDER BY id ASC').all();
  render(res, 'clients', { clients, nodes, message: req.query.message || '', error: req.query.error || '', baseUrl: BASE_URL });
});

app.post('/clients', requireAuth, async (req, res) => {
  try {
    const { login, display_name } = req.body;
    let nodeIds = req.body.node_ids || [];
    if (!Array.isArray(nodeIds)) nodeIds = [nodeIds];
    if (!nodeIds.length) throw new Error('Нужно выбрать хотя бы один узел');

    const uuid = randomUUID();
    const subSlug = randomUUID().replace(/-/g, '');
    const clientInfo = db.prepare('INSERT INTO clients (login, display_name, uuid, sub_slug) VALUES (?, ?, ?, ?)')
      .run(login, display_name || login, uuid, subSlug);
    const clientId = clientInfo.lastInsertRowid;

    for (const nodeIdRaw of nodeIds) {
      const nodeId = Number(nodeIdRaw);
      const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
      if (!node) throw new Error(`Узел ${nodeId} не найден`);
      const inbound = await getInbound(node);
      const settings = typeof inbound.settings === 'string' ? JSON.parse(inbound.settings || '{}') : (inbound.settings || {});
      const clientEmail = `${login}@${node.name}`.replace(/\s+/g, '_');
      const subId = randomUUID().replace(/-/g, '').slice(0, 16);

      const clientPayload = {
        id: Number(node.inbound_id),
        settings: {
          clients: [{
            id: uuid,
            email: clientEmail,
            flow: settings.clients?.[0]?.flow || '',
            limitIp: 0,
            totalGB: 0,
            expiryTime: 0,
            enable: true,
            tgId: '',
            subId,
            reset: 0
          }]
        }
      };

      await addClient(node, clientPayload);

      let subUrl = '';
      const stream = typeof inbound.streamSettings === 'string' ? JSON.parse(inbound.streamSettings || '{}') : (inbound.streamSettings || {});
      if (inbound.protocol === 'vless' && stream.security === 'reality') {
        subUrl = buildVlessRealityLink(inbound, uuid, display_name || login, node.name);
      }

      db.prepare(`INSERT INTO client_nodes (client_id, node_id, remote_email, remote_uuid, remote_sub_url)
        VALUES (?, ?, ?, ?, ?)`)
        .run(clientId, node.id, clientEmail, uuid, subUrl);
    }

    res.redirect('/clients?message=' + encodeURIComponent('Клиент создан на выбранных узлах'));
  } catch (err) {
    res.redirect('/clients?error=' + encodeURIComponent(String(err.message || err)));
  }
});

app.get('/clients/:id', requireAuth, async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(req.params.id));
  if (!client) return res.status(404).send('Client not found');
  const mappings = db.prepare(`
    SELECT cn.*, n.name AS node_name, n.last_status, n.inbound_id
    FROM client_nodes cn
    JOIN nodes n ON n.id = cn.node_id
    WHERE cn.client_id = ?
    ORDER BY cn.id ASC
  `).all(client.id);
  const lines = await buildSubscriptionLines(client, true);
  render(res, 'client_detail', { client, mappings, subscription: lines.join('\n'), baseUrl: BASE_URL });
});

app.post('/clients/:id/delete', requireAuth, async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(req.params.id));
  if (!client) return res.redirect('/clients?error=' + encodeURIComponent('Клиент не найден'));
  const mappings = db.prepare('SELECT * FROM client_nodes WHERE client_id = ?').all(client.id);
  for (const map of mappings) {
    try {
      const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(map.node_id);
      await deleteClient(node, map.remote_uuid, map.remote_email);
    } catch (err) {
      console.error('Delete remote client failed:', err.message);
    }
  }
  db.prepare('DELETE FROM client_nodes WHERE client_id = ?').run(client.id);
  db.prepare('DELETE FROM clients WHERE id = ?').run(client.id);
  res.redirect('/clients?message=' + encodeURIComponent('Клиент удалён'));
});

app.get('/sub/:slug', async (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE sub_slug = ? AND enabled = 1').get(req.params.slug);
  if (!client) return res.status(404).send('Subscription not found');
  const lines = await buildSubscriptionLines(client, true);
  res.type('text/plain').send(lines.join('\n'));
});

app.get('/healthz', async (req, res) => res.json({ ok: true, service: '3xui-aggregator', now: new Date().toISOString() }));
app.listen(PORT, () => console.log(`3xui-aggregator started on :${PORT}`));
