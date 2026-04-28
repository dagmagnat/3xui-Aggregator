from pathlib import Path
p=Path('/mnt/data/v7/app.js')
s=p.read_text()
# add comment column
s=s.replace("""      enabled INTEGER NOT NULL DEFAULT 1,\n      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP""", """      enabled INTEGER NOT NULL DEFAULT 1,\n      comment TEXT NOT NULL DEFAULT '',\n      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP""")
s=s.replace("""  try { db.prepare(`ALTER TABLE clients ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`).run(); } catch (_) {}""", """  try { db.prepare(`ALTER TABLE clients ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`).run(); } catch (_) {}\n  try { db.prepare(`ALTER TABLE clients ADD COLUMN comment TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}""")
# importClientsFromNode add comment
s=s.replace("""      reset: c.reset || 0,\n      totalGB: Number(c.totalGB || 0),""", """      reset: c.reset || 0,\n      comment: String(c.comment || c.remark || c.description || '').trim(),\n      totalGB: Number(c.totalGB || 0),""")
# search include comment
s=s.replace("WHERE c.login LIKE ? OR c.display_name LIKE ? OR c.uuid LIKE ?", "WHERE c.login LIKE ? OR c.display_name LIKE ? OR c.uuid LIKE ? OR IFNULL(c.comment, '') LIKE ?")
s=s.replace("`).all(like, like, like)", "`).all(like, like, like, like)", 1)
# insert client includes comment
s=s.replace("""          enabled\n        )\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""", """          enabled,\n          comment\n        )\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""")
s=s.replace("""        rc.enable !== false ? 1 : 0\n      );""", """        rc.enable !== false ? 1 : 0,\n        rc.comment || ''\n      );""", 1)
# changed include comment
s=s.replace("""        Number(clientRow.enabled || 0) !== (rc.enable !== false ? 1 : 0);""", """        Number(clientRow.enabled || 0) !== (rc.enable !== false ? 1 : 0) ||\n        String(clientRow.comment || '') !== String(rc.comment || '');""")
# update comment in sync
s=s.replace("""            enabled = ?\n          WHERE id = ?""", """            enabled = ?,\n            comment = ?\n          WHERE id = ?""")
s=s.replace("""          rc.enable !== false ? 1 : 0,\n          clientRow.id""", """          rc.enable !== false ? 1 : 0,\n          rc.comment || '',\n          clientRow.id""", 1)
# clients post create comment field
s=s.replace("const { login, limit_ip, duration_days, traffic_gb } = req.body;", "const { login, limit_ip, duration_days, traffic_gb, comment } = req.body;")
s=s.replace("const cleanDisplayName = cleanLogin;", "const cleanDisplayName = cleanLogin;\n    const cleanComment = String(comment || '').trim();", 1)
s=s.replace("""      INSERT INTO clients (login, display_name, uuid, sub_slug, duration_days, traffic_gb, limit_ip, expiry_time)\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", """      INSERT INTO clients (login, display_name, uuid, sub_slug, duration_days, traffic_gb, limit_ip, expiry_time, comment)\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""")
s=s.replace("""`).run(cleanLogin, cleanDisplayName, uuid, subSlug, cleanDurationDays, cleanTrafficGb, cleanLimitIp, expiryTime);""", """`).run(cleanLogin, cleanDisplayName, uuid, subSlug, cleanDurationDays, cleanTrafficGb, cleanLimitIp, expiryTime, cleanComment);""")
# create payload include comment
s=s.replace("""            reset: cleanDurationDays > 0 && nodeTrafficGb > 0 ? cleanDurationDays : 0""", """            reset: cleanDurationDays > 0 && nodeTrafficGb > 0 ? cleanDurationDays : 0,\n            comment: cleanComment""", 1)
# updateClientOnNode preserves/updates comment
s=s.replace("""  const subId = opts.subId || current.subId || client.sub_slug || randomUUID().replace(/-/g, '').slice(0, 16);""", """  const subId = opts.subId || current.subId || client.sub_slug || randomUUID().replace(/-/g, '').slice(0, 16);\n  const comment = String(opts.comment ?? client.comment ?? current.comment ?? '').trim();""")
s=s.replace("""        reset: durationDays > 0 && trafficGb > 0 ? durationDays : 0""", """        reset: durationDays > 0 && trafficGb > 0 ? durationDays : 0,\n        comment""", 1)
# Find edit route around clients/:id/edit
p.write_text(s)
