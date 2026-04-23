const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const axios = require('axios');
const { randomUUID } = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let db;

function normalizeUrlParts(panelUrl, panelPath) {
  const base = String(panelUrl || '').replace(/\/+$/, '');
  const p = String(panelPath || '').trim();

  if (!p) return `${base}/panel/api/inbounds/list`;

  const cleanPath = p.startsWith('/') ? p : `/${p}`;
  return `${base}${cleanPath}/panel/api/inbounds/list`;
}

async function initDb() {
  db = await open({
    filename: path.join(__dirname, 'database.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT,
      uuid TEXT UNIQUE,
      sub_slug TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      panel_url TEXT,
      panel_path TEXT,
      sub_base_url TEXT,
      username TEXT,
      password TEXT,
      inbound_id INTEGER
    );
  `);
}

async function fetchClientsFromNode(node) {
  const url = normalizeUrlParts(node.panel_url, node.panel_path);

  const res = await axios.get(url, {
    auth: {
      username: node.username,
      password: node.password
    },
    timeout: 15000
  });

  if (!res.data || !Array.isArray(res.data.obj)) {
    return [];
  }

  return res.data.obj;
}

async function importClientsFromNode(node) {
  const inbounds = await fetchClientsFromNode(node);
  let imported = 0;

  for (const inbound of inbounds) {
    if (!inbound.settings) continue;

    let settings;
    try {
      settings = JSON.parse(inbound.settings);
    } catch (err) {
      console.error('Ошибка парсинга inbound.settings:', err.message);
      continue;
    }

    const clients = Array.isArray(settings.clients) ? settings.clients : [];

    for (const rc of clients) {
      if (!rc || !rc.id) continue;

      const existing = await db.get(
        `SELECT * FROM clients WHERE uuid = ?`,
        rc.id
      );

      if (existing) continue;

      const subSlug = rc.subId || randomUUID().replace(/-/g, '');

      await db.run(
        `INSERT INTO clients (login, uuid, sub_slug)
         VALUES (?, ?, ?)`,
        rc.email || 'imported',
        rc.id,
        subSlug
      );

      imported++;
    }
  }

  return imported;
}

app.get('/', async (req, res) => {
  try {
    const clients = await db.all(`SELECT * FROM clients ORDER BY id DESC`);
    res.render('clients', {
      clients,
      baseUrl: BASE_URL
    });
  } catch (err) {
    console.error('Ошибка на главной странице:', err);
    res.status(500).send(`Ошибка загрузки клиентов: ${err.message}`);
  }
});

app.post('/clients/import', async (req, res) => {
  try {
    const nodeId = Number(req.body.node_id);
    if (!nodeId) {
      return res.status(400).send('Не указан node_id');
    }

    const node = await db.get(`SELECT * FROM nodes WHERE id = ?`, nodeId);
    if (!node) {
      return res.status(404).send('Узел не найден');
    }

    const imported = await importClientsFromNode(node);
    console.log(`Импорт завершён, добавлено клиентов: ${imported}`);

    res.redirect('/');
  } catch (err) {
    console.error('Ошибка импорта клиентов:', err);
    res.status(500).send(`Ошибка импорта: ${err.message}`);
  }
});

app.get('/sub/:slug', async (req, res) => {
  try {
    const client = await db.get(
      `SELECT * FROM clients WHERE sub_slug = ?`,
      req.params.slug
    );

    if (!client) {
      return res.status(404).send('Not found');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`# subscription for ${client.login}`);
  } catch (err) {
    console.error('Ошибка выдачи подписки:', err);
    res.status(500).send(`Ошибка подписки: ${err.message}`);
  }
});

app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).send('Internal Server Error');
});

(async () => {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`Server running on ${BASE_URL}`);
    });
  } catch (err) {
    console.error('Ошибка запуска приложения:', err);
    process.exit(1);
  }
})();
