const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../storage/tokens.sqlite');

// No confusable chars (no 0/O, 1/I/L) so printed QR labels stay readable
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let db = null;

function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    label TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    used_at INTEGER
  )`);
  return db;
}

function randomToken() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return 'DSN11-' + s;
}

function normalize(input) {
  return String(input || '').trim().toUpperCase();
}

/**
 * Generate N fresh tokens (1 token = 1 photo session)
 */
function generateTokens(count = 5, label = '') {
  const d = getDb();
  const now = Date.now();
  const rows = [];
  const insert = d.prepare('INSERT INTO tokens (token, label, created_at, used_at) VALUES (?, ?, ?, NULL)');
  for (let i = 0; i < count; i++) {
    let token = randomToken();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        insert.run(token, label, now);
        break;
      } catch (e) {
        token = randomToken(); // collision, retry with a new one
        if (attempt === 4) throw e;
      }
    }
    rows.push({ token, label, created_at: now, used_at: null });
  }
  return rows;
}

/**
 * Check a token without consuming it (scan gate). Returns the same shape
 * as redeem but never writes.
 */
function validate(rawToken) {
  const token = normalize(rawToken);
  if (!token) return { ok: false, reason: 'unknown' };
  const d = getDb();
  const row = d.prepare('SELECT token, used_at FROM tokens WHERE token = ?').get(token);
  if (!row) return { ok: false, reason: 'unknown' };
  if (row.used_at) return { ok: false, reason: 'used' };
  return { ok: true, token };
}

/**
 * Redeem one token: valid + unused -> marked used atomically.
 * Returns { ok:true, token } or { ok:false, reason:'unknown'|'used' }
 */
function redeem(rawToken) {
  const token = normalize(rawToken);
  if (!token) return { ok: false, reason: 'unknown' };
  const d = getDb();
  const row = d.prepare('SELECT token, used_at FROM tokens WHERE token = ?').get(token);
  if (!row) return { ok: false, reason: 'unknown' };
  if (row.used_at) return { ok: false, reason: 'used' };
  const result = d.prepare('UPDATE tokens SET used_at = ? WHERE token = ? AND used_at IS NULL')
    .run(Date.now(), token);
  if (result.changes === 1) return { ok: true, token };
  return { ok: false, reason: 'used' };
}

function listTokens() {
  return getDb()
    .prepare('SELECT token, label, created_at, used_at FROM tokens ORDER BY created_at ASC')
    .all();
}

function deleteByLabel(label) {
  return getDb().prepare('DELETE FROM tokens WHERE label = ?').run(label);
}

module.exports = { generateTokens, validate, redeem, listTokens, deleteByLabel, normalize };
