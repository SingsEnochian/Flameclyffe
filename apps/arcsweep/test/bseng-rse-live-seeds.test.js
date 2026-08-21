import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanSitemapLoc,
  extractPdfLinks,
  extractSitemapLocs,
} from '../scripts/bseng-rse-live-seeds.mjs';

test('cleanSitemapLoc unwraps XML CDATA without damaging the URL', () => {
  assert.equal(
    cleanSitemapLoc('<![CDATA[https://bseng.com/post-sitemap.xml]]>'),
    'https://bseng.com/post-sitemap.xml',
  );
});

test('extractSitemapLocs reads plain and CDATA sitemap locations', () => {
  const xml = `<?xml version="1.0"?><sitemapindex>
    <sitemap><loc><![CDATA[https://bseng.com/post-sitemap.xml]]></loc></sitemap>
    <sitemap><loc>https://bseng.com/page-sitemap.xml</loc></sitemap>
  </sitemapindex>`;
  assert.deepEqual(extractSitemapLocs(xml), [
    'https://bseng.com/post-sitemap.xml',
    'https://bseng.com/page-sitemap.xml',
  ]);
});

test('extractPdfLinks resolves current framework downloads from the mathematics hub', () => {
  const html = `<a href="/wp-content/uploads/2026/06/The-Coherence-Relational-Blockworld-v6.0.pdf">Download</a>
    <a href="https://bseng.com/wp-content/uploads/2026/06/Relational-Structural-Experience-v6.0.pdf">RSE</a>`;
  assert.deepEqual(extractPdfLinks(html), [
    'https://bseng.com/wp-content/uploads/2026/06/The-Coherence-Relational-Blockworld-v6.0.pdf',
    'https://bseng.com/wp-content/uploads/2026/06/Relational-Structural-Experience-v6.0.pdf',
  ]);
});
