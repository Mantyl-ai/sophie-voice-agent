/**
 * Sophie Voice Agent — Text-to-Speech Proxy
 *
 * Netlify serverless function that proxies TTS requests to OpenAI.
 * Returns audio as base64-encoded mp3 for playback via Web Audio API.
 * Uses the "shimmer" voice — a warm, clear female voice ideal for Sophie.
 *
 * @endpoint POST /api/tts → /.netlify/functions/tts
 * @env OPENAI_API_KEY — Required. Set in Netlify Dashboard.
 */

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Server configuration error: API key not set.' } }),
    };
  }

  try {
    const { text, voice, speed } = JSON.parse(event.body);

    if (!text || text.length > 4096) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: { message: 'Text required (max 4096 chars).' } }),
      };
    }

    const allowedVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const selectedVoice = allowedVoices.includes(voice) ? voice : 'shimmer';

    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: selectedVoice,
        speed: Math.min(Math.max(speed || 1.0, 0.25), 4.0),
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers: cors,
        body: JSON.stringify({ error: { message: err.error?.message || 'TTS generation failed.' } }),
      };
    }

    // Convert audio to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        audio: base64,
        format: 'mp3',
        voice: selectedVoice,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Internal server error.' } }),
    };
  }
};
