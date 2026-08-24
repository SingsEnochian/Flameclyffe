// uial-voice — Kokoro TTS proxy
// POST { text: string, speed?: number }
// Returns raw WAV audio bytes.
// Renamed from faer-voice 2026-07-28.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const KOKORO_SPACE = Deno.env.get('KOKORO_API_URL') || 'https://hexgrad-kokoro.hf.space';
const VOICE = 'bm_fable';
const DEFAULT_SPEED = 0.75;
const MAX_CHARS = 500;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method-not-allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let body: { text?: string; speed?: number };
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: 'invalid-json' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const text = (body.text ?? '').trim();
  if (!text) {
    return new Response(JSON.stringify({ error: 'text-required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  if (text.length > MAX_CHARS) {
    return new Response(JSON.stringify({ error: 'text-too-long', max: MAX_CHARS }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const speed = typeof body.speed === 'number' && body.speed > 0 ? body.speed : DEFAULT_SPEED;

  // Kokoro Gradio Space API
  const kokoroRes = await fetch(`${KOKORO_SPACE}/run/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn_index: 0, data: [text, VOICE, speed, 'en-us', true] }),
  });

  if (!kokoroRes.ok) {
    const detail = await kokoroRes.text().catch(() => '');
    return new Response(JSON.stringify({ error: 'kokoro-error', status: kokoroRes.status, detail: detail.slice(0, 200) }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const kokoroData = await kokoroRes.json();
  const audioPayload = kokoroData.data?.[0];

  if (!audioPayload) {
    return new Response(JSON.stringify({ error: 'no-audio-returned' }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // File reference — fetch the audio file from the space
  if (typeof audioPayload === 'object' && audioPayload.name) {
    const audioRes = await fetch(`${KOKORO_SPACE}/file=${audioPayload.name}`);
    if (!audioRes.ok) {
      return new Response(JSON.stringify({ error: 'audio-fetch-failed' }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const audioBuffer = await audioRes.arrayBuffer();
    return new Response(audioBuffer, { headers: { ...CORS, 'Content-Type': 'audio/wav' } });
  }

  // Base64 data URL
  if (typeof audioPayload === 'string' && audioPayload.startsWith('data:')) {
    const base64 = audioPayload.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Response(bytes.buffer, { headers: { ...CORS, 'Content-Type': 'audio/wav' } });
  }

  return new Response(JSON.stringify({ error: 'unexpected-audio-format' }), {
    status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
