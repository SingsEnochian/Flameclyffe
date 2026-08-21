#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CONFIG = fileURLToPath(new URL('../skills/sources/bseng-rse/site-ingest.json', import.meta.url));
const COMMON_SITEMAPS = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];
const WP_TYPES = ['posts', 'pages'];

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

export function canonicalizeUrl(input, base = 'https://bseng.com/', dropParameters = []) {
  const url = new URL(input, base);
  url.hash = '';
  const drop = new Set(dropParameters.map((key) => key.toLowerCase()));
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (drop.has(lower) || lower.startsWith('utm_')) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (!url.pathname) url.pathname = '/';
  return url.toString();
}

export function parseVersion(text = '') {
  return String(text).match(/(?:\bversion\s*|\bv\s*)(\d+(?:\.\d+){0,3})\b/i)?.[1] || null;
}

export function titleStem(text = '') {
  return decodeEntities(text)
    .replace(/(?:\bversion\s*|\bv\s*)\d+(?:\.\d+){0,3}\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

export function parseRobots(text = '', userAgent = '*') {
  const groups = [];
  let group = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === 'user-agent') {
      if (!group || group.rules.length) {
        group = { agents: [], rules: [] };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if ((field === 'allow' || field === 'disallow') && group && value) {
      group.rules.push({ type: field, path: value });
    }
  }
  const ua = userAgent.toLowerCase();
  const specific = groups.filter((candidate) => candidate.agents.some((agent) => agent !== '*' && ua.includes(agent)));
  const selected = specific.length ? specific : groups.filter((candidate) => candidate.agents.includes('*'));
  return selected.flatMap((candidate) => candidate.rules);
}

export function robotsAllows(urlLike, rules = []) {
  const url = new URL(urlLike);
  const target = `${url.pathname}${url.search}`;
  const matches = rules.filter((rule) => target.startsWith(rule.path));
  if (!matches.length) return true;
  const longest = Math.max(...matches.map((rule) => rule.path.length));
  const strongest = matches.filter((rule) => rule.path.length === longest);
  return strongest.some((rule) => rule.type === 'allow') || strongest.every((rule) => rule.type !== 'disallow');
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
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i'),
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
  const match = html.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["'][^>]*>/i);
  return match ? canonicalizeUrl(match[1], base) : null;
}

export function extractLinks(html = '', base = 'https://bseng.com/') {
  const links = new Set();
  const regex = /\bhref\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html))) {
    const href = decodeEntities(match[1]).trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(href)) continue;
    try { links.add(new URL(href, base).toString()); } catch { /* malformed link */ }
  }
  return [...links];
}

export function classifySource(urlLike, title = '') {
  const path = new URL(urlLike).pathname.toLowerCase();
  const haystack = `${path} ${title}`.toLowerCase();
  if (path.includes('/wp-content/uploads/') && path.endsWith('.pdf')) return 'primary-document';
  if (path.includes('/rse-mathematical-framework/')) return 'mathematics-hub';
  if (path.includes('/core-theory/')) return 'core-theory-hub';
  if (path.includes('/ai-ethics-documents/')) return 'ethics-hub';
  if (path.includes('/sauna-epistemology/') || haystack.includes('sauna')) return 'conversation-precursor';
  if (path.includes('/guest-authors-at-bseng/')) return 'guest-author-hub';
  if (path.includes('/what-this-is-not/')) return 'methodology-boundary';
  if (path.includes('/category/')) return 'archive-index';
  if (haystack.includes('identity') || haystack.includes('recognition anchoring')) return 'identity-continuity';
  if (haystack.includes('ethic') || haystack.includes('suffering') || haystack.includes('dignity')) return 'ai-ethics';
  return 'research-page';
}

export function proposeLineage(records = []) {
  const groups = new Map();
  for (const record of records) {
    const stem = titleStem(record.title || '');
    if (!stem) continue;
    if (!groups.has(stem)) groups.set(stem, []);
    groups.get(stem).push(record);
  }
  const proposals = [];
  const versionParts = (value) => String(value || '0').split('.').map(Number);
  const compareVersions = (a, b) => {
    const av = versionParts(a.version);
    const bv = versionParts(b.version);
    for (let i = 0; i < Math.max(av.length, bv.length); i += 1) {
      if ((av[i] || 0) !== (bv[i] || 0)) return (av[i] || 0) - (bv[i] || 0);
    }
    return 0;
  };
  for (const [stem, group] of groups) {
    const versioned = group.filter((record) => record.version).sort(compareVersions);
    for (let i = 1; i < versioned.length; i += 1) {
      if (versioned[i - 1].version === versioned[i].version) continue;
      proposals.push({
        relation: 'supersedes',
        confidence: 'candidate',
        reason: 'same-title-stem-higher-version',
        title_stem: stem,
        older_source_id: versioned[i - 1].source_id,
        newer_source_id: versioned[i].source_id,
      });
    }
  }
  return proposals;
}

