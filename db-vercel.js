function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function kvGet() {
  const res  = await fetch(`${process.env.KV_REST_API_URL}/get/moodly_entries`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  });
  const data = await res.json();
  if (!data.result) return [];
  try { return JSON.parse(data.result); } catch { return []; }
}

async function kvSet(entries) {
  await fetch(`${process.env.KV_REST_API_URL}/set/moodly_entries`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(entries)),
  });
}

async function getAll() {
  const e = await kvGet();
  return e.sort((a,b) => new Date(b.date) - new Date(a.date));
}
async function getById(id) { return (await kvGet()).find(e=>e.id===id)||null; }
async function create({ mood, tags, note }) {
  const entry = { id:uuid(), date:new Date().toISOString(), mood, tags, note };
  await kvSet([entry, ...(await kvGet())]);
  return entry;
}
async function remove(id) {
  const all = await kvGet();
  const filtered = all.filter(e=>e.id!==id);
  if (filtered.length===all.length) return false;
  await kvSet(filtered); return true;
}
module.exports = { getAll, getById, create, remove };
