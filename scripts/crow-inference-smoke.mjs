const token = String(process.env.HF_TOKEN || process.env.HFTOKEN || '').trim();
if (!token) {
  console.error('CROW_SMOKE: HF_TOKEN/HFTOKEN is not configured in GitHub Actions.');
  process.exit(2);
}

const model = process.env.CROW_MODEL || 'Crownelius/The-Crow-9B-Creative-Writing-Opus4.6-DISTILL-Heretic';
const base = String(process.env.HF_ROUTER_URL || 'https://router.huggingface.co/v1').replace(/\/$/, '');
const response = await fetch(`${base}/chat/completions`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    model,
    max_tokens: 12,
    temperature: 0,
    messages: [
      { role: 'system', content: 'This is a private-safe liveness probe. Follow the user instruction exactly.' },
      { role: 'user', content: 'Reply with exactly CROW_READY and nothing else.' },
    ],
  }),
});

const raw = await response.text();
if (!response.ok) {
  console.error(`CROW_SMOKE: provider rejected ${response.status}.`);
  // Do not print provider response: it may include operational details.
  process.exit(3);
}

let data;
try { data = JSON.parse(raw); }
catch {
  console.error('CROW_SMOKE: provider returned non-JSON content.');
  process.exit(4);
}

const content = String(data?.choices?.[0]?.message?.content || '').trim();
if (content !== 'CROW_READY') {
  console.error(`CROW_SMOKE: model answered, but liveness contract mismatch (${content.length} chars).`);
  process.exit(5);
}

console.log(`CROW_SMOKE: ready · ${model}`);
