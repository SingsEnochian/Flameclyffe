import {
  getHudLayerSelector,
  getHudReadoutSelector,
  getHudStageSelector,
  getObserverPanelSelector,
} from './deepHudContract.js';

export function getHudMeasureSelectors() {
  return {
    root: null,
    shell: getObserverPanelSelector(),
    stage: getHudStageSelector(),
    readout: getHudReadoutSelector(),
    hudLayer: getHudLayerSelector(),
  };
}

export const HUD_MEASURE_SELECTORS = Object.freeze(getHudMeasureSelectors());
