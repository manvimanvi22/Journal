/**
 * db.js — Simple file-based database using lowdb
 *
 * Think of this as a "fake database" powered by a JSON file (db.json).
 * In Week 3+, you'd swap this out for a real database like PostgreSQL.
 *
 * The file looks like:
 * {
 *   "entries": [
 *     { "id": "...", "date": "...", "mood": {...}, "tags": [...], "note": "..." },
 *     ...
 *   ]
 * }
 */

const low    = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { v4: uuidv4 } = require('./utils/uuid');

// Set up the database file
const adapter = new FileSync('db.json');
const db      = low(adapter);

// Set default structure if db.json doesn't exist yet
db.defaults({ entries: [] }).write();

// ── CRUD operations ─────────────────────────────────────

/**
 * Get all entries, sorted newest first
 */
function getAll() {
  return db.get('entries')
    .orderBy('date', 'desc')
    .value();
}

/**
 * Get a single entry by ID
 */
function getById(id) {
  return db.get('entries').find({ id }).value();
}

/**
 * Create a new entry
 * @param {object} data - { mood, tags, note }
 * @returns the created entry
 */
function create({ mood, tags, note }) {
  const entry = {
    id:   uuidv4(),          // unique ID
    date: new Date().toISOString(),
    mood,                    // { emoji, label, score, color }
    tags,                    // array of strings
    note,                    // string
  };

  db.get('entries').push(entry).write();  // .write() saves to db.json
  return entry;
}

/**
 * Delete an entry by ID
 * @returns true if deleted, false if not found
 */
function remove(id) {
  const existing = db.get('entries').find({ id }).value();
  if (!existing) return false;

  db.get('entries').remove({ id }).write();
  return true;
}

module.exports = { getAll, getById, create, remove };
