/**
 * Sophie — AI Sales Intelligence Agent — Debrief Proxy
 *
 * Netlify serverless function that proxies debrief requests to Anthropic Claude.
 * Used after the voice session to generate the signal report, recommended next
 * moves, and draft follow-up email using Claude Haiku 4.5.
 *
 * Response normalization:
 *   Anthropic returns { content: [{ type: "text", text: "..." }] }
 *   This function flattens it to { content: "...", model, usage } for the frontend.
 *
 * Security:
 *   - CORS origin whitelist
 *   - API key injected via environment variable (never exposed to client)
 *
 * @endpoint POST /api/debrief → /.netlify/functions/debrief
 * @env ANTHROPIC_API_KEY — Required. Set in Netlify Dashboard.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Server configuration error: Anthropic API key not set.' } }),
    };
  }

  try {
    const { system, messages, max_tokens } = JSON.parse(event.body);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 2000,
        system: system || '',
        messages,
      }),
    });

    const data = await response.json();

    // Normalize response to match the shape the frontend expects
    if (data.content && data.content[0]) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          content: data.content[0].text,
          model: data.model,
          usage: data.usage,
        }),
      };
    }

    // Pass through errors
    return {
      statusCode: response.status,
      headers: cors,
      body: JSON.stringify({ error: { message: data.error?.message || 'Unknown Anthropic error' } }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Internal server error.' } }),
    };
  }
};
