function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeBySourceKey(baseItems = [], incomingItems = []) {
  const merged = new Map(baseItems.map((item) => [item.sourceKey, deepClone(item)]));
  for (const item of incomingItems) {
    if (!item?.sourceKey) continue;
    merged.set(item.sourceKey, {
      ...(merged.get(item.sourceKey) || {}),
      ...deepClone(item),
    });
  }
  return [...merged.values()];
}

export function mergeNotionFeed(baseBundle, feed) {
  if (!feed || feed.schemaVersion !== 'arcsweep.notion-feed/v1') return baseBundle;
  if (!feed.bundle || !Array.isArray(feed.bundle.worlds) || !Array.isArray(feed.bundle.documents)) return baseBundle;

  return Object.freeze({
    ...baseBundle,
    id: feed.bundle.id || baseBundle.id,
    version: feed.bundle.version || baseBundle.version,
    title: feed.bundle.title || baseBundle.title,
    source: feed.bundle.source || baseBundle.source,
    decisionDate: feed.bundle.decisionDate || baseBundle.decisionDate,
    defaultWorldSourceKey: feed.bundle.defaultWorldSourceKey || baseBundle.defaultWorldSourceKey,
    worlds: Object.freeze(mergeBySourceKey(baseBundle.worlds, feed.bundle.worlds)),
    documents: Object.freeze(mergeBySourceKey(baseBundle.documents, feed.bundle.documents)),
    notionFeed: Object.freeze({
      registryPageId: feed.registry?.pageId || null,
      registryUrl: feed.registry?.url || null,
      generatedAt: feed.generatedAt || null,
      mode: feed.mode || 'published-snapshot',
      authority: feed.authority || 'Notion',
    }),
  });
}

export async function loadNotionFeed(baseBundle, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return baseBundle;
  try {
    const response = await fetchImpl('./notion/arcsweep-feed.v0.1.json', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return baseBundle;
    return mergeNotionFeed(baseBundle, await response.json());
  } catch {
    return baseBundle;
  }
}