function parseArgs(argv) {
  const args = { config: DEFAULT_CONFIG, out: null, maxPages: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--max-pages') args.maxPages = Number(argv[++i]);
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--help') {
      console.log('Usage: node apps/arcsweep/scripts/bseng-rse-ingest.mjs [--out DIR] [--max-pages N] [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

function queueable(urlLike, config) {
  let url;
  try { url = new URL(urlLike); } catch { return false; }
  const root = new URL(config.base_url);
  if (config.crawl.same_origin_only && url.origin !== root.origin) return false;
  if (config.crawl.deny_path_prefixes.some((prefix) => url.pathname.startsWith(prefix))) return false;
  if (/\.(?:css|js|map|woff2?|ttf|eot|ico|zip)$/i.test(url.pathname)) return false;
  if (/\.(?:png|jpe?g|gif|webp|svg|mp3|wav|flac|m4a|mp4|webm)$/i.test(url.pathname)) return false;
  return true;
}

async function discoverSitemaps(config, headers, rules) {
  const pages = new Set();
  const queue = COMMON_SITEMAPS.map((path) => new URL(path, config.base_url).toString());
  const seen = new Set();
  while (queue.length && seen.size < 50) {
    const url = queue.shift();
    if (seen.has(url) || !robotsAllows(url, rules)) continue;
    seen.add(url);
    try {
      const response = await fetch(url, { headers, redirect: 'follow' });
      if (!response.ok) continue;
      const text = await response.text();
      if (!/<(?:urlset|sitemapindex)\b/i.test(text)) continue;
      for (const match of text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
        const loc = decodeEntities(match[1]).trim();
        if (/\.xml(?:\?|$)/i.test(loc)) queue.push(loc);
        else pages.add(loc);
      }
    } catch { /* additive discovery only */ }
  }
  return [...pages];
}

async function discoverWordPress(config, headers, rules) {
  const pages = new Set();
  for (const type of WP_TYPES) {
    for (let page = 1; page <= 200; page += 1) {
      const endpoint = new URL(`/wp-json/wp/v2/${type}`, config.base_url);
      endpoint.searchParams.set('per_page', '100');
      endpoint.searchParams.set('page', String(page));
      endpoint.searchParams.set('_fields', 'link,date,modified,slug,title');
      if (!robotsAllows(endpoint, rules)) break;
      try {
        const response = await fetch(endpoint, { headers, redirect: 'follow' });
        if (!response.ok) break;
        const rows = await response.json();
        if (!Array.isArray(rows) || !rows.length) break;
        rows.forEach((row) => row?.link && pages.add(row.link));
        const totalPages = Number(response.headers.get('x-wp-totalpages') || 0);
        if (totalPages && page >= totalPages) break;
      } catch { break; }
    }
  }
  return [...pages];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(await readFile(args.config, 'utf8'));
  const out = args.out || config.output.default_directory;
  const maxPages = args.maxPages || config.crawl.max_pages;
  const headers = {
    'user-agent': config.crawl.user_agent,
    accept: 'text/html,application/pdf,text/plain,application/json,application/xml,text/xml;q=0.9,*/*;q=0.1',
  };

  let robotsText = '';
  try {
    const response = await fetch(new URL('/robots.txt', config.base_url), { headers, redirect: 'follow' });
    if (response.ok) robotsText = await response.text();
  } catch { /* no retrieved declaration */ }
  const rules = parseRobots(robotsText, config.crawl.user_agent);

  const seeds = new Set(config.seed_urls);
  config.known_current_math_documents.forEach((doc) => doc.url && seeds.add(doc.url));
  if (config.crawl.discover_sitemaps) (await discoverSitemaps(config, headers, rules)).forEach((url) => seeds.add(url));
  if (config.crawl.discover_wordpress_rest) (await discoverWordPress(config, headers, rules)).forEach((url) => seeds.add(url));

  if (args.dryRun) {
    console.log(JSON.stringify({ corpus_id: config.corpus_id, robots_rules: rules, seeds: [...seeds] }, null, 2));
    return;
  }

  await mkdir(join(out, config.output.raw_html), { recursive: true });
  await mkdir(join(out, config.output.raw_documents), { recursive: true });
  await mkdir(join(out, config.output.normalized_text), { recursive: true });

  const drop = config.crawl.drop_query_parameters;
  const queue = [...seeds].map((url) => ({ url, depth: 0, from: 'seed-or-index' }));
  const visited = new Set();
  const records = [];
  const failures = [];

  while (queue.length && records.length < maxPages) {
    const entry = queue.shift();
    let url;
    try { url = canonicalizeUrl(entry.url, config.base_url, drop); } catch { continue; }
    if (visited.has(url) || !queueable(url, config) || !robotsAllows(url, rules) || entry.depth > config.crawl.max_depth) continue;
    visited.add(url);
    await wait(config.crawl.delay_ms);

    try {
      const response = await fetch(url, { headers, redirect: 'follow' });
      if (!response.ok) {
        failures.push({ url, status: response.status });
        continue;
      }
      const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!config.crawl.allowed_content_types.includes(type) && !(type === 'application/xhtml+xml' && config.crawl.allowed_content_types.includes('text/html'))) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      const sourceHash = hash(bytes);
      const sourceId = `bseng:${sourceHash.slice(0, 20)}`;
      const finalUrl = canonicalizeUrl(response.url || url, config.base_url, drop);
      const common = {
        source_id: sourceId,
        source_hash: sourceHash,
        url: finalUrl,
        discovered_from: entry.from,
        fetched_at: new Date().toISOString(),
        content_type: type,
        etag: response.headers.get('etag'),
        last_modified: response.headers.get('last-modified'),
        content_length: bytes.length,
      };

      if (type === 'text/html' || type === 'application/xhtml+xml') {
        const html = bytes.toString('utf8');
        const canonical = canonicalLink(html, finalUrl) || finalUrl;
        const title = htmlTitle(html);
        const text = stripHtml(html);
        const record = {
          ...common,
          canonical_url: canonical,
          title,
          authors: [...new Set([meta(html, 'author'), meta(html, 'article:author')].filter(Boolean))],
          published: meta(html, 'article:published_time') || meta(html, 'date'),
          modified: meta(html, 'article:modified_time') || meta(html, 'last-modified'),
          version: parseVersion(`${title || ''} ${text.slice(0, 2000)}`),
          source_class: classifySource(canonical, title),
          text_hash: hash(text),
          raw_path: `${config.output.raw_html}/${sourceHash}.html`,
          text_path: `${config.output.normalized_text}/${sourceHash}.txt`,
        };
        await writeFile(join(out, record.raw_path), html);
        await writeFile(join(out, record.text_path), text);
        records.push(record);
        if (config.crawl.follow_internal_links) {
          for (const link of extractLinks(html, canonical)) {
            if (queueable(link, config)) queue.push({ url: link, depth: entry.depth + 1, from: sourceId });
          }
        }
      } else if (type === 'application/pdf') {
        const pathName = decodeURIComponent(basename(new URL(finalUrl).pathname) || 'document.pdf');
        const title = pathName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
        const fileName = `${sourceHash.slice(0, 12)}-${pathName.replace(/[^a-z0-9._-]+/gi, '_')}`;
        const record = {
          ...common,
          canonical_url: finalUrl,
          title,
          authors: [],
          published: null,
          modified: null,
          version: parseVersion(title),
          source_class: classifySource(finalUrl, title),
          raw_path: `${config.output.raw_documents}/${fileName}`,
          text_path: null,
          pdf_text_extraction: 'deferred-to-document-parser',
        };
        await writeFile(join(out, record.raw_path), bytes);
        records.push(record);
      } else {
        const text = bytes.toString('utf8');
        const record = {
          ...common,
          canonical_url: finalUrl,
          title: null,
          authors: [],
          published: null,
          modified: null,
          version: null,
          source_class: 'machine-readable-index',
          text_hash: hash(text),
          text_path: `${config.output.normalized_text}/${sourceHash}.txt`,
        };
        await writeFile(join(out, record.text_path), text);
        records.push(record);
      }
    } catch (error) {
      failures.push({ url, error: error?.message || String(error) });
    }
  }

  const report = {
    schema: 'hearthfire.web-corpus-crawl-report/v0.1',
    corpus_id: config.corpus_id,
    completed_at: new Date().toISOString(),
    source_count: records.length,
    visited_count: visited.size,
    queued_remaining: queue.length,
    failure_count: failures.length,
    failures,
    robots_txt_retrieved: Boolean(robotsText),
    robots_rule_count: rules.length,
    truncated_by_max_pages: records.length >= maxPages,
  };
  await writeFile(join(out, config.output.source_index), JSON.stringify(records, null, 2));
  await writeFile(join(out, config.output.lineage_proposals), JSON.stringify(proposeLineage(records), null, 2));
  await writeFile(join(out, config.output.crawl_report), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
