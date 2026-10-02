const STORAGE_KEY = 'hearthweave.agent-workspace-spatial/v0.1';
const MIN_WIDTH = 981;

function readPreference() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return value?.enabled !== false;
  } catch {
    return true;
  }
}

let enabled = readPreference();

function writePreference() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled })); } catch {}
}

function roleSet(card) {
  return new Set([...card.querySelectorAll('.badge:not(.state)')].map((node) => node.textContent.trim()).filter(Boolean));
}

function sharedRole(a, b) {
  const left = roleSet(a);
  return [...roleSet(b)].some((role) => left.has(role));
}

function pointFor(index, total, selected) {
  if (selected) return { x: 50, y: 50, scale: 1.12 };
  const outerCount = Math.min(8, Math.max(5, Math.ceil(total * .58)));
  const outerIndex = index < outerCount ? index : null;
  if (outerIndex !== null) {
    const angle = (-Math.PI / 2) + (outerIndex / outerCount) * Math.PI * 2;
    return {
      x: 50 + Math.cos(angle) * 39,
      y: 50 + Math.sin(angle) * 38,
      scale: .94,
    };
  }
  const innerCount = Math.max(1, total - outerCount);
  const innerIndex = index - outerCount;
  const angle = (-Math.PI / 2) + .46 + (innerIndex / innerCount) * Math.PI * 2;
  return {
    x: 50 + Math.cos(angle) * 23,
    y: 50 + Math.sin(angle) * 22,
    scale: .84,
  };
}

function makeSvg() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('spatial-threads');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

function layoutField(grid) {
  const cards = [...grid.querySelectorAll(':scope > .agent-card')];
  if (!cards.length) return;

  grid.querySelector('.spatial-threads')?.remove();
  grid.querySelector('.spatial-field-note')?.remove();

  const selected = cards.find((card) => card.classList.contains('active')) || cards[0];
  const orbiters = cards.filter((card) => card !== selected);
  const positions = new Map([[selected, { x: 50, y: 50, scale: 1.12 }]]);

  orbiters.forEach((card, index) => {
    positions.set(card, pointFor(index, orbiters.length, false));
  });

  for (const [card, point] of positions) {
    card.style.setProperty('--spatial-x', point.x + '%');
    card.style.setProperty('--spatial-y', point.y + '%');
    card.style.setProperty('--spatial-scale', String(point.scale));
  }

  const svg = makeSvg();
  const selectedPoint = positions.get(selected);
  for (const card of orbiters) {
    const point = positions.get(card);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('spatial-thread');
    line.setAttribute('x1', String(selectedPoint.x));
    line.setAttribute('y1', String(selectedPoint.y));
    line.setAttribute('x2', String(point.x));
    line.setAttribute('y2', String(point.y));
    line.dataset.related = String(sharedRole(selected, card));
    svg.append(line);
  }
  grid.prepend(svg);

  const note = document.createElement('div');
  note.className = 'spatial-field-note';
  note.textContent = 'Selected presence anchors the field · brighter threads share at least one visible role';
  grid.append(note);
}

function setMode(grid) {
  const shouldUseSpatial = enabled && innerWidth >= MIN_WIDTH;
  grid.classList.toggle('spatial-field', shouldUseSpatial);
  document.body.dataset.spatialMode = String(shouldUseSpatial);
  if (shouldUseSpatial) layoutField(grid);
  else {
    grid.querySelector('.spatial-threads')?.remove();
    grid.querySelector('.spatial-field-note')?.remove();
    for (const card of grid.querySelectorAll(':scope > .agent-card')) {
      card.style.removeProperty('--spatial-x');
      card.style.removeProperty('--spatial-y');
      card.style.removeProperty('--spatial-scale');
    }
  }
}

function insertToggle(grid) {
  const previous = grid.previousElementSibling;
  if (!previous?.classList?.contains('section-heading')) return;
  if (previous.querySelector('[data-spatial-mode-toggle]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'spatial-mode-toggle';
  button.dataset.spatialModeToggle = 'true';
  button.setAttribute('aria-pressed', String(enabled));
  button.innerHTML = '<span class="spatial-mode-icon" aria-hidden="true">⌾</span><span>Spatial field</span>';
  button.addEventListener('click', () => {
    enabled = !enabled;
    writePreference();
    button.setAttribute('aria-pressed', String(enabled));
    setMode(grid);
    globalThis.HouseSensoryFeedback?.emit?.('select');
  });
  previous.append(button);
}

function enhance() {
  const grids = [...document.querySelectorAll('.agent-grid')];
  for (const grid of grids) {
    // Only the full registry becomes a spatial field. Pinned-desk grids stay compact.
    const heading = grid.previousElementSibling?.textContent || '';
    if (!/visible|agent registry|agents/i.test(heading)) continue;
    insertToggle(grid);
    setMode(grid);
  }
}

let queued = false;
const observer = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    enhance();
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });

addEventListener('resize', () => {
  for (const grid of document.querySelectorAll('.agent-grid.spatial-field, .agent-grid')) {
    const heading = grid.previousElementSibling?.textContent || '';
    if (/visible|agent registry|agents/i.test(heading)) setMode(grid);
  }
}, { passive: true });

document.addEventListener('click', (event) => {
  const card = event.target.closest?.('.agent-grid.spatial-field .agent-card');
  if (!card) return;
  queueMicrotask(() => {
    const grid = card.closest('.agent-grid');
    if (grid?.classList.contains('spatial-field')) layoutField(grid);
  });
});

queueMicrotask(enhance);

globalThis.HouseSpatialPolish = Object.freeze({
  get enabled() { return enabled; },
  setEnabled(value) {
    enabled = Boolean(value);
    writePreference();
    enhance();
    return enabled;
  },
  relayout() { enhance(); },
});
