#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMON_SITEMAPS = ['/sitemap.xml', '/sitemap_index.xml'];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms || 0)));

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function canonicalizeUrl(input, base, dropParameters = []) {
  const url = new URL(input, base);
  url.hash = '';
  const drop = new Set(dropParameters.map((key) => String(key).toLowerCase()));
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (drop.has(lower) || lower.startsWith('utm_')) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}

export function stripHtml(html = '') {
  return decodeEntities(String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function meta(html, name) {
  const escaped = name.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp('<meta[^>]+(?:name|property)=[\"\']' + escaped + '[\"\'][^>]+content=[\"\']([^\"\']*)[\"\'][^>]*>', 'i'),
    new RegExp('<meta[^>]+content=[\"\']([^\"\']*)[\"\'][^>]+(?:name|property)=[\"\']' + escaped + '[\"\'][^>]*>', 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return null;
}

function htmlTitle(html) {
  return meta(html, 'og:title') || decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim() || null;
}

function canonicalLink(html, base) {
  const match = html.match(/<link[^>]+rel=[\"\'][^\"\']*canonical[^\"\']*[\"\'][^>]+href=[\"\']([^\"\']+)[\"\'][^>]*>/i)
    || html.match(/<link[^>]+href=[\"\']([^\"\']+)[\"\'][^>]+rel=[\"\'][^\"\']*canonical[^\"\']*[\"\'][^>]*>/i);
  return match ? canonicalizeUrl(match[1], base) : null;
}

export function extractLinks(html = '', base) {
  const links = new Set();
  const regex = /\bhref\s*=\s*[\"\']([^\"\']+)[\"\']/gi;
  let match;
  while ((match = regex.exec(html))) {
    const href = decodeEntities(match[1]).trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(href)) continue;
    try { links.add(new URL(href, base).toString()); } catch {}
  }
  return [...links];
}

export function isRelevant(urlLike, title = '', text = '', config) {
  const url = new URL(urlLike, config.base_url);
  if ((config.crawl.direct_path_prefixes || []).some((prefix) => url.pathname.startsWith(prefix))) return true;
  const terms = config.crawl.relevance_terms || [];
  if (!terms.length) return true;
  const haystack = `${title}\n${text.slice(0, 200000)}`.toLowerCase();
  return terms.some((term) => haystack.includes(String(term).toLowerCase()));
}

export function classifySource(urlLike, config) {
  const path = new URL(urlLike, config.base_url).pathname;
  for (const rule of config.classification_rules || []) {
    if (path.startsWith(rule.match) || path.includes(rule.match)) return rule.class;
  }
  return config.default_source_class || 'external-interface-reference';
}

export function semanticSignals(title = '', text = '', config = {}) {
  const haystack = `${title}\n${text}`.toLowerCase();
  return Object.entries(config.semantic_signal_terms || {})
    .filter(([, terms]) => (terms || []).some((term) => haystack.includes(String(term).toLowerCase())))
    .map(([key]) => key);
}

export function parseRobots(text = '') {
  const rules = [];
  let applies = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === 'user-agent') applies = value === '*';
    if (applies && (field === 'allow' || field === 'disallow') && value) rules.push({ type: field, path: value });
  }
  return rules;
}

export function robotsAllows(urlLike, rules = []) {
  const url = new URL(urlLike);
  const target = url.pathname + url.search;
  const matches = rules.filter((rule) => target.startsWith(rule.path));
  if (!matches.length) return true;
  const longest = Math.max(...matches.map((rule) => rule.path.length));
  const strongest = matches.filter((rule) => rule.path.length === longest);
  return strongest.some((rule) => rule.type === 'allow') || strongest.every((rule) => rule.type !== 'disallow');
}

async function discoverSitemaps(config, headers, rules) {
  const pages = new Set();
  const queue = COMMON_SITEMAPS.map((path) => new URL(path, config.base_url).toString());
  const seen = new Set();
  while (queue.length && seen.size < 100) {
    const url = queue.shift();
    if (seen.has(url) || !robotsAllows(url, rules)) continue;
    seen.add(url);
    try {
      const response = await fetch(url, { headers, redirect: 'follow' });
      if (!response.ok) continue;
      const body = await response.text();
      for (const match of body.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
        const loc = decodeEntities(match[1]).replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
        if (/\.xml(?:\?|$)/i.test(loc)) queue.push(loc);
        else pages.add(loc);
      }
    } catch {}
  }
  return [...pages];
}

function parseArgs(argv) {
  const args = { config: null, out: null, maxPages: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--max-pages') args.maxPages = Number(argv[++i]);
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  if (!args.config) throw new Error('--config is required');
  return args;
}

function validateConfig(config) {
  for (const key of ['corpus_id', 'base_url', 'entry_url', 'crawl', 'output']) {
    if (!config[key]) throw new Error(`Missing required config field: ${key}`);
  }
  if (!Array.isArray(config.seed_urls) || !config.seed_urls.length) throw new Error('seed_urls must contain at least one URL');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(await readFile(args.config, 'utf8'));
  validateConfig(config);

  if (args.dryRun) {
    console.log(JSON.stringify({
      schema: config.schema,
      corpus_id: config.corpus_id,
      base_url: config.base_url,
      seed_count: config.seed_urls.length,
      storage_mode: config.storage_mode,
      copyright_policy: config.copyright_policy
    }, null, 2));
    return;
  }

  const out = args.out || config.output.default_directory;
  const maxPages = args.maxPages || config.crawl.max_pages;
  const headers = {
    'user-agent': config.crawl.user_agent,
    accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.1'
  };

  let robotsText = '';
  if (config.crawl.respect_robots) {
    try {
      const response = await fetch(new URL('/robots.txt', config.base_url), { headers, redirect: 'follow' });
      if (response.ok) robotsText = await response.text();
    } catch {}
  }
  const rules = parseRobots(robotsText);
  const sitemapUrls = config.crawl.discover_sitemaps ? await discoverSitemaps(config, headers, rules) : [];
  const seeds = new Set([...config.seed_urls, ...sitemapUrls]);

  await mkdir(out, { recursive: true });
  const root = new URL(config.base_url);
  const visited = new Set();
  const relevant = [];
  const graph = [];
  const failures = [];
  const queue = [...seeds].map((url) => ({ url, depth: 0, from: 'seed-or-sitemap' }));
  const sourcePrefix = String(config.corpus_id).replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  while (queue.length && visited.size < maxPages) {
    const entry = queue.shift();
    let url;
    try { url = canonicalizeUrl(entry.url, config.base_url, config.crawl.drop_query_parameters || []); } catch { continue; }
    if (visited.has(url)) continue;
    const parsed = new URL(url);
    if (config.crawl.same_origin_only && parsed.origin !== root.origin) continue;
    if ((config.crawl.deny_path_prefixes || []).some((prefix) => parsed.pathname.startsWith(prefix))) continue;
    if (!robotsAllows(url, rules)) continue;
    if (entry.depth > config.crawl.max_depth) continue;
    visited.add(url);
    await wait(config.crawl.delay_ms);

    try {
      const response = await fetch(url, { headers, redirect: 'follow' });
      if (!response.ok) {
        failures.push({ url, status: response.status });
        continue;
      }
      const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!['text/html', 'application/xhtml+xml'].includes(type)) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      const html = bytes.toString('utf8');
      const title = htmlTitle(html);
      const text = stripHtml(html);
      const finalUrl = canonicalizeUrl(response.url || url, config.base_url, config.crawl.drop_query_parameters || []);
      const canonical = canonicalLink(html, finalUrl) || finalUrl;
      const links = extractLinks(html, canonical)
        .map((link) => {
          try { return canonicalizeUrl(link, config.base_url, config.crawl.drop_query_parameters || []); } catch { return null; }
        })
        .filter(Boolean)
        .filter((link) => new URL(link).origin === root.origin);

      if (!isRelevant(canonical, title, text, config)) continue;

      const sourceHash = hash(bytes);
      const sourceId = `${sourcePrefix}:${sourceHash.slice(0, 20)}`;
      relevant.push({
        source_id: sourceId,
        url: finalUrl,
        canonical_url: canonical,
        title,
        published: meta(html, 'article:published_time') || meta(html, 'date'),
        modified: meta(html, 'article:modified_time') || meta(html, 'last-modified'),
        fetched_at: new Date().toISOString(),
        content_type: type,
        source_hash: sourceHash,
        text_hash: hash(text),
        content_length: bytes.length,
        word_count: text ? text.split(/\s+/).filter(Boolean).length : 0,
        source_class: classifySource(canonical, config),
        semantic_signals: semanticSignals(title, text, config),
        discovered_from: entry.from
      });
      graph.push({ source_id: sourceId, url: canonical, outgoing_internal_urls: links });

      if (config.crawl.follow_internal_links_from_relevant_pages) {
        for (const link of links) queue.push({ url: link, depth: entry.depth + 1, from: sourceId });
      }
    } catch (error) {
      failures.push({ url, error: error?.message || String(error) });
    }
  }

  const report = {
    schema: 'arcsweep.external-site-crawl-report/v0.1',
    corpus_id: config.corpus_id,
    completed_at: new Date().toISOString(),
    scope_mode: config.scope_mode,
    storage_mode: config.storage_mode,
    sitemap_url_count: sitemapUrls.length,
    visited_count: visited.size,
    relevant_source_count: relevant.length,
    failure_count: failures.length,
    failures,
    robots_txt_retrieved: Boolean(robotsText),
    raw_content_persisted: false,
    copyrighted_images_persisted: false,
    truncated_by_max_pages: visited.size >= maxPages
  };

  await writeFile(join(out, config.output.source_index), JSON.stringify(relevant, null, 2));
  await writeFile(join(out, config.output.link_graph), JSON.stringify(graph, null, 2));
  await writeFile(join(out, config.output.crawl_report), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
