const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fetch   = require('node-fetch');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/entries
app.get('/api/entries', (req, res) => {
  try {
    res.json({ success: true, entries: db.getAll() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/entries/:id
app.get('/api/entries/:id', (req, res) => {
  try {
    const entry = db.getById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/entries
app.post('/api/entries', (req, res) => {
  try {
    const { mood, tags, note } = req.body;
    if (!mood || !mood.emoji || !mood.label) {
      return res.status(400).json({ success: false, error: 'mood.emoji and mood.label are required' });
    }
    const entry = db.create({ mood, tags: tags || [], note: note || '' });
    res.status(201).json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/entries/:id
app.delete('/api/entries/:id', (req, res) => {
  try {
    const deleted = db.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  try {
    const entries = db.getAll();
    const now     = new Date();
    const thisMonth = entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const freq = {};
    thisMonth.forEach(e => { freq[e.mood.emoji] = (freq[e.mood.emoji] || 0) + 1; });
    const dates  = new Set(entries.map(e => new Date(e.date).toDateString()));
    let streak   = 0;
    const cursor = new Date();
    while (dates.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }
    res.json({ success: true, stats: { totalThisMonth: thisMonth.length, totalAllTime: entries.length, moodFrequency: freq, streak: streak || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/reflection — Ollama locally, Gemini on Vercel (auto-switches)
app.post('/api/ai/reflection', async (req, res) => {
  try {
    const all    = db.getAll();
    const week   = new Date(); week.setDate(week.getDate() - 7);
    const recent = all.filter(e => new Date(e.date) >= week);

    if (!recent.length) {
      return res.json({ success: true, reflection: "No entries this week yet — start logging! 🌱", entryCount: 0 });
    }

    const summary = recent.map(e => {
      const d    = new Date(e.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      const tags = e.tags.length ? ` [${e.tags.join(', ')}]` : '';
      const note = e.note ? ` — "${e.note}"` : '';
      return `${d}: ${e.mood.emoji} ${e.mood.label}${tags}${note}`;
    }).join('\n');

    const prompt = `You are a warm journaling companion. Based on these entries, write a 3-4 sentence personal reflection. Be empathetic and specific. End with encouragement.\n\nEntries:\n${summary}\n\nReflection:`;

    const model = req.body.model || 'llama3.2';

    // Always use Ollama locally
    const response = await fetch('http://localhost:11434/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, prompt, stream: false }),
      signal:  AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 404 || errText.includes('model')) {
        return res.status(400).json({ success: false, error: `Model "${model}" not found — run: ollama pull ${model}` });
      }
      throw new Error('Ollama error: ' + errText);
    }

    const data       = await response.json();
    const reflection = data.response?.trim();
    if (!reflection) throw new Error('Empty response from Ollama');

    res.json({ success: true, reflection, entryCount: recent.length, source: 'ollama', model });

  } catch (err) {
    if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch')) {
      return res.status(503).json({ success: false, error: 'Ollama not running — start it with: ollama serve' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all — Express 5 syntax
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🌙 Moodly server running at http://localhost:${PORT}`);
  console.log(`   API ready at http://localhost:${PORT}/api/entries\n`);
});
