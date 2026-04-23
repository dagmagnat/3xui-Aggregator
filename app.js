const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const axios = require('axios');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

let db;

(async () => {
  db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT,
      uuid TEXT,
      sub_slug TEXT,
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

})();

async function fetchClientsFromNode(node) {
  const url = `${node.panel_url}${node.panel_path}/panel/api/inbounds/list`;
  const res = await axios.get(url, {
    auth: {
      username: node.username,
      password: node.password
    }
  });

  return res.data.obj || [];
}

async function importClientsFromNode(node) {
  const inbounds = await fetchClientsFromNode(node);

  let imported = 0;

  for (const inbound of inbounds) {
    if (!inbound.settings) continue;

    const settings = JSON.parse(inbound.settings);
    const clients = settings.clients || [];

    for (const rc of clients) {
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
  const clients = await db.all(`SELECT * FROM clients ORDER BY id DESC`);
  res.render('clients', { clients, baseUrl: BASE_URL });
});

app.post('/clients/import', async (req, res) => {
  const node = await db.get(`SELECT * FROM nodes WHERE id = ?`, req.body.node_id);
  if (!node) return res.redirect('/');

  await importClientsFromNode(node);

  res.redirect('/');
});

app.get('/sub/:slug', async (req, res) => {
  const client = await db.get(
    `SELECT * FROM clients WHERE sub_slug = ?`,
    req.params.slug
  );

  if (!client) return res.send('Not found');

  res.setHeader('Content-Type', 'text/plain');
  res.send(`# subscription for ${client.login}`);
});

app.listen(PORT, () => {
  console.log(`Server running on ${BASE_URL}`);
});
