// ============================================================
//  NECROSIS AI — DATABASE (db.js)
//  SQLite user storage via better-sqlite3
// ============================================================

'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'necrosis.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,           -- UUID
    provider      TEXT NOT NULL,              -- 'google' | 'facebook' | 'twitter'
    provider_id   TEXT NOT NULL,              -- OAuth provider's user ID
    display_name  TEXT NOT NULL,
    email         TEXT,
    avatar_url    TEXT,
    access_token  TEXT,
    refresh_token TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_login    TEXT NOT NULL DEFAULT (datetime('now')),
    is_banned     INTEGER NOT NULL DEFAULT 0,
    meta          TEXT DEFAULT '{}'           -- JSON blob for extra data
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider
    ON users(provider, provider_id);

  CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

  CREATE TABLE IF NOT EXISTS sessions_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL REFERENCES users(id),
    ip         TEXT,
    user_agent TEXT,
    logged_in_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL REFERENCES users(id),
    session_id TEXT NOT NULL,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    model      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chat_user_session
    ON chat_history(user_id, session_id);
`);

// ── USER QUERIES ──────────────────────────────────────────────

const stmts = {
  findByProvider: db.prepare(`
    SELECT * FROM users WHERE provider = ? AND provider_id = ? LIMIT 1
  `),
  findById: db.prepare(`
    SELECT * FROM users WHERE id = ? LIMIT 1
  `),
  findByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ? LIMIT 1
  `),
  insert: db.prepare(`
    INSERT INTO users (id, provider, provider_id, display_name, email, avatar_url, access_token, refresh_token, meta)
    VALUES (@id, @provider, @provider_id, @display_name, @email, @avatar_url, @access_token, @refresh_token, @meta)
  `),
  updateLogin: db.prepare(`
    UPDATE users SET last_login = datetime('now'), access_token = @access_token, refresh_token = @refresh_token
    WHERE id = @id
  `),
  logSession: db.prepare(`
    INSERT INTO sessions_log (user_id, ip, user_agent) VALUES (?, ?, ?)
  `),
  saveChatMessage: db.prepare(`
    INSERT INTO chat_history (user_id, session_id, role, content, model)
    VALUES (@user_id, @session_id, @role, @content, @model)
  `),
  getChatHistory: db.prepare(`
    SELECT * FROM chat_history WHERE user_id = ? AND session_id = ?
    ORDER BY created_at ASC
  `),
  getUserSessions: db.prepare(`
    SELECT DISTINCT session_id, MIN(created_at) as started_at, MAX(created_at) as last_at, COUNT(*) as msg_count
    FROM chat_history WHERE user_id = ?
    GROUP BY session_id
    ORDER BY last_at DESC
    LIMIT 50
  `),
  totalUsers: db.prepare(`SELECT COUNT(*) as count FROM users`),
};

// ── EXPORTS ───────────────────────────────────────────────────

module.exports = {
  /**
   * Upsert user from OAuth profile.
   * Returns the user row.
   */
  upsertOAuthUser({ provider, provider_id, display_name, email, avatar_url, access_token, refresh_token }) {
    const { v4: uuidv4 } = require('uuid');
    let user = stmts.findByProvider.get(provider, provider_id);

    if (user) {
      stmts.updateLogin.run({ id: user.id, access_token: access_token || null, refresh_token: refresh_token || null });
      user = stmts.findById.get(user.id);
    } else {
      const id = uuidv4();
      stmts.insert.run({
        id,
        provider,
        provider_id,
        display_name,
        email:         email || null,
        avatar_url:    avatar_url || null,
        access_token:  access_token || null,
        refresh_token: refresh_token || null,
        meta:          '{}',
      });
      user = stmts.findById.get(id);
    }

    return user;
  },

  findById(id)                      { return stmts.findById.get(id); },
  findByProvider(provider, pid)     { return stmts.findByProvider.get(provider, pid); },
  logSession(userId, ip, ua)        { stmts.logSession.run(userId, ip, ua); },

  saveChatMessage(opts)             { stmts.saveChatMessage.run(opts); },
  getChatHistory(userId, sessionId) { return stmts.getChatHistory.all(userId, sessionId); },
  getUserSessions(userId)           { return stmts.getUserSessions.all(userId); },

  totalUsers()                      { return stmts.totalUsers.get().count; },
  raw: db,
};
