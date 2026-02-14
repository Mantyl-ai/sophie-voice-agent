/**
 * Sophie — AI Sales Analyst — Chat Proxy
 *
 * Netlify serverless function that proxies conversation requests to OpenAI.
 * Used during the voice session phase for multi-turn dialogue with GPT-4o.
 *
 * Security:
 *   - CORS origin whitelist
 *   - Model whitelist (gpt-4o, gpt-4o-mini, gpt-4-turbo)
 *   - Token ceiling (max_tokens capped at 2000)
 *   - API key injected via environment variable (never exposed to client)
 *
 * @endpoint POST /api/chat → /.netlify/functions/chat
 * @env OPENAI_API_KEY — Required. Set in Netlify Dashboard.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Allowed origins for CORS (update with your production domain)
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

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Validate API key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Server configuration error: API key not set.' } }),
    };
  }

  try {
    // Parse and validate request body
    const body = JSON.parse(event.body);

    // Enforce model whitelist (prevent abuse)
    const allowedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
    if (!allowedModels.includes(body.model)) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: { message: `Model not allowed. Use: ${allowedModels.join(', ')}` } }),
      };
    }

    // Enforce token limits
    if (body.max_tokens && body.max_tokens > 2000) {
      body.max_tokens = 2000;
    }

    // Forward to OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: cors,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Internal server error.' } }),
    };
  }
};
