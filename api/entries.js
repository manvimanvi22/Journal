// api/entries.js — Vercel Serverless Function
// Handles: GET /api/entries and POST /api/entries

const { getAll, create } = require('../db-vercel');

module.exports = async (req, res) => {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const entries = await getAll();
      return res.json({ success: true, entries });
    }

    if (req.method === 'POST') {
      const { mood, tags, note } = req.body;
      if (!mood?.emoji || !mood?.label) {
        return res.status(400).json({ success: false, error: 'mood.emoji and mood.label required' });
      }
      const entry = await create({ mood, tags: tags || [], note: note || '' });
      return res.status(201).json({ success: true, entry });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
