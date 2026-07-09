const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const MODEL_ROUTES = {
  'claude-sonnet-4-6': {
    provider: 'anthropic',
    model: () => process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-6'
  },
  'claude-opus-4-1': {
    provider: 'anthropic',
    model: () => process.env.CLAUDE_OPUS_MODEL || 'claude-opus-4-1'
  },
  'claude-haiku-4-5': {
    provider: 'anthropic',
    model: () => process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-4-5'
  },
  'deepseek-chat': {
    provider: 'openai-compatible',
    apiKey: () => process.env.DEEPSEEK_API_KEY,
    url: () => process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
    model: () => process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  },
  'bluebird-api': {
    provider: 'openai-compatible',
    apiKey: () => process.env.BLUEBIRD_API_KEY,
    url: () => process.env.BLUEBIRD_API_URL,
    model: () => process.env.BLUEBIRD_MODEL || 'bluebird-api'
  },
  'vethrlauf-api': {
    provider: 'openai-compatible',
    apiKey: () => process.env.VETHRLAUF_API_KEY,
    url: () => process.env.VETHRLAUF_API_URL,
    model: () => process.env.VETHRLAUF_MODEL || 'vethrlauf-api'
  },
  'yggdrasil-local': {
    provider: 'ollama',
    url: () => process.env.YGGDRASIL_LOCAL_URL,
    model: () => process.env.YGGDRASIL_MODEL || 'yggdrasil:v0.1'
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
    .map((m) => ({ role: m.role, content: m.content }));
}

async function callAnthropic(route, payload) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return json(503, {
      error: 'Anthropic is not configured on this deploy. Add ANTHROPIC_API_KEY in Netlify environment variables.'
    });
  }

  const response = await fetch(process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01'
    },
    body: JSON.stringify({
      model: route.model(),
      max_tokens: payload.max_tokens || 1000,
      system: payload.system,
      messages: cleanMessages(payload.messages)
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(response.status, {
      error: data.error?.message || data.message || 'Anthropic route failed.',
      provider: 'anthropic'
    });
  }

  const reply = Array.isArray(data.content)
    ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    : '';

  return json(200, {
    provider: 'anthropic',
    model: route.model(),
    reply,
    content: data.content || []
  });
}

async function callOpenAICompatible(route, payload, label) {
  const apiKey = route.apiKey && route.apiKey();
  const url = route.url && route.url();
  if (!apiKey || !url) {
    return json(503, {
      error: `${label} is not configured on this deploy. Add its API key and URL in Netlify environment variables.`
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: route.model(),
      max_tokens: payload.max_tokens || 1000,
      messages: [
        { role: 'system', content: payload.system || '' },
        ...cleanMessages(payload.messages)
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(response.status, {
      error: data.error?.message || data.message || `${label} route failed.`,
      provider: label
    });
  }

  const reply = data.choices?.[0]?.message?.content || data.reply || data.text || '';
  return json(200, {
    provider: label,
    model: route.model(),
    reply: reply.trim()
  });
}

async function callOllama(route, payload) {
  const url = route.url && route.url();
  if (!url) {
    return json(503, {
      error: 'Yggdrasil Local is not reachable from this deploy. Add YGGDRASIL_LOCAL_URL if you are using a tunnel or private bridge.'
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: route.model(),
      stream: false,
      messages: [
        { role: 'system', content: payload.system || '' },
        ...cleanMessages(payload.messages)
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(response.status, {
      error: data.error || data.message || 'Yggdrasil local route failed.',
      provider: 'yggdrasil-local'
    });
  }

  const reply = data.message?.content || data.response || data.reply || '';
  return json(200, {
    provider: 'yggdrasil-local',
    model: route.model(),
    reply: reply.trim()
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST required.' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body.' });
  }

  if (payload.resident && payload.resident !== 'tesla') {
    return json(400, { error: 'Only the Tesla resident is wired on this route.' });
  }

  const selected = payload.model || 'claude-sonnet-4-6';
  const route = MODEL_ROUTES[selected];
  if (!route) return json(400, { error: `Unknown model: ${selected}` });
  if (!payload.system) return json(400, { error: 'System prompt is required.' });

  try {
    if (route.provider === 'anthropic') return await callAnthropic(route, payload);
    if (route.provider === 'openai-compatible') return await callOpenAICompatible(route, payload, selected);
    if (route.provider === 'ollama') return await callOllama(route, payload);
    return json(400, { error: `Unknown provider: ${route.provider}` });
  } catch (e) {
    return json(500, { error: e.message || 'The resident route misfired.' });
  }
}
