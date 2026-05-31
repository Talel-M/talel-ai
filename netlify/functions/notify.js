const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body);
    const { type } = body;
    let text = '';

    // ── REGISTRATION NOTIFICATION ──────────────────────────────
    if (type === 'registration') {
      const { name, email, age, country, status, goal, level, photo, timestamp } = body;
      text =
        `🎉 *مستخدم جديد انضم!*\n\n` +
        `👤 *الاسم:* ${name || 'مجهول'}\n` +
        `📧 *الإيميل:* ${email || '—'}\n` +
        `🎂 *العمر:* ${age || '—'}\n` +
        `🌍 *البلد:* ${country || '—'}\n` +
        `💼 *الوضع:* ${status || '—'}\n` +
        `🎯 *الهدف:* ${goal || '—'}\n` +
        `📊 *المستوى:* ${level || '—'}\n` +
        `🕐 *الوقت:* ${timestamp}\n` +
        `🖼 *صورة:* ${photo ? 'نعم ✅' : 'لا ❌'}`;

      // Send text message first
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
      });

      // Send photo via multipart/form-data (the ONLY way Telegram accepts Base64)
      if (photo && photo.startsWith('data:image')) {
        const base64Data = photo.split(',')[1];
        const mimeType = photo.split(';')[0].split(':')[1]; // e.g. image/jpeg
        const buffer = Buffer.from(base64Data, 'base64');

        // Build multipart form manually (no external libs needed)
        const boundary = '----TalelAIBoundary' + Date.now();
        const CRLF = '\r\n';

        const partHeader =
          `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="chat_id"${CRLF}${CRLF}` +
          `${CHAT_ID}${CRLF}` +
          `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="caption"${CRLF}${CRLF}` +
          `📸 صورة ${name || 'المستخدم'}${CRLF}` +
          `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="photo"; filename="profile.jpg"${CRLF}` +
          `Content-Type: ${mimeType}${CRLF}${CRLF}`;

        const partFooter = `${CRLF}--${boundary}--${CRLF}`;

        const headerBuf = Buffer.from(partHeader, 'utf-8');
        const footerBuf = Buffer.from(partFooter, 'utf-8');
        const combined = Buffer.concat([headerBuf, buffer, footerBuf]);

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          body: combined
        });
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── CHAT MESSAGE NOTIFICATION ──────────────────────────────
    else if (type === 'message') {
      const { userName, email, userMessage, aiReply, timestamp, isViolation } = body;
      const flag = isViolation ? '🚨 *تحذير — محتوى مشبوه!*\n\n' : '🔔 *محادثة جديدة*\n\n';
      text = flag +
        `👤 *المستخدم:* ${userName || 'مجهول'}\n` +
        `📧 *الإيميل:* ${email || '—'}\n` +
        `🕐 *الوقت:* ${timestamp}\n\n` +
        `💬 *رسالته:*\n${userMessage || '—'}\n\n` +
        `🤖 *رد الـ AI:*\n${(aiReply || '').substring(0, 300)}${(aiReply || '').length > 300 ? '...' : ''}`;
    }

    else {
      text = `📌 *إشعار جديد*\n${JSON.stringify(body, null, 2).substring(0, 500)}`;
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
