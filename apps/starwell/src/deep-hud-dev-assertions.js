import { DEEP_HUD } from './lib/deepHudContract.js';
import { DEEP_HUD_DEBUG } from './lib/deepHudDebugContract.js';
import {
  DEEP_HUD_SOCKET_STATUS,
  collectHudSocketReport,
  formatHudSocketReport,
} from './lib/deepHudSocketInvariant.js';

const ASSERTION_DELAY_MS = 240;
const MAX_PENDING_BOUNDS_CHECKS = 8;
const LOG_PREFIX = `${DEEP_HUD_DEBUG.socketLogPrefix} assertion`;

let assertionTimer = 0;
let pendingBoundsChecks = 0;
let lastAssertionLine = '';

function getPanelBoundsState(panelReport) {
  return panelReport.boundsState || 'pending';
}

function getAssertionFailures(report) {
  const failures = [];

  if (report.panelCount === 0) {
    failures.push('no observer panels mounted');
  }

  if (report.orphanLayerCount > 0) {
    failures.push(`${report.orphanLayerCount} orphan HUD socket(s)`);
  }

  if (report.missingSocketCount > 0) {
    failures.push(`${report.missingSocketCount} panel(s) missing HUD socket`);
  }

  if (report.duplicateSocketCount > 0) {
    failures.push(`${report.duplicateSocketCount} panel(s) with duplicate HUD sockets`);
  }

  const pendingBoundsCount = report.panelReports.filter((panel) => getPanelBoundsState(panel) !== DEEP_HUD.state.ready).length;
  if (pendingBoundsCount > 0) {
    failures.push(`${pendingBoundsCount} panel(s) without ready bounds`);
  }

  return failures;
}

function shouldKeepWaitingForBounds(report, failures) {
  if (!failures.some((failure) => failure.includes('ready bounds'))) return false;
  if (pendingBoundsChecks >= MAX_PENDING_BOUNDS_CHECKS) return false;
  return report.status === DEEP_HUD_SOCKET_STATUS.healthy;
}

function runAssertion() {
  const report = collectHudSocketReport(document);
  const failures = getAssertionFailures(report);
  const statusLine = formatHudSocketReport(report);
  const assertionLine = failures.length > 0
    ? `${statusLine} failures=${failures.join('; ')}`
    : `${statusLine} assertions=healthy`;

  if (shouldKeepWaitingForBounds(report, failures)) {
    pendingBoundsChecks += 1;
    scheduleAssertion();
    return report;
  }

  if (assertionLine === lastAssertionLine) return report;
  lastAssertionLine = assertionLine;

  if (failures.length === 0) {
    console.info(LOG_PREFIX, assertionLine, report);
    return report;
  }

  console.warn(LOG_PREFIX, assertionLine, report);
  return report;
}

function scheduleAssertion() {
  if (assertionTimer) return;
  assertionTimer = window.setTimeout(() => {
    assertionTimer = 0;
    runAssertion();
  }, ASSERTION_DELAY_MS);
}

function handleBoundsReady() {
  pendingBoundsChecks = 0;
  scheduleAssertion();
}

function startAssertions() {
  scheduleAssertion();
  document.addEventListener(DEEP_HUD.events.socketStatus, scheduleAssertion);
  document.addEventListener(DEEP_HUD.events.bounds, handleBoundsReady);
}

function stopAssertions() {
  document.removeEventListener(DEEP_HUD.events.socketStatus, scheduleAssertion);
  document.removeEventListener(DEEP_HUD.events.bounds, handleBoundsReady);
  if (assertionTimer) window.clearTimeout(assertionTimer);
}

window.addEventListener('pagehide', stopAssertions, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startAssertions, { once: true });
} else {
  startAssertions();
}
