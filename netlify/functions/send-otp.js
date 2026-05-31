exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { email, name, otp } = JSON.parse(event.body);
    if (!email || !otp) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Talel AI" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${otp} — Talel AI Verification Code`,
      html: `<div style="font-family:system-ui;max-width:480px;margin:0 auto;padding:32px;background:#020408;color:#dce8ff;border-radius:12px;border:1px solid #0d1e30;"><h2 style="color:#fff;">Talel <span style="color:#3d7fff;font-weight:300">AI</span></h2><p style="color:#8faac8;margin-bottom:20px;">Hi <strong style="color:#fff;">${name || 'there'}</strong>, your verification code:</p><div style="background:#08101e;border:1px solid #162840;border-radius:10px;padding:28px;text-align:center;margin-bottom:20px;"><div style="font-size:48px;font-weight:700;letter-spacing:14px;color:#fff;font-family:monospace;">${otp}</div><div style="font-size:11px;color:#3a5570;margin-top:10px;">Valid for 10 minutes · Do not share</div></div><p style="color:#3a5570;font-size:12px;">If you did not request this, ignore this email.</p></div>`
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
