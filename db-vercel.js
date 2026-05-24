/**
 * db-vercel.js — Upstash Redis database for Vercel
 * Uses KV_REST_API_URL + KV_REST_API_TOKEN (auto-added by Upstash integration)
 */

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const BASE_URL = process.env.KV_REST_API_URL;
const TOKEN    = process.env.KV_REST_API_TOKEN;
const KEY      = 'moodly_entries';

async function kvGet() {
  const res  = await fetch(`${BASE_URL}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await res.json();
  if (!data.result) return [];
  try { return JSON.parse(data.result); } catch { return []; }
}

async function kvSet(entries) {
  const encoded = encodeURIComponent(JSON.stringify(entries));
  await fetch(`${BASE_URL}/set/${KEY}?EX=31536000`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(JSON.stringify(entries)),
  });
}

async function getAll() {
  const entries = await kvGet();
  return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function getById(id) {
  const all = await kvGet();
  return all.find(e => e.id === id) || null;
}

async function create({ mood, tags, note }) {
  const entry    = { id: uuid(), date: new Date().toISOString(), mood, tags, note };
  const existing = await kvGet();
  await kvSet([entry, ...existing]);
  return entry;
}

async function remove(id) {
  const existing = await kvGet();
  const filtered = existing.filter(e => e.id !== id);
  if (filtered.length === existing.length) return false;
  await kvSet(filtered);
  return true;
}

module.exports = { getAll, getById, create, remove };
