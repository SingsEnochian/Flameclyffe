import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BrushPanel from './components/glyph-studio/BrushPanel.jsx';
import { makeBrush, makeId, BRUSH_LIBRARY_SCHEMA } from './components/glyph-studio/glyphStudioModel.js';
import './components/glyph-studio/glyph-studio.css';
import './components/glyph-studio/glyph-studio-panels.css';
import ArcsweepShell from './shell/ArcsweepShell.jsx';

const FOUNDRY_STORAGE_KEY = 'starwell.brushFoundry.library.v0.1';

// Three material brushes with distinct character — the core of the Foundry
function makeFoundryLibrary() {
  const stonewood = makeBrush({
    name: 'Stonewood Ink',
    pinned: true,
    attributes: {
      ...makeBrush().attributes,
      strokePath: { spacing: 0.02, spacingJitter: 0, lateralJitter: 0, linearJitter: 0, fallOff: 0 },
      stabilization: { streamlineAmount: 0.42, streamlinePressure: 0.2, stabilizationAmount: 0.22, motionFiltering: 0, motionFilteringExpression: 0.5 },
      taper: { pressureStart: 0.1, pressureEnd: 0.22, touchStart: 0, touchEnd: 0.14, size: 0.72, opacity: 0.1 },
      properties: { size: 34, opacity: 0.92, minSize: 2, maxSize: 140, minOpacity: 0.05, maxOpacity: 1, smudgePull: 0.5, orientToScreen: false },
      materials: { metallic: 0, roughness: 0.78 },
      preview: { mode: 'stroke', size: 0.52, color: '#c8a876' },
      about: { author: 'STARWELL Brush Foundry', signature: '', notes: 'Stone material — dense, slow, geological patience. Primary terra-aeterna mark.', resetPoint: null },
    },
  });

  // Copper Reed — flowing, warm, medium pressure; reeds and rivers, copper tone
  const copperReed = makeBrush({
    id: makeId('brush'),
    name: 'Copper Reed',
    setId: 'set-foundation',
    pinned: true,
    modifiedAt: new Date().toISOString(),
    attributes: {
      ...makeBrush().attributes,
      strokePath: { spacing: 0.015, spacingJitter: 0.01, lateralJitter: 0.02, linearJitter: 0.01, fallOff: 0.08 },
      stabilization: { streamlineAmount: 0.28, streamlinePressure: 0.15, stabilizationAmount: 0.08, motionFiltering: 0, motionFilteringExpression: 0.4 },
      taper: { pressureStart: 0.22, pressureEnd: 0.38, touchStart: 0.05, touchEnd: 0.22, size: 0.58, opacity: 0.2 },
      shape: { sourceName: 'Round', scatter: 0.02, count: 1, countJitter: 0, rotation: 0.5, inputStyle: 'azimuth' },
      rendering: { mode: 'uniform-glaze', flow: 0.88, wetEdges: 0.12, burnedEdges: 0, },
      wetMix: { dilution: 0.12, charge: 0.62, attack: 0.48, pull: 0.08, grade: 0 },
      applePencil: { pressureSize: 0.78, pressureOpacity: 0.22, pressureFlow: 0.1, tiltAngle: 40, tiltSize: 0.06, tiltOpacity: 0, barrelRollRotation: 0.8 },
      properties: { size: 22, opacity: 0.84, minSize: 1, maxSize: 100, minOpacity: 0.04, maxOpacity: 1, smudgePull: 0.42, orientToScreen: false },
      materials: { metallic: 0.44, roughness: 0.34 },
      preview: { mode: 'stroke', size: 0.42, color: '#b87a3a' },
      about: { author: 'STARWELL Brush Foundry', signature: '', notes: 'Copper material — flowing, warm, conducting. The metal that carries signal and ages with character.', resetPoint: null },
    },
  });

  // Water Wash — expansive, diluted, diffuse; sea and tide, blue-grey
  const waterWash = makeBrush({
    id: makeId('brush'),
    name: 'Water Wash',
    setId: 'set-foundation',
    pinned: true,
    modifiedAt: new Date().toISOString(),
    attributes: {
      ...makeBrush().attributes,
      strokePath: { spacing: 0.025, spacingJitter: 0.008, lateralJitter: 0.06, linearJitter: 0.03, fallOff: 0.14 },
      stabilization: { streamlineAmount: 0.58, streamlinePressure: 0.3, stabilizationAmount: 0.12, motionFiltering: 0, motionFilteringExpression: 0.6 },
      taper: { pressureStart: 0.35, pressureEnd: 0.55, touchStart: 0.12, touchEnd: 0.38, size: 0.48, opacity: 0.38 },
      shape: { sourceName: 'Round', scatter: 0.06, count: 1, countJitter: 0, rotation: 1, inputStyle: 'velocity' },
      rendering: { mode: 'uniform-glaze', flow: 0.72, wetEdges: 0.28, burnedEdges: 0 },
      wetMix: { dilution: 0.62, charge: 0.38, attack: 0.28, pull: 0.18, grade: 0.08 },
      applePencil: { pressureSize: 0.62, pressureOpacity: 0.38, pressureFlow: 0.18, tiltAngle: 55, tiltSize: 0.12, tiltOpacity: 0.08, barrelRollRotation: 0.6 },
      properties: { size: 52, opacity: 0.52, minSize: 4, maxSize: 220, minOpacity: 0.02, maxOpacity: 0.88, smudgePull: 0.62, orientToScreen: false },
      materials: { metallic: 0, roughness: 0.12 },
      preview: { mode: 'stroke', size: 0.62, color: '#7a9eb4' },
      about: { author: 'STARWELL Brush Foundry', signature: '', notes: 'Water material — expansive, diluted, tidal breathing. The sea that shapes everything at the edges.', resetPoint: null },
    },
  });

  // Sea Stone — heavy, scattered, dark; stone worn smooth by water
  const seaStone = makeBrush({
    id: makeId('brush'),
    name: 'Sea Stone',
    setId: 'set-materials',
    pinned: true,
    modifiedAt: new Date().toISOString(),
    attributes: {
      ...makeBrush().attributes,
      strokePath: { spacing: 0.04, spacingJitter: 0.015, lateralJitter: 0.04, linearJitter: 0.02, fallOff: 0.04 },
      stabilization: { streamlineAmount: 0.18, streamlinePressure: 0.08, stabilizationAmount: 0.32, motionFiltering: 0, motionFilteringExpression: 0.3 },
      taper: { pressureStart: 0.06, pressureEnd: 0.1, touchStart: 0, touchEnd: 0.08, size: 0.88, opacity: 0.06 },
      shape: { sourceName: 'Round', scatter: 0.04, count: 2, countJitter: 0.2, rotation: 0.28, inputStyle: 'azimuth' },
      grain: { sourceName: 'Concrete', mode: 'moving', movement: 0.42, scale: 0.38, rotation: 0.1, depth: 0.62 },
      rendering: { mode: 'uniform-glaze', flow: 1, wetEdges: 0.04, burnedEdges: 0 },
      wetMix: { dilution: 0.04, charge: 0.82, attack: 0.72, pull: 0, grade: 0 },
      applePencil: { pressureSize: 0.88, pressureOpacity: 0.08, pressureFlow: 0, tiltAngle: 30, tiltSize: 0.18, tiltOpacity: 0, barrelRollRotation: 1 },
      properties: { size: 44, opacity: 0.98, minSize: 6, maxSize: 180, minOpacity: 0.08, maxOpacity: 1, smudgePull: 0.28, orientToScreen: false },
      materials: { metallic: 0, roughness: 0.98 },
      preview: { mode: 'stroke', size: 0.48, color: '#3a4a52' },
      about: { author: 'STARWELL Brush Foundry', signature: '', notes: 'Stone worn by water — heavy presence, textured, committed. Marks that do not apologise.', resetPoint: null },
    },
  });

  // Moon Graphite — light pencil marking, kept from the base library
  const moonGraphite = makeBrush({
    id: makeId('brush'),
    name: 'Moon Graphite',
    setId: 'set-materials',
    pinned: false,
    modifiedAt: new Date().toISOString(),
    attributes: {
      ...makeBrush().attributes,
      properties: { ...makeBrush().attributes.properties, size: 18, opacity: 0.64 },
      stabilization: { ...makeBrush().attributes.stabilization, streamlineAmount: 0.18 },
      materials: { metallic: 0, roughness: 0.62 },
      preview: { mode: 'stroke', size: 0.38, color: '#c8c3b7' },
      about: { author: 'STARWELL Brush Foundry', signature: '', notes: 'Graphite — light, lunar, the mark that precedes the mark.', resetPoint: null },
    },
  });

  return {
    schemaVersion: BRUSH_LIBRARY_SCHEMA,
    id: makeId('brush-library'),
    name: 'STARWELL Material Foundry',
    sets: [
      { id: 'set-recent', name: 'Recent', virtual: true },
      { id: 'set-pinned', name: 'Pinned', virtual: true },
      { id: 'set-foundation', name: 'Foundation', virtual: false },
      { id: 'set-materials', name: 'Materials', virtual: false },
    ],
    brushes: [stonewood, copperReed, waterWash, seaStone, moonGraphite],
    recentBrushIds: [stonewood.id, copperReed.id, waterWash.id],
    activeBrushId: stonewood.id,
    importReceipts: [],
  };
}

