/**
 * Sophie Voice Agent — Text-to-Speech Proxy (ElevenLabs)
 *
 * Netlify serverless function that proxies TTS requests to ElevenLabs.
 * Returns audio as base64-encoded mp3 for playback via Web Audio API.
 * Uses voice ID cNYrMw9glwJZXR8RwbuR — a warm, professional female voice for Sophie.
 *
 * @endpoint POST /api/tts → /.netlify/functions/tts
 * @env ELEVENLABS_API_KEY — Required. Set in Netlify Dashboard.
 */

const VOICE_ID = 'cNYrMw9glwJZXR8RwbuR';
const ELEVENLABS_TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

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

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Server configuration error: ElevenLabs API key not set.' } }),
    };
  }

  try {
    const { text } = JSON.parse(event.body);

    if (!text || text.length > 5000) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: { message: 'Text required (max 5000 chars).' } }),
      };
    }

    const response = await fetch(ELEVENLABS_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers: cors,
        body: JSON.stringify({ error: { message: err.detail?.message || err.detail || 'TTS generation failed.' } }),
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
        voice: 'sophie-elevenlabs',
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
