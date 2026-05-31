const { getStore } = require('@netlify/blobs');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Simple hash (SHA-256 via Web Crypto — Node 18+)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'talel-ai-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { action, email, password, name } = JSON.parse(event.body);

    const store = getStore({
      name: 'talel-users',
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_TOKEN
    });

    const key = 'user:' + email.toLowerCase().trim();

    // ── REGISTER ──────────────────────────────────────────────────
    if (action === 'register') {
      const existing = await store.get(key);
      if (existing) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Email already registered' }) };
      }
      const hashed = await hashPassword(password);
      await store.set(key, JSON.stringify({ email, name, password: hashed, createdAt: new Date().toISOString() }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── LOGIN ──────────────────────────────────────────────────────
    if (action === 'login') {
      const raw = await store.get(key);
      if (!raw) return { statusCode: 404, headers, body: JSON.stringify({ error: 'No account found' }) };
      const userData = JSON.parse(raw);
      const hashed = await hashPassword(password);
      if (hashed !== userData.password) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Wrong password' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, name: userData.name }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
