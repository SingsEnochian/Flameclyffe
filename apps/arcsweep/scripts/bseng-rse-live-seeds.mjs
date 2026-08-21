#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DEFAULT_CONFIG = fileURLToPath(new URL('../skills/sources/bseng-rse/site-ingest.json', import.meta.url));
const DEFAULT_OUT = '/tmp/bseng-rse-live-config.json';
const SITEMAP_CANDIDATES = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];

export function cleanSitemapLoc(value = '') {
  return String(value)
    .trim()
    .replace(/^<!\[CDATA\[/i, '')
    .replace(/\]\]>$/i, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

export function extractSitemapLocs(xml = '') {
  return [...String(xml).matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => cleanSitemapLoc(match[1]))
    .filter(Boolean);
}

export function extractPdfLinks(html = '', base = 'https://bseng.com/') {
  const urls = new Set();
  for (const match of String(html).matchAll(/\bhref\s*=\s*["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi)) {
    try {
      const url = new URL(match[1].replace(/&amp;/gi, '&'), base);
      url.hash = '';
      urls.add(url.toString());
    } catch { /* malformed link */ }
  }
  return [...urls];
}

async function discoverSitemapPages(config, headers) {
  const queue = SITEMAP_CANDIDATES.map((path) => new URL(path, config.base_url).toString());
  const seen = new Set();
  const pages = new Set();
  const sitemaps = new Set();
  const failures = [];

  while (queue.length && seen.size < 100) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const response = await fetch(url, { headers, redirect: 'follow' });
      if (!response.ok) {
        failures.push({ url, status: response.status });
        continue;
      }
      const xml = await response.text();
      if (!/<(?:urlset|sitemapindex)\b/i.test(xml)) continue;
      sitemaps.add(url);
      for (const loc of extractSitemapLocs(xml)) {
        if (/\.xml(?:\?|$)/i.test(loc)) queue.push(loc);
        else pages.add(loc);
      }
    } catch (error) {
      failures.push({ url, error: error?.message || String(error) });
    }
  }

  return { pages: [...pages], sitemaps: [...sitemaps], failures };
}

function parseArgs(argv) {
  const args = { config: DEFAULT_CONFIG, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

export async function buildLiveConfig({ configPath = DEFAULT_CONFIG, outPath = DEFAULT_OUT, fetchImpl = fetch } = {}) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const headers = {
    'user-agent': config.crawl.user_agent,
    accept: 'text/html,application/xml,text/xml,application/pdf;q=0.9,*/*;q=0.1',
  };

  const originalFetch = globalThis.fetch;
  if (fetchImpl !== fetch) globalThis.fetch = fetchImpl;
  let sitemap;
  try {
    sitemap = await discoverSitemapPages(config, headers);
  } finally {
    if (fetchImpl !== fetch) globalThis.fetch = originalFetch;
  }

  const mathHub = new URL('/start-here/rse-mathematical-framework/', config.base_url).toString();
  let pdfs = [];
  let mathHubError = null;
  try {
    const response = await fetchImpl(mathHub, { headers, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    pdfs = extractPdfLinks(await response.text(), mathHub);
  } catch (error) {
    mathHubError = error?.message || String(error);
  }

  const seedUrls = new Set(config.seed_urls);
  sitemap.pages.forEach((url) => seedUrls.add(url));
  pdfs.forEach((url) => seedUrls.add(url));
  for (const doc of config.known_current_math_documents || []) {
    if (doc.url) seedUrls.add(doc.url);
  }

  const live = structuredClone(config);
  live.seed_urls = [...seedUrls];
  live.crawl.discover_sitemaps = false;
  live.crawl.follow_internal_links = false;
  live.live_seed_receipt = {
    generated_at: new Date().toISOString(),
    sitemap_count: sitemap.sitemaps.length,
    sitemap_page_count: sitemap.pages.length,
    sitemap_failures: sitemap.failures,
    mathematics_hub_pdf_count: pdfs.length,
    mathematics_hub_pdf_urls: pdfs,
    mathematics_hub_error: mathHubError,
    final_seed_count: live.seed_urls.length,
  };

  await writeFile(outPath, JSON.stringify(live, null, 2));
  return live.live_seed_receipt;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseArgs(process.argv.slice(2));
  buildLiveConfig({ configPath: args.config, outPath: args.out })
    .then((receipt) => console.log(JSON.stringify(receipt, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
