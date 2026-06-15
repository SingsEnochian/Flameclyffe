import { DEEP_HUD } from './lib/deepHudContract.js';
import {
  DEEP_HUD_SOCKET_STATUS,
  collectHudSocketReport,
  formatHudSocketReport,
} from './lib/deepHudSocketInvariant.js';

const LOG_PREFIX = '[DEEP HUD socket]';

let observer = null;
let updateTimer = 0;
let lastStatusLine = '';

function emitReport(report) {
  document.documentElement.dataset[DEEP_HUD.data.socketStatus] = report.status;
  document.dispatchEvent(new CustomEvent(DEEP_HUD.events.socketStatus, {
    detail: report,
  }));
}

function logReport(report, statusLine) {
  if (statusLine === lastStatusLine) return;
  lastStatusLine = statusLine;

  if (report.status === DEEP_HUD_SOCKET_STATUS.healthy || report.status === DEEP_HUD_SOCKET_STATUS.noPanels) {
    console.info(LOG_PREFIX, statusLine, report);
    return;
  }

  console.warn(LOG_PREFIX, statusLine, report);
}

function runDiagnostics() {
  const report = collectHudSocketReport(document);
  const statusLine = formatHudSocketReport(report);
  emitReport(report);
  logReport(report, statusLine);
}

function scheduleDiagnostics() {
  if (updateTimer) return;
  updateTimer = window.setTimeout(() => {
    updateTimer = 0;
    runDiagnostics();
  }, DEEP_HUD.updateThrottleMs);
}

function startDiagnostics() {
  runDiagnostics();
  document.addEventListener(DEEP_HUD.events.bounds, scheduleDiagnostics);

  const root = document.querySelector(DEEP_HUD.rootSelector) || document.body;
  observer = new MutationObserver(scheduleDiagnostics);
  observer.observe(root, { childList: true, subtree: true, attributes: true });
}

function stopDiagnostics() {
  document.removeEventListener(DEEP_HUD.events.bounds, scheduleDiagnostics);
  if (observer) observer.disconnect();
  if (updateTimer) window.clearTimeout(updateTimer);
}

window.addEventListener('pagehide', stopDiagnostics, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDiagnostics, { once: true });
} else {
  startDiagnostics();
}
