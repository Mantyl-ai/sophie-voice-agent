/**
 * Sophie — AI Sales Intelligence Agent — Error Reporting
 *
 * Netlify serverless function that emails error reports to the team
 * when a user encounters an error in the Sophie webapp.
 * Uses Resend API for transactional email delivery.
 *
 * @endpoint POST /api/error-report → /.netlify/functions/error-report
 * @env RESEND_API_KEY — Required. Set in Netlify Dashboard. Get free key at resend.com/signup
 * @env ERROR_NOTIFY_EMAIL — Optional. Defaults to jose@mantyl.ai
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

const ALLOWED_ORIGINS = [
  'https://sophie.mantyl.ai',
  'https://tools.mantyl.ai',
  'http://localhost:8888',
  'http://localhost:3000',
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const cors = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Silently fail — don't break the app if email isn't configured
    console.error('RESEND_API_KEY not set — error report not sent.');
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ status: 'skipped', reason: 'Email not configured' }),
    };
  }

  const notifyEmail = process.env.ERROR_NOTIFY_EMAIL || 'jose@mantyl.ai';

  try {
    const {
      error_message,
      error_source,
      user_name,
      user_email,
      prospect,
      stage,
      session_step,
      browser,
      timestamp,
      conversation_length,
    } = JSON.parse(event.body);

    if (!error_message) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'error_message is required' }),
      };
    }

    // Determine severity based on error source
    const severity = error_source === 'start' || error_source === 'debrief'
      ? '🔴 HIGH' : error_source === 'send' ? '🟡 MEDIUM' : '🟢 LOW';

    const htmlBody = `
      <div style="font-family: Inter, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 12px; padding: 24px 28px; margin-bottom: 20px;">
          <h1 style="margin: 0 0 4px; color: #fff; font-size: 20px; font-weight: 800;">
            ⚠️ Sophie Error Report
          </h1>
          <p style="margin: 0; color: #64748b; font-size: 13px;">
            ${new Date(timestamp || Date.now()).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
          </p>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
            Error Message
          </div>
          <div style="font-size: 14px; color: #7f1d1d; font-family: monospace; word-break: break-all;">
            ${escapeHtml(error_message)}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600; width: 140px;">Severity</td>
            <td style="padding: 10px 12px; color: #0f172a;">${severity}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">Error Source</td>
            <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(error_source || 'unknown')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">Session Step</td>
            <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(session_step || '—')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">User Name</td>
            <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(user_name || '—')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">User Email</td>
            <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(user_email || '—')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">Prospect</td>
            <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(prospect || '—')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">Stage</td>
            <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(stage || '—')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">Conversation Length</td>
            <td style="padding: 10px 12px; color: #0f172a;">${conversation_length || 0} exchanges</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; color: #64748b; font-weight: 600;">Browser</td>
            <td style="padding: 10px 12px; color: #0f172a; font-size: 11px;">${escapeHtml(browser || '—')}</td>
          </tr>
        </table>

        <div style="padding: 14px 16px; background: #f8fafc; border-radius: 8px; font-size: 11px; color: #94a3b8; text-align: center;">
          Sent by Sophie Error Reporter — sophie.mantyl.ai
        </div>
      </div>
    `;

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Sophie Error Reports <errors@mantyl.ai>',
        to: [notifyEmail],
        subject: `${severity} Sophie Error: ${(error_message || '').slice(0, 80)}`,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Resend API error:', err);
      return {
        statusCode: 200, // Don't fail the client
        headers: cors,
        body: JSON.stringify({ status: 'email_failed', detail: err.message || 'Unknown' }),
      };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ status: 'sent' }),
    };
  } catch (err) {
    console.error('Error report function failed:', err);
    return {
      statusCode: 200, // Don't fail the client — error reporting is best-effort
      headers: cors,
      body: JSON.stringify({ status: 'error', detail: err.message }),
    };
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
