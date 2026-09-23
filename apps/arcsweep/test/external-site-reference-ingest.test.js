import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalizeUrl,
  classifySource,
  extractLinks,
  isRelevant,
  parseRobots,
  robotsAllows,
  semanticSignals,
  stripHtml,
} from '../scripts/external-site-reference-ingest.mjs';

const config = {
  base_url: 'https://example.test/',
  default_source_class: 'external-reference',
  crawl: {
    direct_path_prefixes: ['/features/'],
    relevance_terms: ['sigil', 'sensor'],
  },
  classification_rules: [
    { match: '/features/sigil', class: 'sigil-workbench' },
  ],
  semantic_signal_terms: {
    composition: ['drag', 'rotate'],
    instrumentation: ['sensor', 'magnetometer'],
  },
};

test('canonicalizeUrl strips fragments and tracking parameters', () => {
  const value = canonicalizeUrl('/features/sigil?utm_source=x&keep=1#top', config.base_url, ['utm_source']);
  assert.equal(value, 'https://example.test/features/sigil?keep=1');
});

test('stripHtml produces transient plain text without script content', () => {
  const text = stripHtml('<main><h1>Sigil</h1><script>secret()</script><p>Drag and rotate.</p></main>');
  assert.match(text, /Sigil/);
  assert.match(text, /Drag and rotate/);
  assert.doesNotMatch(text, /secret/);
});

test('extractLinks resolves same-page relative references for later origin filtering', () => {
  const links = extractLinks('<a href="/features/sigil">Forge</a><a href="mailto:a@b.test">Mail</a>', config.base_url);
  assert.deepEqual(links, ['https://example.test/features/sigil']);
});

test('relevance and classification are driven by config rather than one source site', () => {
  assert.equal(isRelevant('https://example.test/features/altar', 'Anything', '', config), true);
  assert.equal(isRelevant('https://example.test/blog/a', 'Sensor notebook', '', config), true);
  assert.equal(classifySource('https://example.test/features/sigil', config), 'sigil-workbench');
});

test('semantic signals are configurable', () => {
  assert.deepEqual(semanticSignals('Field note', 'Magnetometer sensor moved', config), ['instrumentation']);
});

test('robots parser honours the longest matching rule', () => {
  const rules = parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/public\n');
  assert.equal(robotsAllows('https://example.test/private/secret', rules), false);
  assert.equal(robotsAllows('https://example.test/private/public/page', rules), true);
});
