function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const BASE = () => process.env.KV_REST_API_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN;
const KEY = 'moodly_entries';

async function kvGet() {
  try {
    const res  = await fetch(`${BASE()}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${TOKEN()}` },
    });
    const data = await res.json();
    if (!data.result) return [];
    // Handle both single and double stringified data
    let parsed = data.result;
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) {
    console.error('kvGet error:', e.message);
    return [];
  }
}

async function kvSet(entries) {
  // Use Upstash REST API SET command with proper encoding
  const res = await fetch(`${BASE()}/set/${KEY}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${TOKEN()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(entries)),
  });
  const data = await res.json();
  console.log('kvSet result:', data);
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