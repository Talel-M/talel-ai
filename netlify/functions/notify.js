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
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    });

    // Send photo separately if registration includes one
    if (type === 'registration' && body.photo) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          photo: body.photo,
          caption: `📸 صورة ${body.name || 'المستخدم'}`
        })
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
