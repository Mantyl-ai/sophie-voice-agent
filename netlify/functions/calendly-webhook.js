/**
 * Calendly Webhook Handler — Mantyl AI
 *
 * Receives Calendly "invitee.created" webhooks when someone books a meeting.
 * Sends two branded emails via Resend:
 *   1. Lead notification → Jose (jose@mantyl.ai)
 *   2. Welcome / prep email → the prospect
 *
 * @endpoint POST /api/calendly-webhook → /.netlify/functions/calendly-webhook
 *
 * @env RESEND_API_KEY       — Required. Same key used by error-report.js
 * @env CALENDLY_WEBHOOK_TOKEN — Optional. Signing key from Calendly for verification.
 *
 * SETUP:
 *   1. Go to https://calendly.com/integrations → Webhooks → "Create Webhook Subscription"
 *   2. URL: https://sophie.mantyl.ai/api/calendly-webhook
 *   3. Events: invitee.created
 *   4. Copy the signing key → set as CALENDLY_WEBHOOK_TOKEN in Netlify env vars
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const NOTIFY_EMAIL = 'jose@mantyl.ai';
const FROM_NAME = 'Mantyl AI';
const FROM_EMAIL = 'bookings@mantyl.ai'; // Must be verified domain in Resend

// ─── Webhook signature verification (optional but recommended) ───
function verifySignature(payload, signature, secret) {
  if (!secret || !signature) return true; // Skip if not configured
  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── HTML email builder — Lead notification to Jose ───
function buildLeadEmail(data) {
  const { name, email, eventName, startTime, timezone, questions } = data;
  const dateStr = new Date(startTime).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const questionsHtml = questions.length > 0
    ? questions.map(q => `
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 12px;color:#64748b;font-weight:600;width:140px">${esc(q.question)}</td>
          <td style="padding:10px 12px;color:#0f172a">${esc(q.answer)}</td>
        </tr>`).join('')
    : '';

  return `
    <div style="font-family:Inter,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:12px;padding:24px 28px;margin-bottom:20px">
        <h1 style="margin:0 0 4px;color:#fff;font-size:20px;font-weight:800">
          🎉 New Booking — ${esc(name)}
        </h1>
        <p style="margin:0;color:#94a3b8;font-size:13px">${dateStr}</p>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">New Lead</div>
        <div style="font-size:16px;color:#14532d;font-weight:700">${esc(name)}</div>
        <div style="font-size:14px;color:#166534;margin-top:2px">${esc(email)}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 12px;color:#64748b;font-weight:600;width:140px">Meeting Type</td>
          <td style="padding:10px 12px;color:#0f172a">${esc(eventName)}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 12px;color:#64748b;font-weight:600">Scheduled For</td>
          <td style="padding:10px 12px;color:#0f172a">${dateStr}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 12px;color:#64748b;font-weight:600">Prospect Email</td>
          <td style="padding:10px 12px;color:#0f172a"><a href="mailto:${esc(email)}" style="color:#6B8ADB">${esc(email)}</a></td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 12px;color:#64748b;font-weight:600">Timezone</td>
          <td style="padding:10px 12px;color:#0f172a">${esc(timezone || '—')}</td>
        </tr>
        ${questionsHtml}
      </table>

      <div style="padding:14px 16px;background:#f8fafc;border-radius:8px;font-size:11px;color:#94a3b8;text-align:center">
        Mantyl AI — Booking Notification System
      </div>
    </div>`;
}

// ─── HTML email builder — Welcome email to the prospect ───
function buildProspectEmail(data) {
  const { name, eventName, startTime } = data;
  const firstName = (name || '').split(' ')[0] || 'there';
  const dateStr = new Date(startTime).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  return `
    <div style="font-family:Inter,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="display:inline-block;background:linear-gradient(135deg,#6B8ADB,#9B7FC7,#D4849A,#E89E6C);padding:2px;border-radius:16px">
          <div style="background:#fff;border-radius:14px;padding:16px 32px">
            <span style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#6B8ADB,#9B7FC7,#D4849A,#E89E6C);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Mantyl AI</span>
          </div>
        </div>
      </div>

      <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 12px;text-align:center">
        Hey ${esc(firstName)}, you're all set! 🎯
      </h1>
      <p style="font-size:15px;color:#475569;line-height:1.7;text-align:center;margin:0 0 28px">
        Your consultation with Jose at Mantyl AI is confirmed. Here's what to expect.
      </p>

      <div style="background:linear-gradient(135deg,rgba(107,138,219,.06),rgba(155,127,199,.06));border:1px solid rgba(107,138,219,.15);border-radius:14px;padding:24px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;color:#6B8ADB;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Meeting Details</div>
        <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px">${esc(eventName)}</div>
        <div style="font-size:14px;color:#64748b">${dateStr}</div>
      </div>

      <div style="margin-bottom:28px">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px">What we'll cover:</div>
        <table style="width:100%;font-size:14px;color:#475569;line-height:1.6">
          <tr><td style="padding:6px 0;vertical-align:top;width:28px">✅</td><td style="padding:6px 0">Your current sales workflow and pain points</td></tr>
          <tr><td style="padding:6px 0;vertical-align:top">✅</td><td style="padding:6px 0">Where AI automation can save you time and money</td></tr>
          <tr><td style="padding:6px 0;vertical-align:top">✅</td><td style="padding:6px 0">A custom recommendation for your business</td></tr>
          <tr><td style="padding:6px 0;vertical-align:top">✅</td><td style="padding:6px 0">Pricing and timeline — no obligations</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:28px">
        <a href="https://sophie.mantyl.ai" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6B8ADB,#9B7FC7,#D4849A,#E89E6C);color:#fff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none">
          Try Sophie — Free AI Sales Agent
        </a>
        <p style="font-size:12px;color:#94a3b8;margin-top:8px">Debrief any sales conversation and get a signal report in minutes</p>
      </div>

      <div style="border-top:1px solid #f1f5f9;padding-top:20px;text-align:center">
        <p style="font-size:13px;color:#94a3b8;margin:0 0 4px">
          Questions before the call? Reply to this email or reach me at
          <a href="mailto:jose@mantyl.ai" style="color:#6B8ADB">jose@mantyl.ai</a>
        </p>
        <p style="font-size:12px;color:#cbd5e1;margin:0">
          Mantyl AI — Intelligent Automation for Sales Teams
        </p>
      </div>
    </div>`;
}

// ─── Main handler ───
exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    return { statusCode: 200, body: JSON.stringify({ status: 'skipped', reason: 'No API key' }) };
  }

  // Verify webhook signature (if configured)
  const webhookToken = process.env.CALENDLY_WEBHOOK_TOKEN;
  const signature = event.headers['calendly-webhook-signature'] || '';
  if (webhookToken && !verifySignature(event.body, signature, webhookToken)) {
    console.error('Invalid webhook signature');
    return { statusCode: 403, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  try {
    const payload = JSON.parse(event.body);

    // Calendly sends event type in the payload
    const eventType = payload.event;
    if (eventType !== 'invitee.created') {
      // Only process new bookings
      return { statusCode: 200, body: JSON.stringify({ status: 'ignored', event: eventType }) };
    }

    const invitee = payload.payload || {};

    // Extract booking details
    const data = {
      name: invitee.name || invitee.invitee_name || 'Unknown',
      email: invitee.email || invitee.invitee_email || '',
      eventName: invitee.event_type?.name || invitee.event_type_name || 'Consultation',
      startTime: invitee.scheduled_event?.start_time || invitee.event?.start_time || new Date().toISOString(),
      timezone: invitee.timezone || '',
      questions: (invitee.questions_and_answers || []).map(q => ({
        question: q.question || '',
        answer: q.answer || '',
      })),
    };

    if (!data.email) {
      console.error('No invitee email found in webhook payload');
      return { statusCode: 200, body: JSON.stringify({ status: 'skipped', reason: 'No email' }) };
    }

    // ── Send both emails in parallel ──
    const results = await Promise.allSettled([
      // 1. Lead notification → Jose
      fetch(RESEND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [NOTIFY_EMAIL],
          subject: `🎉 New Booking: ${data.name} — ${data.eventName}`,
          html: buildLeadEmail(data),
        }),
      }),

      // 2. Welcome email → Prospect
      fetch(RESEND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: `Jose at ${FROM_NAME} <${FROM_EMAIL}>`,
          to: [data.email],
          reply_to: NOTIFY_EMAIL,
          subject: `You're confirmed — see you ${new Date(data.startTime).toLocaleDateString('en-US', { weekday: 'long' })}!`,
          html: buildProspectEmail(data),
        }),
      }),
    ]);

    const [leadResult, prospectResult] = results;

    console.log('Lead email:', leadResult.status, leadResult.status === 'fulfilled' ? (await leadResult.value?.json?.().catch(() => ({}))) : leadResult.reason);
    console.log('Prospect email:', prospectResult.status);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'sent',
        lead_email: leadResult.status,
        prospect_email: prospectResult.status,
      }),
    };
  } catch (err) {
    console.error('Webhook handler error:', err);
    return {
      statusCode: 200, // Return 200 so Calendly doesn't retry excessively
      body: JSON.stringify({ status: 'error', detail: err.message }),
    };
  }
};

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
