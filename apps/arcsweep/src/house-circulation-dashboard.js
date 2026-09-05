export const HOUSE_CIRCULATION_DASHBOARD_VERSION = 'arcsweep.house-circulation-dashboard/v1';

const LEDGERS = Object.freeze([
  ['runtime','Runtime Braid','house_runtime_events'],
  ['observer','Observer','observer_measurements'],
  ['deepTime','DEEPTime','arcsweep_deep_time_records'],
  ['math','PREMAQC / Math Spine','math_spine_packets'],
  ['feedback','Feedback','arcsweep_feedback_cycles'],
]);

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function circulationState(counts = {}) {
  const ledgers = LEDGERS.map(([key,label,store]) => Object.freeze({ key,label,store,count:count(counts[key]) }));
  const observed = ledgers.filter((row) => row.count !== null);
  const breathing = observed.filter((row) => row.count > 0);
  return Object.freeze({
    schema: HOUSE_CIRCULATION_DASHBOARD_VERSION,
    ledgers:Object.freeze(ledgers),
    observed_ledgers:observed.length,
    breathing_ledgers:breathing.length,
    circulation_proven:observed.length === ledgers.length && breathing.length === ledgers.length,
    rule:'Dark ledgers stay dark until durable evidence exists. No synthetic heartbeat.',
  });
}

export function renderCirculationDashboard(host, counts = {}) {
  if (!host) return null;
  const state = circulationState(counts);
  host.replaceChildren();
  const head = document.createElement('div');
  head.innerHTML = `<strong>House Circulation</strong><div class="muted">${state.circulation_proven ? 'Full circulation observed' : `${state.breathing_ledgers}/${state.ledgers.length} evidence vessels breathing`}</div>`;
  host.appendChild(head);
  for (const row of state.ledgers) {
    const line = document.createElement('div');
    line.className = 'muted';
    const glyph = row.count === null ? '◇' : row.count > 0 ? '◈' : '○';
    const value = row.count === null ? 'not observed' : `${row.count} durable row${row.count === 1 ? '' : 's'}`;
    line.textContent = `${glyph} ${row.label} · ${value}`;
    line.dataset.circulationLedger = row.key;
    host.appendChild(line);
  }
  const rule = document.createElement('small');
  rule.className = 'muted';
  rule.textContent = state.rule;
  host.appendChild(rule);
  return state;
}
