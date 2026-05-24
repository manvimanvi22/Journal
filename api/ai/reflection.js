const { getAll } = require('../../db-vercel');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const all    = await getAll();
    const week   = new Date(); week.setDate(week.getDate() - 7);
    const recent = all.filter(e => new Date(e.date) >= week);

    if (!recent.length) {
      return res.json({ success: true, reflection: "No entries this week yet — start logging! 🌱", entryCount: 0 });
    }

    const summary = recent.map(e => {
      const d    = new Date(e.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      const tags = e.tags?.length ? ` [${e.tags.join(', ')}]` : '';
      const note = e.note ? ` — "${e.note}"` : '';
      return `${d}: ${e.mood.emoji} ${e.mood.label}${tags}${note}`;
    }).join('\n');

    const prompt = `You are a warm journaling companion. Based on these entries, write a 3-4 sentence personal reflection. Be empathetic and specific. End with encouragement. Sound like a caring friend.\n\nEntries:\n${summary}\n\nReflection:`;

    // ── Auto-switch: Ollama locally, Gemini on Vercel ──────────
    const isVercel   = !!process.env.KV_REST_API_URL;
    const geminiKey  = process.env.GEMINI_API_KEY || req.body?.apiKey;
    const ollamaModel = req.body?.model || 'llama3.2';

    let reflection;

    if (!isVercel) {
      // ── LOCAL: use Ollama ──────────────────────────────────
      const response = await fetch('http://localhost:11434/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model: ollamaModel, prompt, stream: false }),
        signal:  AbortSignal.timeout(30000),
      });

      if (!response.ok) throw new Error('Ollama error — is it running? Try: ollama serve');
      const data = await response.json();
      reflection = data.response?.trim();
      if (!reflection) throw new Error('Empty response from Ollama');

      return res.json({ success: true, reflection, entryCount: recent.length, source: 'ollama' });
    }

    // ── VERCEL: use Gemini ─────────────────────────────────────
    if (!geminiKey) {
      return res.status(400).json({
        success: false,
        error: 'Add GEMINI_API_KEY in Vercel → Settings → Environment Variables (free at aistudio.google.com)'
      });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) return res.status(400).json({ success: false, error: geminiData.error?.message || 'Gemini error' });

    reflection = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reflection) throw new Error('Empty response from Gemini');

    res.json({ success: true, reflection, entryCount: recent.length, source: 'gemini' });

  } catch (err) {
    const isConnRefused = err.message.includes('ECONNREFUSED') || err.message.includes('fetch');
    if (isConnRefused) {
      return res.status(503).json({ success: false, error: 'Ollama not running — start it with: ollama serve' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
