const { getStore } = require('@netlify/blobs');
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const { action, email, conversation } = JSON.parse(event.body);
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing email' }) };

    const store = getStore({
      name: 'talel-users',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_TOKEN
    });

    const key = 'memory:' + email.toLowerCase().trim();

    // ── GET MEMORY ──────────────────────────────────────────────
    if (action === 'get') {
      try {
        const raw = await store.get(key);
        return { statusCode: 200, headers, body: JSON.stringify({ memory: raw || '' }) };
      } catch(e) {
        return { statusCode: 200, headers, body: JSON.stringify({ memory: '' }) };
      }
    }

    // ── UPDATE MEMORY ────────────────────────────────────────────
    if (action === 'update') {
      if (!conversation || conversation.length < 2) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      let existingMemory = '';
      try { existingMemory = await store.get(key) || ''; } catch(e) {}

      const GROQ_KEY = process.env.GROQ_KEY;
      const extractPrompt = `You are a memory system for an AI assistant. Analyze this conversation and extract important facts about the user.
Extract things like:
- Hobbies and interests (football, gaming, music, etc.)
- Skills and technical level (programming languages, tools, etc.)
- Goals and projects they are working on
- Preferences (favorite things, what they like/dislike)
- Personal context (job, studies, country if mentioned)
- Topics they frequently ask about
${existingMemory ? `CURRENT MEMORY (already known about this user):\n${existingMemory}\n\nUpdate and merge — do NOT duplicate existing facts.\n` : ''}
RECENT CONVERSATION:
${conversation.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content.substring(0, 300) : '[image]'}`).join('\n')}
Return ONLY a concise bullet list of facts. Max 8 bullets. If nothing new to add, return the existing memory unchanged. No explanations, no intro text.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: extractPrompt }],
          max_tokens: 400
        })
      });
      const data = await res.json();
      const newMemory = data.choices?.[0]?.message?.content?.trim() || existingMemory;
      if (newMemory) await store.set(key, newMemory);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    console.error('memory error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
