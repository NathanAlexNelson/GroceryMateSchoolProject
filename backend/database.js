// database.js
const Database = require('better-sqlite3');

// Opens database.db file — creates it automatically if it doesn't exist
const db = new Database('database.db');

// Creates both tables if they don't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS lists (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id    INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    is_checked INTEGER DEFAULT 0,
    FOREIGN KEY (list_id) REFERENCES lists(id)
  );
`);

module.exports = db;
