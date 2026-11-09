import type { PresentationStore } from './wayglass-presentation-delivery.cjs';
/** Host provisions an absolute private directory outside checkout/web roots. */
export function createPresentationStore(options: {directory: string}): PresentationStore;
