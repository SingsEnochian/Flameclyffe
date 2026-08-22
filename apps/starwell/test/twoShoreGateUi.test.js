import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('web Arcsweep and Bifröst load the live two-shore gate through the shared stop bridge', async () => {
  const [bridge, ui, engine, horizon, vite] = await Promise.all([
    read('../src/premaq-shokz-feather-stop-bridge.js'),
    read('../src/two-shore-gate-ui.js'),
    read('../src/two-shore-premaq-gate.js'),
    read('../src/two-shore-gate-horizon.js'),
    read('../vite.config.js'),
  ]);

  assert.match(bridge, /import ['"]\.\/two-shore-gate-ui\.js['"]/);
  assert.match(ui, /EARTH PRIME SHORE ⇄ TARGET-WORLD SHORE/);
  assert.match(ui, /LIVE GATE TEST · 2025/);
  assert.match(ui, /Run 2025→2035/);
  assert.match(ui, /DEEP and Groundwire receipts are present/);
  assert.match(ui, /live\.live_ready/);
  assert.match(ui, /data-feather-stop/);
  assert.match(ui, /\/starwell\/deep-groundwire-mobius\.html/);
  assert.match(ui, /buildEfficientFullHorizonGatePlan/);
  assert.doesNotMatch(ui, /navigator\.vibrate/);

  assert.match(engine, /GATE_BASE_CYCLES = 369/);
  assert.match(engine, /GATE_EXTENSION_CYCLES = Object\.freeze\(\[3, 6, 9\]\)/);
  assert.match(engine, /GATE_LOCKED_TONE_AXES = Object\.freeze\(\['P', 'R', 'E', 'M', 'A', 'Q'\]\)/);
  assert.match(engine, /GATE_COHERENCE_AXIS = 'C'/);
  assert.match(engine, /TWO_SHORE_GATE_LINEAGE_MISMATCH/);
  assert.match(engine, /audible_pitch_expanded_by_year: false/);
  assert.match(engine, /physical_claim: false/);

  assert.match(horizon, /memory_strategy: 'execute one year fully, retain checkpoints and labeled layers, feed final release into next year'/);
  assert.match(horizon, /year_feeds_next_year: true/);
  assert.match(vite, /resolve\(REPO_ROOT, 'starwell\/deep-observer'\)/);
  assert.match(vite, /recursive: true/);
});

test('gate UI does not call a degraded calibration LIVE', async () => {
  const engine = await read('../src/two-shore-premaq-gate.js');
  assert.match(engine, /status: sources\.deep && sources\.hardware \? \(unknowns\.length \? 'PARTIAL' : 'LIVE'\) : 'DEGRADED'/);
  assert.match(engine, /live_ready: Boolean\(deepPacket && groundwireSnapshot\)/);
  assert.match(engine, /Unsupported or ungranted fields remain UNKNOWN/);
});
