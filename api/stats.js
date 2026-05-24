// api/stats.js — GET /api/stats

const { getAll } = require('../db-vercel');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const entries = await getAll();
    const now = new Date();

    const thisMonth = entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const freq = {};
    thisMonth.forEach(e => { freq[e.mood.emoji] = (freq[e.mood.emoji] || 0) + 1; });

    const dates  = new Set(entries.map(e => new Date(e.date).toDateString()));
    let streak   = 0, cursor = new Date();
    while (dates.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }

    res.json({
      success: true,
      stats: { totalThisMonth: thisMonth.length, totalAllTime: entries.length, moodFrequency: freq, streak }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
