import { getEmptyHudLayerProps } from '../../lib/deepHudContract.js';

export function DeepHudSocket({ owner } = {}) {
  return <div {...getEmptyHudLayerProps(owner)} />;
}
