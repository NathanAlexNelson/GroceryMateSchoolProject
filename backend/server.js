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
  try {
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

  } catch (err) {
    console.error('POST /api/lists error:', err.message); // displays error in backend terminal
    res.status(500).json({ error: err.message }); // displays error in frontend
  }
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

// ─────────────────────────────────────────────
// GET /api/custom-recipes - return all custom recipes
// ─────────────────────────────────────────────
app.get('/api/custom-recipes', (req, res) => {
  try {
    const recipes = db.prepare('SELECT * FROM custom_recipes ORDER BY created_at DESC').all();

    // Parse ingredientLines from JSON string back to array for each recipe
    const parsed = recipes.map(r => ({
      ...r,
      ingredientLines: JSON.parse(r.ingredientLines),
      tags: JSON.parse(r.tags)
    }));

    res.json(parsed)
  } catch (err) {
    console.error('GET /api/custom-recipes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/custom-recipes - save a new custom recipe
// ─────────────────────────────────────────────
app.post('/api/custom-recipes', (req, res) => {
  try {
    const { label, ingredientLines, tags } = req.body;

    const result = db.prepare(
      'INSERT INTO custom_recipes (label, ingredientLines, tags) VALUES (?, ?, ?)'
    ).run(label, JSON.stringify(ingredientLines), JSON.stringify(tags || []));

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('POST /api/custom-recipes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/custom-recipes/:id
// ─────────────────────────────────────────────
app.delete('/api/custom-recipes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM custom_recipes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/custom-recipes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
