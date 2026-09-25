export const CODEX_PAGE_CONTEXT_SCHEMA = 'hearthweave.codex-page-context/v0.1';

function uniq(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function visiblePageNodes(root) {
  if (!root?.querySelectorAll) return [];
  const selectors = [
    '[data-magic-book-left]',
    '[data-magic-book-right]',
    '[data-codex-page]',
    '.magic-book-page',
    '.magic-book-page-content',
  ];
  return [...root.querySelectorAll(selectors.join(','))].filter((node) => !node.hidden && node.getAttribute?.('aria-hidden') !== 'true');
}

export function readCodexPageContext(root) {
  const pages = visiblePageNodes(root);
  const text = pages.map((node) => node.textContent || '').join(' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
  const traceIds = [];
  const aspectIds = [];
  const tags = [];
  const projectIds = [];

  for (const node of pages) {
    const data = node.dataset || {};
    if (data.traceId || data.codexTrace) traceIds.push(data.traceId || data.codexTrace);
    if (data.aspectId || data.codexAspect) aspectIds.push(data.aspectId || data.codexAspect);
    if (data.tags) tags.push(...String(data.tags).split(/[\s,]+/));
    if (data.projectId || data.project) projectIds.push(data.projectId || data.project);
  }

  return Object.freeze({
    schema: CODEX_PAGE_CONTEXT_SCHEMA,
    traceId: uniq(traceIds)[0] || null,
    projectId: uniq(projectIds)[0] || null,
    aspectIds: Object.freeze(uniq(aspectIds)),
    tags: Object.freeze(uniq(tags)),
    title: root?.querySelector?.('[data-magic-book-title], [data-codex-title]')?.textContent || '',
    text,
  });
}
