// api/entries/[id].js — handles DELETE /api/entries/:id

const { remove } = require('../../db-vercel');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const deleted = await remove(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
