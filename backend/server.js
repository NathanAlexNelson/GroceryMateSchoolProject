// server.js
const express = require('express');
const cors    = require('cors');
const db      = require('./database');

const app  = express();
const PORT = 5000;

// Middleware — runs on every request before it hits a route
app.use(cors());            // Allow requests from the React frontend
app.use(express.json());    // Automatically parse JSON request bodies

// ─────────────────────────────────────────────
// GET /api/lists — return all lists (for History view)
// ─────────────────────────────────────────────
app.get('/api/lists', (req, res) => {
  const lists = db.prepare('SELECT * FROM lists ORDER BY created_at DESC').all();
  res.json(lists);
});

// ─────────────────────────────────────────────
// GET /api/lists/:id — return one list + its items
// ─────────────────────────────────────────────
app.get('/api/lists/:id', (req, res) => {
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'List not found' });

  const items = db.prepare('SELECT * FROM items WHERE list_id = ?').all(req.params.id);
  res.json({ ...list, items });
});

// ─────────────────────────────────────────────
// POST /api/lists — create a new list + its items
// Used by: App.jsx manual input AND Calendar.jsx Save List
// ─────────────────────────────────────────────
app.post('/api/lists', (req, res) => {
  const { title, items } = req.body;

  // Insert the list, get back its auto-assigned id
  const listResult = db.prepare(
    'INSERT INTO lists (title) VALUES (?)'
  ).run(title);

  const listId = listResult.lastInsertRowid;

  // Insert each item, linking it to the new list via list_id
  const insertItem = db.prepare(
    'INSERT INTO items (list_id, name) VALUES (?, ?)'
  );

  for (const item of items) {
    insertItem.run(listId, item.name);
  }

  res.status(201).json({ id: listId });
});

// ─────────────────────────────────────────────
// PATCH /api/items/:id — toggle is_checked on one item
// ─────────────────────────────────────────────
app.patch('/api/items/:id', (req, res) => {
  const { is_checked } = req.body;
  db.prepare(
    'UPDATE items SET is_checked = ? WHERE id = ?'
  ).run(is_checked ? 1 : 0, req.params.id);

  res.json({ success: true });
});

// ─────────────────────────────────────────────
// DELETE /api/lists/:id — delete a list and all its items
// ─────────────────────────────────────────────
app.delete('/api/lists/:id', (req, res) => {
  const id = req.params.id;

  // Delete the items first — they depend on the list existing
  db.prepare('DELETE FROM items WHERE list_id = ?').run(id);

  // Then delete the list itself
  db.prepare('DELETE FROM lists WHERE id = ?').run(id);

  res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
