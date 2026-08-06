'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const SYSTEM = `You are Hearthfire's source-analysis librarian. Analyse only the supplied source text.
Return one valid JSON object with: summary (string), source_kind (string), primary_class (one of established science, evidence-backed finding, active research, speculative theory, fringe inspiration, creative canon, personal continuity, interaction transcript, governance archive, implementation task), notebooks (array drawn from Research, Continuity, Trends, Creative Library, Governance, Visual Archive), topics (array, max 12), entities (array, max 20), source_claims (array of concise claims explicitly made by the source, max 12), continuity_links (array, max 12), trend_signals (array, max 8), dates (array of objects with label, value, context, source_locator, max 20), mathematics (array of objects with label, expression, variables, context, source_locator, max 16), magic_and_correspondence (array of objects with label, system, value, context, source_locator, max 20), places (array, max 20), relationships (array of objects with subject, relation, object, context, source_locator, max 20), implementation_relevance (string), epistemic_note (string), and uncertainty (array, max 10).
For source_locator, give the most precise locator available in the supplied text (page marker, section/heading, timestamp, message author, or a short distinctive phrase). Do not invent page numbers. Dates, equations, correspondences, relationships, and magical rules must be extracted from the source, not inferred from general knowledge. Preserve mathematical expressions verbatim where short enough.
Separate what the source says from what the evidence establishes. Do not validate supernatural, medical, scientific, historical, or causal claims merely because they appear in the source. Do not invent missing content. Use concise paraphrase rather than long quotations.`;

function sampledText(text, maximum = 72000) {
  if (text.length <= maximum) return text;
  const segments = 6, width = Math.floor(maximum / segments), stride = Math.floor((text.length - width) / (segments - 1));
  return Array.from({ length: segments }, (_, index) => text.slice(index * stride, index * stride + width)).join('\n\n[...sampled interval...]\n\n');
}

function jsonObject(value) {
  const text = String(value || '').replace(/^```json\s*|```$/g, '').trim();
  const first = text.indexOf('{'), last = text.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('analysis-provider-returned-no-json');
  return JSON.parse(text.slice(first, last + 1));
}

function normalise(raw, provider, model) {
  const list = (value, max) => Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, max) : [];
  const records = (value, fields, max) => Array.isArray(value) ? value.slice(0, max).map(item => {
    if (!item || typeof item !== 'object') return null;
    return Object.fromEntries(fields.map(field => [field, String(item[field] || '').trim()]).filter(([, fieldValue]) => fieldValue));
  }).filter(item => item && Object.keys(item).length) : [];
  return {
    schema: 'hearthfire.source-analysis/v1', analysedAt: new Date().toISOString(), provider, model,
    status: 'analysed', summary: String(raw.summary || ''), sourceKind: String(raw.source_kind || 'unclassified source'),
    primaryClass: String(raw.primary_class || 'active research'), notebooks: list(raw.notebooks, 6), topics: list(raw.topics, 12),
    entities: list(raw.entities, 20), places: list(raw.places, 20), sourceClaims: list(raw.source_claims, 12), continuityLinks: list(raw.continuity_links, 12),
    dates: records(raw.dates, ['label', 'value', 'context', 'source_locator'], 20),
    mathematics: records(raw.mathematics, ['label', 'expression', 'variables', 'context', 'source_locator'], 16),
    magicAndCorrespondence: records(raw.magic_and_correspondence, ['label', 'system', 'value', 'context', 'source_locator'], 20),
    relationships: records(raw.relationships, ['subject', 'relation', 'object', 'context', 'source_locator'], 20),
    trendSignals: list(raw.trend_signals, 8), implementationRelevance: String(raw.implementation_relevance || ''),
    epistemicNote: String(raw.epistemic_note || 'Analysis describes the source; it does not certify its claims.'), uncertainty: list(raw.uncertainty, 10),
    boundary: 'Model-assisted source analysis. Source assertions remain distinct from verified findings.',
  };
}

async function analyseSource({ text, name, provider = 'auto' }) {
  const input = `Filename: ${name}\n\nSOURCE TEXT:\n${sampledText(text)}`;
  let selected = provider;
  if (selected === 'auto') selected = process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_HOST ? 'ollama' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : null;
  if (!selected) throw Object.assign(new Error('no-analysis-provider-configured'), { code: 'no-analysis-provider-configured' });
  if (selected === 'ollama') {
    const endpoint = (process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
    const model = process.env.HEARTHGATE_ANALYSIS_MODEL || 'qwen2.5:7b';
    const response = await fetch(`${endpoint}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: input }] }) });
    if (!response.ok) throw new Error(`ollama-analysis-${response.status}`);
    return normalise(jsonObject((await response.json()).message?.content), 'ollama', model);
  }
  if (selected === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw Object.assign(new Error('anthropic-not-configured'), { code: 'provider-not-configured' });
    const model = 'claude-haiku-4-5-20251001', client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({ model, max_tokens: 1800, system: SYSTEM, messages: [{ role: 'user', content: input }] });
    return normalise(jsonObject(response.content.find((part) => part.type === 'text')?.text), 'anthropic', model);
  }
  if (selected === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('openai-not-configured'), { code: 'provider-not-configured' });
    const model = 'gpt-4o-mini', client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({ model, response_format: { type: 'json_object' }, max_tokens: 1800, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: input }] });
    return normalise(jsonObject(response.choices[0]?.message?.content), 'openai', model);
  }
  throw Object.assign(new Error('unsupported-analysis-provider'), { code: 'unsupported-analysis-provider' });
}

module.exports = { analyseSource, sampledText, normalise };
