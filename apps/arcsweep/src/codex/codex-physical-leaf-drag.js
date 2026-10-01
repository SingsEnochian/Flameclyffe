import { MAGIC_BOOK_PAGES, pageById } from '../magic-book-model.js';

export const CODEX_PHYSICAL_LEAF_DRAG_SCHEMA = 'hearthweave.codex-physical-leaf-drag/v0.1';
export const LEAF_DRAG_COMMIT_PROGRESS = 0.38;
export const LEAF_DRAG_FLICK_VELOCITY = 0.55;
export const LEAF_DRAG_MIN_TRAVEL_PX = 18;

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function leafTurnTarget(binding, direction = 'forward') {
  const current = pageById(binding?.active_page_id || binding?.activePageId);
  const index = MAGIC_BOOK_PAGES.findIndex((page) => page.id === current.id);
  const delta = direction === 'backward' ? -1 : 1;
  const nextIndex = Math.max(0, Math.min(MAGIC_BOOK_PAGES.length - 1, index + delta));
  if (nextIndex === index) return null;
  return MAGIC_BOOK_PAGES[nextIndex];
}

export function leafDragProgress({ startX = 0, currentX = 0, width = 1, direction = 'forward' } = {}) {
  const span = Math.max(1, Math.abs(Number(width) || 1));
  const distance = direction === 'backward'
    ? Number(currentX) - Number(startX)
    : Number(startX) - Number(currentX);
  return clamp01(distance / span);
}

export function leafDirectionalVelocity({ previousX = 0, currentX = 0, previousAt = 0, currentAt = 0, direction = 'forward' } = {}) {
  const elapsed = Math.max(1, Number(currentAt) - Number(previousAt));
  const distance = direction === 'backward'
    ? Number(currentX) - Number(previousX)
    : Number(previousX) - Number(currentX);
  return distance / elapsed;
}

export function shouldCommitLeafDrag({
  progress = 0,
  velocity = 0,
  travelPx = 0,
  progressThreshold = LEAF_DRAG_COMMIT_PROGRESS,
  velocityThreshold = LEAF_DRAG_FLICK_VELOCITY,
  minTravelPx = LEAF_DRAG_MIN_TRAVEL_PX,
} = {}) {
  const travelled = Math.abs(Number(travelPx) || 0);
  if (travelled < Math.max(0, Number(minTravelPx) || 0)) return false;
  return clamp01(progress) >= clamp01(progressThreshold)
    || Number(velocity) >= Math.max(0, Number(velocityThreshold) || 0);
}

export function physicalLeafDragSnapshot({ binding = {}, direction = 'forward', progress = 0, pointerType = 'pointer' } = {}) {
  const target = leafTurnTarget(binding, direction);
  return Object.freeze({
    schema: CODEX_PHYSICAL_LEAF_DRAG_SCHEMA,
    direction: direction === 'backward' ? 'backward' : 'forward',
    from_page_id: pageById(binding?.active_page_id || binding?.activePageId).id,
    to_page_id: target?.id || null,
    progress: clamp01(progress),
    pointer_type: String(pointerType || 'pointer'),
  });
}
