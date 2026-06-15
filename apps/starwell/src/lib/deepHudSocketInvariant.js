import {
  DEEP_HUD,
  getHudLayerSelector,
  getObserverPanelSelector,
} from './deepHudContract.js';

export const DEEP_HUD_SOCKET_STATUS = Object.freeze({
  healthy: 'healthy',
  noPanels: 'no-panels',
  missingSocket: 'missing-socket',
  duplicateSocket: 'duplicate-socket',
  orphanSocket: 'orphan-socket',
});

function countValues(values) {
  return values.reduce((counts, value) => {
    const key = value || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function getSocketStatus({ panelReports, orphanLayerCount }) {
  if (panelReports.length === 0) return DEEP_HUD_SOCKET_STATUS.noPanels;
  if (orphanLayerCount > 0) return DEEP_HUD_SOCKET_STATUS.orphanSocket;
  if (panelReports.some((panel) => panel.layerCount > 1)) return DEEP_HUD_SOCKET_STATUS.duplicateSocket;
  if (panelReports.some((panel) => panel.layerCount === 0)) return DEEP_HUD_SOCKET_STATUS.missingSocket;
  return DEEP_HUD_SOCKET_STATUS.healthy;
}

export function collectHudSocketReport(root = document) {
  const panelSelector = getObserverPanelSelector();
  const layerSelector = getHudLayerSelector();
  const panels = Array.from(root.querySelectorAll(panelSelector));
  const panelLayerSet = new Set();

  const panelReports = panels.map((panel, index) => {
    const layers = Array.from(panel.querySelectorAll(`:scope > ${layerSelector}`));
    layers.forEach((layer) => panelLayerSet.add(layer));

    const owners = layers.map((layer) => layer.dataset[DEEP_HUD.data.layerOwner] || 'unknown');
    const states = layers.map((layer) => layer.dataset[DEEP_HUD.data.layer] || 'unknown');

    return {
      index,
      layerCount: layers.length,
      owners,
      states,
      boundsState: panel.dataset[DEEP_HUD.data.bounds] || 'pending',
      viewport: panel.dataset[DEEP_HUD.data.viewport] || 'unknown',
    };
  });

  const allLayers = Array.from(root.querySelectorAll(layerSelector));
  const orphanLayerCount = allLayers.filter((layer) => !panelLayerSet.has(layer)).length;
  const status = getSocketStatus({ panelReports, orphanLayerCount });

  return {
    status,
    panelCount: panelReports.length,
    layerCount: allLayers.length,
    orphanLayerCount,
    missingSocketCount: panelReports.filter((panel) => panel.layerCount === 0).length,
    duplicateSocketCount: panelReports.filter((panel) => panel.layerCount > 1).length,
    ownerCounts: countValues(panelReports.flatMap((panel) => panel.owners)),
    stateCounts: countValues(panelReports.flatMap((panel) => panel.states)),
    panelReports,
  };
}

export function formatHudSocketReport(report) {
  return [
    `status=${report.status}`,
    `panels=${report.panelCount}`,
    `layers=${report.layerCount}`,
    `orphans=${report.orphanLayerCount}`,
    `missing=${report.missingSocketCount}`,
    `duplicates=${report.duplicateSocketCount}`,
  ].join(' ');
}
