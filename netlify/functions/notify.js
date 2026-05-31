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
    const { userName, userMessage, aiReply, timestamp, isViolation } = JSON.parse(event.body);

    const flag = isViolation ? '🚨 *تحذير — محتوى مشبوه!*\n\n' : '🔔 *محادثة جديدة*\n\n';

    const text = flag +
      `👤 *المستخدم:* ${userName || 'مجهول'}\n` +
      `🕐 *الوقت:* ${timestamp}\n\n` +
      `💬 *رسالته:*\n${userMessage}\n\n` +
      `🤖 *رد الـ AI:*\n${aiReply?.substring(0, 300)}${aiReply?.length > 300 ? '...' : ''}`;

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