function loadFoundryLibrary() {
  try {
    const raw = localStorage.getItem(FOUNDRY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.schemaVersion === BRUSH_LIBRARY_SCHEMA && Array.isArray(parsed.brushes) && parsed.brushes.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  return makeFoundryLibrary();
}

function saveFoundryLibrary(library) {
  try { localStorage.setItem(FOUNDRY_STORAGE_KEY, JSON.stringify(library)); } catch { /* storage unavailable */ }
}

function BrushFoundry() {
  const [library, setLibrary] = useState(loadFoundryLibrary);

  useEffect(() => { saveFoundryLibrary(library); }, [library]);

  return (
    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', minHeight: 'calc(100vh - 64px)', background: 'var(--gs-bg, #0a0f0d)' }}>
      <div style={{ padding: '1rem 1.25rem .5rem', borderBottom: '1px solid rgba(114,204,166,.1)' }}>
        <p style={{ fontSize: '.66rem', letterSpacing: '.1em', color: '#3a5045', marginBottom: '.2rem' }}>ARCSWEEP · BRUSH FOUNDRY</p>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d7e4dc', margin: 0 }}>Brush Foundry</h1>
        <p style={{ fontSize: '.72rem', color: '#567060', margin: '.2rem 0 0' }}>
          Stone · Copper · Water · Sea Stone · Moon Graphite — material marks with distinct character.
          Brush editor lives in Glyph Forge. Foundry library is independent.
        </p>
      </div>
      <div style={{ padding: '1rem' }}>
        <BrushPanel library={library} onChangeLibrary={setLibrary} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <ArcsweepShell currentHref="/starwell/brush-foundry/" title="Brush Foundry">
    <BrushFoundry />
  </ArcsweepShell>,
);
