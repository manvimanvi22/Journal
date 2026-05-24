function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function kvGet() {
  try {
    const res  = await fetch(`${process.env.KV_REST_API_URL}/get/moodly_entries`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    const data = await res.json();
    if (!data.result) return [];
    const parsed = JSON.parse(data.result);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function kvSet(entries) {
  await fetch(`${process.env.KV_REST_API_URL}/set/moodly_entries`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(entries)),
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