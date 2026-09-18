export const MAGIC_BOOK_BINDING_SCHEMA = 'arcsweep.magic-book-binding/v0.1';
export const MAGIC_BOOK_RECEIPT_SCHEMA = 'arcsweep.magic-book-receipt/v0.1';
export const MAGIC_BOOK_BINDING_KEY = 'hearthgate.arcsweep.magic-book.binding.v0.1';
export const MAGIC_BOOK_RECEIPTS_KEY = 'hearthgate.arcsweep.magic-book.receipts.v0.1';

export const MAGIC_BOOK_PAGES = Object.freeze([
  Object.freeze({ id: 'threshold', label: 'Threshold', glyph: '⌂', kind: 'binding' }),
  Object.freeze({ id: 'glyph-forge', label: 'Glyph Forge', glyph: 'ᚴ', kind: 'instrument' }),
  Object.freeze({ id: 'receipts', label: 'Receipts', glyph: '⌁', kind: 'archive' }),
]);

const text = (value, max = 240) => String(value ?? '').trim().slice(0, max);
const clone = (value) => value == null ? value : structuredClone(value);

export function pageById(pageId) {
  return MAGIC_BOOK_PAGES.find((page) => page.id === pageId) || MAGIC_BOOK_PAGES[0];
}

export function normaliseMagicBookBinding(input = {}) {
  const page = pageById(input.active_page_id || input.activePageId);
  return Object.freeze({
    schema: MAGIC_BOOK_BINDING_SCHEMA,
    version: '0.1',
    active_page_id: page.id,
    active_world_id: text(input.active_world_id || input.activeWorldId) || null,
    active_room: text(input.active_room || input.activeRoom) || 'portal',
    return_room: text(input.return_room || input.returnRoom) || text(input.active_room || input.activeRoom) || 'portal',
    open: input.open === true,
    reduced_motion: input.reduced_motion === true || input.reducedMotion === true,
    last_opened_at: input.last_opened_at || input.lastOpenedAt || null,
    last_turned_at: input.last_turned_at || input.lastTurnedAt || null,
  });
}

export function createMagicBookReceipt({
  kind,
  pageId = null,
  worldId = null,
  room = null,
  detail = {},
  createdAt = new Date().toISOString(),
  receiptId = null,
} = {}) {
  const receiptKind = text(kind);
  if (!receiptKind) throw new Error('MAGIC_BOOK: receipt kind is required');
  return Object.freeze({
    schema: MAGIC_BOOK_RECEIPT_SCHEMA,
    receipt_id: receiptId || `magic-book:${receiptKind}:${createdAt}:${Math.random().toString(36).slice(2, 8)}`,
    kind: receiptKind,
    page_id: pageId ? pageById(pageId).id : null,
    world_id: text(worldId) || null,
    room: text(room) || null,
    detail: Object.freeze(clone(detail || {})),
    created_at: createdAt,
  });
}

export function appendMagicBookReceipt(receipts = [], receipt, limit = 48) {
  if (receipt?.schema !== MAGIC_BOOK_RECEIPT_SCHEMA) throw new Error('MAGIC_BOOK: valid receipt required');
  return Object.freeze([...receipts.map(clone), clone(receipt)].slice(-Math.max(1, Number(limit) || 48)));
}

export function turnMagicBookPage(binding, nextPageId, {
  worldId = binding?.active_world_id || null,
  room = binding?.active_room || 'portal',
  turnedAt = new Date().toISOString(),
} = {}) {
  const current = normaliseMagicBookBinding(binding);
  const next = pageById(nextPageId);
  const previousIndex = MAGIC_BOOK_PAGES.findIndex((page) => page.id === current.active_page_id);
  const nextIndex = MAGIC_BOOK_PAGES.findIndex((page) => page.id === next.id);
  const direction = nextIndex >= previousIndex ? 'forward' : 'backward';
  const state = normaliseMagicBookBinding({
    ...current,
    active_page_id: next.id,
    active_world_id: worldId,
    active_room: room,
    last_turned_at: turnedAt,
  });
  return Object.freeze({
    state,
    direction,
    receipt: createMagicBookReceipt({
      kind: 'page-turn',
      pageId: next.id,
      worldId,
      room,
      createdAt: turnedAt,
      detail: { from_page_id: current.active_page_id, to_page_id: next.id, direction },
    }),
  });
}

export function openMagicBook(binding, {
  worldId = null,
  room = 'portal',
  reducedMotion = false,
  openedAt = new Date().toISOString(),
} = {}) {
  const prior = normaliseMagicBookBinding(binding);
  const state = normaliseMagicBookBinding({
    ...prior,
    open: true,
    active_world_id: worldId || prior.active_world_id,
    active_room: room,
    return_room: room,
    reduced_motion: reducedMotion,
    last_opened_at: openedAt,
  });
  return Object.freeze({
    state,
    receipt: createMagicBookReceipt({
      kind: 'book-open',
      pageId: state.active_page_id,
      worldId: state.active_world_id,
      room,
      createdAt: openedAt,
      detail: { return_room: state.return_room, reduced_motion: reducedMotion },
    }),
  });
}

export function closeMagicBook(binding, { closedAt = new Date().toISOString() } = {}) {
  const current = normaliseMagicBookBinding(binding);
  const state = normaliseMagicBookBinding({ ...current, open: false });
  return Object.freeze({
    state,
    receipt: createMagicBookReceipt({
      kind: 'book-close',
      pageId: state.active_page_id,
      worldId: state.active_world_id,
      room: state.active_room,
      createdAt: closedAt,
      detail: { return_room: state.return_room },
    }),
  });
}

export function magicBookPageState(binding, { receiptCount = 0, glyph = null, brush = null } = {}) {
  const state = normaliseMagicBookBinding(binding);
  return Object.freeze({
    schema: 'arcsweep.magic-book-page-state/v0.1',
    page: pageById(state.active_page_id),
    binding: state,
    receipt_count: Math.max(0, Number(receiptCount) || 0),
    glyph: glyph ? clone(glyph) : null,
    brush: brush ? clone(brush) : null,
  });
}
