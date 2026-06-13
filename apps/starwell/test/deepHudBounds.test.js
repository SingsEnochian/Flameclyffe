import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_HUD_SELECTORS,
  avoidRectsForDefaultPosition,
  getPanelZoneCandidates,
  makeRect,
  measureHudBounds,
  panelIntersectsAvoidRects,
  resolveHudElements,
} from '../src/lib/deepHudBounds.js';

function rectElement(rect, children = {}, matchingSelectors = []) {
  return {
    getBoundingClientRect() {
      return rect;
    },
    matches(selector) {
      return matchingSelectors.includes(selector);
    },
    querySelector(selector) {
      return children[selector] || null;
    },
  };
}

function panelFixture({ shellRect, stageRect, readoutRect }) {
  const stage = rectElement(stageRect, {}, [DEFAULT_HUD_SELECTORS.stage]);
  const readout = rectElement(readoutRect, {}, [DEFAULT_HUD_SELECTORS.readout]);
  const shell = rectElement(
    shellRect,
    {
      [DEFAULT_HUD_SELECTORS.stage]: stage,
      [DEFAULT_HUD_SELECTORS.readout]: readout,
    },
    [DEFAULT_HUD_SELECTORS.shell],
  );

  return { shell, stage, readout };
}

test('HUD element resolution recognises the supplied panel as its own shell', () => {
  const panel = panelFixture({
    shellRect: makeRect(100, 80, 640, 480),
    stageRect: makeRect(220, 140, 240, 240),
    readoutRect: makeRect(180, 400, 360, 80),
  });

  const elements = resolveHudElements(panel.shell);

  assert.equal(elements.shell, panel.shell);
  assert.equal(elements.stage, panel.stage);
  assert.equal(elements.readout, panel.readout);
});

test('HUD measurement stays scoped to the supplied panel', () => {
  const first = panelFixture({
    shellRect: makeRect(0, 0, 500, 400),
    stageRect: makeRect(40, 40, 180, 180),
    readoutRect: makeRect(40, 260, 300, 60),
  });
  const second = panelFixture({
    shellRect: makeRect(600, 100, 700, 520),
    stageRect: makeRect(760, 180, 260, 260),
    readoutRect: makeRect(720, 500, 420, 72),
  });
  const documentRoot = {
    querySelector(selector) {
      const firstPanelElements = {
        [DEFAULT_HUD_SELECTORS.shell]: first.shell,
        [DEFAULT_HUD_SELECTORS.stage]: first.stage,
        [DEFAULT_HUD_SELECTORS.readout]: first.readout,
      };
      return firstPanelElements[selector] || null;
    },
  };

  const bounds = measureHudBounds({
    root: documentRoot,
    shell: second.shell,
    viewport: { width: 1440, height: 900 },
  });

  assert.deepEqual(bounds.shellRect, makeRect(600, 100, 700, 520));
  assert.deepEqual(bounds.stageRect, makeRect(760, 180, 260, 260));
  assert.deepEqual(bounds.readoutRect, makeRect(720, 500, 420, 72));
});

test('HUD avoidance geometry includes both stage and readout', () => {
  const panel = panelFixture({
    shellRect: makeRect(50, 50, 800, 600),
    stageRect: makeRect(260, 120, 300, 300),
    readoutRect: makeRect(200, 470, 420, 90),
  });
  const extra = makeRect(700, 80, 80, 80);

  const bounds = measureHudBounds({
    root: panel.shell,
    shell: panel.shell,
    extraAvoidRects: [extra],
    viewport: { width: 1440, height: 900 },
  });

  assert.deepEqual(bounds.avoidRects, [
    makeRect(260, 120, 300, 300),
    makeRect(200, 470, 420, 90),
    extra,
  ]);
});

test('HUD fallback zones de-duplicate compact bottom rail before selecting a clear position', () => {
  const panelSize = { width: 160, height: 70 };
  const bounds = {
    viewportClass: 'compact',
    safeRect: makeRect(0, 0, 360, 500),
    avoidRects: [makeRect(80, 420, 200, 80)],
  };

  const candidates = getPanelZoneCandidates('status', bounds, 'bottom-rail');
  const position = avoidRectsForDefaultPosition('status', panelSize, bounds, 'bottom-rail');

  assert.deepEqual(candidates.slice(0, 4), ['bottom-rail', 'top-right', 'top-left', 'bottom-right']);
  assert.equal(position.zone, 'top-right');
  assert.equal(panelIntersectsAvoidRects(position, panelSize, bounds), false);
});

test('HUD fallback selection skips blocked explicit fallback entries', () => {
  const panelSize = { width: 200, height: 100 };
  const bounds = {
    viewportClass: 'wide',
    safeRect: makeRect(0, 0, 800, 600),
    avoidRects: [
      makeRect(0, 500, 240, 100),
      makeRect(0, 0, 240, 120),
    ],
  };

  const position = avoidRectsForDefaultPosition('status', panelSize, bounds, ['top-left', 'right-rail']);

  assert.equal(position.zone, 'right-rail');
  assert.equal(panelIntersectsAvoidRects(position, panelSize, bounds), false);
});
