import React, { useEffect, useMemo, useRef, useState } from 'react';
import BrushPanel from './BrushPanel.jsx';
import ColorPanel from './ColorPanel.jsx';
import GlyphCanvas from './GlyphCanvas.jsx';
import LayerPanel from './LayerPanel.jsx';
import TextPanel, { makeTextLayer } from './TextPanel.jsx';
import {
  brushRuntime,
  downloadText,
  makeBrushLibrary,
  makeGlyph,
  makeId,
  recordRecentBrush,
  safeFileName,
} from './glyphStudioModel.js';
import {
  BRUSH_STORAGE_KEY,
  COLOUR_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  glyphToSvg,
  importProjectText,
  loadLocalJson,
  makeColourState,
  normaliseGlyph,
  normaliseProject,
  projectReceipt,
  saveLocalJson,
} from './glyphStudioIO.js';

const PANELS = [
  ['glyph', 'Glyph'],
  ['brush', 'Brushes'],
  ['colour', 'Colour'],
  ['layers', 'Layers'],
  ['text', 'Text'],
];

function clone(value) {
  return structuredClone(value);
}

function dispatchStudioEvent(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function coerceExistingSetting(currentValue, nextValue) {
  if (typeof currentValue === 'number') {
    const numeric = Number(nextValue);
    if (!Number.isFinite(numeric)) throw new Error('Numeric brush setting requires a finite number.');
    return numeric;
  }
  if (typeof currentValue === 'boolean') return Boolean(nextValue);
  if (typeof currentValue === 'string') return String(nextValue);
  if (currentValue === null && (nextValue === null || ['string', 'number', 'boolean'].includes(typeof nextValue))) return nextValue;
  throw new Error('This brush setting type is not remotely mutable.');
}

function GlyphInventory({ project, onSelect, onAdd, onDuplicate, onDelete }) {
  return (
    <aside className="glyph-inventory" aria-label="Glyph inventory">
      <div className="panel-heading compact">
        <div><span>Character set</span><h2>Glyphs</h2></div>
        <button onClick={onAdd} title="Add glyph">＋</button>
      </div>
      <div className="glyph-records">
        {project.glyphs.map((glyph) => (
          <button key={glyph.id} className={glyph.id === project.activeGlyphId ? 'active' : ''} onClick={() => onSelect(glyph.id)}>
            <strong>{glyph.character || '◇'}</strong>
            <span>{glyph.name}<small>U+{glyph.codepoint}</small></span>
          </button>
        ))}
      </div>
      <div className="inventory-actions">
        <button onClick={onDuplicate}>Duplicate</button>
        <button className="danger" onClick={onDelete} disabled={project.glyphs.length <= 1}>Delete</button>
      </div>
    </aside>
  );
}

function GlyphMetadataPanel({ glyph, onChangeGlyph, onAddText, onFontForge }) {
  function patch(patchValue) {
    onChangeGlyph({ ...glyph, ...patchValue });
  }

  return (
    <section className="glyph-metadata-panel" aria-label="Glyph metadata">
      <div className="panel-heading"><div><span>Character record</span><h2>Glyph</h2></div><button onClick={onAddText}>Add Text</button></div>
      <label className="field-label">Name<input value={glyph.name} onChange={(event) => patch({ name: event.target.value })} /></label>
      <div className="field-pair">
        <label className="field-label">Character<input value={glyph.character} maxLength={4} onChange={(event) => patch({ character: event.target.value })} /></label>
        <label className="field-label">Codepoint<input value={glyph.codepoint} onChange={(event) => patch({ codepoint: event.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6) })} /></label>
      </div>
      <div className="metric-grid">
        <label>Advance width<input type="number" min="0" max="4000" value={glyph.advanceWidth} onChange={(event) => patch({ advanceWidth: Number(event.target.value) })} /></label>
        <label>Left bearing<input type="number" min="-1000" max="2000" value={glyph.leftBearing} onChange={(event) => patch({ leftBearing: Number(event.target.value) })} /></label>
        <label>Right bearing<input type="number" min="-1000" max="2000" value={glyph.rightBearing} onChange={(event) => patch({ rightBearing: Number(event.target.value) })} /></label>
      </div>
      <label className="field-label">Notes<textarea value={glyph.notes} onChange={(event) => patch({ notes: event.target.value })} /></label>
      <button className="wide-action" onClick={onFontForge}>Prepare FontForge Job</button>
      <p className="panel-footnote">Metrics and codepoint metadata are recorded now. Font compilation remains a separate local worker with explicit validation receipts.</p>
    </section>
  );
}

export default function GlyphStudio() {
  const projectImportRef = useRef(null);
  const [project, setProject] = useState(() => normaliseProject(loadLocalJson(PROJECT_STORAGE_KEY, null)));
  const [library, setLibrary] = useState(() => loadLocalJson(BRUSH_STORAGE_KEY, makeBrushLibrary()));
  const [colourState, setColourState] = useState(() => loadLocalJson(COLOUR_STORAGE_KEY, makeColourState()));
  const [fontLibrary, setFontLibrary] = useState([]);
  const [panel, setPanel] = useState('glyph');
  const [guides, setGuides] = useState({ grid: true, metrics: true, axes: false });
  const [status, setStatus] = useState('Glyph Studio foundation awake. Project is stored locally in this browser.');
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const liveStateRef = useRef(null);

  const activeGlyph = useMemo(
    () => project.glyphs.find((glyph) => glyph.id === project.activeGlyphId) || project.glyphs[0],
    [project],
  );
  const activeLayer = activeGlyph.layers.find((layer) => layer.id === activeGlyph.activeLayerId) || activeGlyph.layers[0];
  const activeBrush = library.brushes.find((brush) => brush.id === library.activeBrushId) || library.brushes[0];
  liveStateRef.current = { project, library, colourState, activeGlyph, activeLayer, activeBrush };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveLocalJson(PROJECT_STORAGE_KEY, project);
      saveLocalJson(BRUSH_STORAGE_KEY, library);
      saveLocalJson(COLOUR_STORAGE_KEY, colourState);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [project, library, colourState]);

  useEffect(() => {
    const previous = globalThis.__starwellGlyphStudioBridge;
    const bridge = Object.freeze({
      schema: 'starwell.glyph-studio-bridge/v1',
      surface: 'glyph-studio',
      snapshot() {
        const live = liveStateRef.current;
        const glyph = live?.activeGlyph;
        const layer = live?.activeLayer;
        const brush = live?.activeBrush;
        return clone({
          schema: 'starwell.glyph-studio-snapshot/v1',
          project: {
            id: live?.project?.id || null,
            name: live?.project?.name || null,
            glyph_count: live?.project?.glyphs?.length || 0,
          },
          active_glyph: glyph ? {
            id: glyph.id,
            name: glyph.name,
            character: glyph.character,
            codepoint: glyph.codepoint,
            stroke_count: glyph.strokes?.length || 0,
          } : null,
          active_layer: layer ? { id: layer.id, name: layer.name, kind: layer.kind, locked: Boolean(layer.locked) } : null,
          active_brush: brush ? { id: brush.id, name: brush.name, modified_at: brush.modifiedAt || null } : null,
          brush_runtime: brush ? brushRuntime(brush) : null,
          available_brushes: (live?.library?.brushes || []).map((item) => ({ id: item.id, name: item.name, pinned: Boolean(item.pinned) })),
          colour_profile: live?.colourState?.profile || null,
        });
      },
      selectBrush(brushId) {
        const id = String(brushId || '').trim();
        const live = liveStateRef.current;
        if (!live?.library?.brushes?.some((brush) => brush.id === id)) throw new Error(`Unknown Glyph Studio brush: ${id || 'missing'}`);
        setLibrary((current) => recordRecentBrush(current, id));
        setStatus(`Brush selected through ArcSweep OS: ${live.library.brushes.find((brush) => brush.id === id)?.name || id}.`);
        dispatchStudioEvent('starwell:glyph-brush-selected', { schema: 'starwell.glyph-brush-selected/v1', brush_id: id, selected_at: new Date().toISOString() });
        return { schema: 'starwell.glyph-brush-selection/v1', selected_brush_id: id };
      },
      patchBrushSetting({ brush_id, group, setting, value } = {}) {
        const brushId = String(brush_id || '').trim();
        const groupName = String(group || '').trim();
        const settingName = String(setting || '').trim();
        const live = liveStateRef.current;
        const brush = live?.library?.brushes?.find((item) => item.id === brushId);
        if (!brush) throw new Error(`Unknown Glyph Studio brush: ${brushId || 'missing'}`);
        const groupValue = brush.attributes?.[groupName];
        if (!groupValue || typeof groupValue !== 'object') throw new Error(`Unknown brush attribute group: ${groupName || 'missing'}`);
        if (!Object.prototype.hasOwnProperty.call(groupValue, settingName)) throw new Error(`Unknown brush setting: ${groupName}.${settingName}`);
        const nextValue = coerceExistingSetting(groupValue[settingName], value);
        setLibrary((current) => ({
          ...current,
          brushes: current.brushes.map((item) => item.id === brushId
            ? {
                ...item,
                attributes: {
                  ...item.attributes,
                  [groupName]: { ...item.attributes[groupName], [settingName]: nextValue },
                },
                modifiedAt: new Date().toISOString(),
              }
            : item),
        }));
        setStatus(`Brush setting changed through the Steward gate: ${groupName}.${settingName}.`);
        dispatchStudioEvent('starwell:glyph-brush-setting-changed', {
          schema: 'starwell.glyph-brush-setting-changed/v1',
          brush_id: brushId,
          group: groupName,
          setting: settingName,
          changed_at: new Date().toISOString(),
        });
        return { schema: 'starwell.glyph-brush-setting-change/v1', brush_id: brushId, group: groupName, setting: settingName, applied: true };
      },
    });
    globalThis.__starwellGlyphStudioBridge = bridge;
    dispatchStudioEvent('starwell:glyph-studio-bridge-ready', { schema: bridge.schema, surface: bridge.surface });
    return () => {
      if (globalThis.__starwellGlyphStudioBridge === bridge) {
        if (previous === undefined) delete globalThis.__starwellGlyphStudioBridge;
        else globalThis.__starwellGlyphStudioBridge = previous;
      }
    };
  }, []);

  function commitProject(nextProject, message = 'Project updated.') {
    setUndoStack((stack) => [...stack.slice(-39), clone(project)]);
    setRedoStack([]);
    setProject(normaliseProject({ ...nextProject, updatedAt: new Date().toISOString() }));
    setStatus(message);
  }

  function changeGlyph(nextGlyph, message = 'Glyph updated.') {
    commitProject({
      ...project,
      glyphs: project.glyphs.map((glyph) => glyph.id === nextGlyph.id ? normaliseGlyph(nextGlyph) : glyph),
    }, message);
  }

  function undo() {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((stack) => [...stack, clone(project)]);
    setUndoStack((stack) => stack.slice(0, -1));
    setProject(normaliseProject(previous));
    setStatus('Undid the last project change.');
  }

  function redo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((stack) => [...stack, clone(project)]);
    setRedoStack((stack) => stack.slice(0, -1));
    setProject(normaliseProject(next));
    setStatus('Redid the project change.');
  }

  function addGlyph() {
    const glyph = normaliseGlyph(makeGlyph(`Glyph ${project.glyphs.length + 1}`, '◇'));
    glyph.id = makeId('glyph');
    const nextCodepoint = 0xe000 + project.glyphs.length;
    glyph.codepoint = nextCodepoint.toString(16).toUpperCase();
    commitProject({ ...project, glyphs: [...project.glyphs, glyph], activeGlyphId: glyph.id }, 'New glyph record created.');
  }

  function duplicateGlyph() {
    const copy = clone(activeGlyph);
    copy.id = makeId('glyph');
    copy.name = `${activeGlyph.name} Copy`;
    const layerMap = new Map();
    copy.layers = copy.layers.map((layer) => {
      const id = makeId('layer');
      layerMap.set(layer.id, id);
      return { ...layer, id, maskOf: layer.maskOf ? layerMap.get(layer.maskOf) || null : null };
    });
    copy.activeLayerId = layerMap.get(activeGlyph.activeLayerId) || copy.layers[0].id;
    copy.strokes = copy.strokes.map((stroke) => ({ ...stroke, id: makeId('stroke'), layerId: layerMap.get(stroke.layerId) || copy.activeLayerId }));
    commitProject({ ...project, glyphs: [...project.glyphs, copy], activeGlyphId: copy.id }, 'Glyph duplicated.');
  }

  function deleteGlyph() {
    if (project.glyphs.length <= 1) return;
    const glyphs = project.glyphs.filter((glyph) => glyph.id !== activeGlyph.id);
    commitProject({ ...project, glyphs, activeGlyphId: glyphs[0].id }, 'Glyph deleted.');
  }

  function addTextLayer() {
    const layer = makeTextLayer();
    changeGlyph({ ...activeGlyph, layers: [...activeGlyph.layers, layer], activeLayerId: layer.id }, 'Editable text layer added.');
    setPanel('text');
  }

  function changeTextLayer(nextLayer) {
    changeGlyph({
      ...activeGlyph,
      layers: activeGlyph.layers.map((layer) => layer.id === nextLayer.id ? nextLayer : layer),
    }, 'Text layer updated.');
  }

  function commitStroke(stroke) {
    changeGlyph({ ...activeGlyph, strokes: [...activeGlyph.strokes, stroke] }, `Stroke recorded from ${stroke.pointerType || 'pointer'} input.`);
    dispatchStudioEvent('starwell:glyph-stroke-committed', {
      schema: 'starwell.glyph-stroke-receipt/v1',
      stroke_id: stroke.id,
      glyph_id: activeGlyph.id,
      layer_id: stroke.layerId,
      brush_id: stroke.brushId,
      pointer_type: stroke.pointerType || 'pointer',
      point_count: stroke.points?.length || 0,
      committed_at: new Date().toISOString(),
    });
  }

  function applyColour(colour) {
    if (activeLayer?.kind === 'text' && activeLayer.text) {
      changeTextLayer({ ...activeLayer, text: { ...activeLayer.text, colour } });
      return;
    }
    setLibrary((current) => ({
      ...current,
      brushes: current.brushes.map((brush) => brush.id === current.activeBrushId
        ? { ...brush, attributes: { ...brush.attributes, preview: { ...brush.attributes.preview, color: colour } } }
        : brush),
    }));
  }

  function exportProject() {
    const name = safeFileName(project.name, 'starwell-glyph-project');
    downloadText(`${name}.starwell-glyph.json`, 'application/json', JSON.stringify(project, null, 2));
    downloadText(`${name}.receipt.json`, 'application/json', JSON.stringify(projectReceipt(project, library, colourState), null, 2));
    setStatus('Project and export receipt downloaded.');
  }

  function exportSvg() {
    downloadText(`${safeFileName(activeGlyph.name, 'glyph')}.svg`, 'image/svg+xml', glyphToSvg(activeGlyph, colourState.profile));
    setStatus('Active glyph exported as editable SVG with STARWELL metadata.');
  }

  async function importProject(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const next = importProjectText(await file.text());
      setUndoStack((stack) => [...stack.slice(-39), clone(project)]);
      setRedoStack([]);
      setProject(next);
      setStatus(`${file.name} imported as a STARWELL glyph project.`);
    } catch (error) {
      setStatus(`Import rejected: ${error.message}`);
    }
  }

  function prepareFontForge() {
    const vectorLayers = activeGlyph.layers.filter((layer) => layer.kind === 'vector' && layer.visible && !layer.private);
    const artOnly = activeGlyph.layers.filter((layer) => layer.kind !== 'vector' || layer.private || layer.blendMode !== 'normal');
    const job = {
      schemaVersion: 'starwell.fontforge.job.v0.1',
      status: 'prepared-not-run',
      glyph: {
        id: activeGlyph.id,
        name: activeGlyph.name,
        character: activeGlyph.character,
        codepoint: activeGlyph.codepoint,
        advanceWidth: activeGlyph.advanceWidth,
        leftBearing: activeGlyph.leftBearing,
        rightBearing: activeGlyph.rightBearing,
      },
      svgFile: `${safeFileName(activeGlyph.name)}.svg`,
      eligibleVectorLayers: vectorLayers.map((layer) => layer.id),
      excludedArtLayers: artOnly.map((layer) => ({ id: layer.id, kind: layer.kind, reason: 'requires tracing, flattening, or explicit exclusion review' })),
      worker: { status: 'not-installed', executable: null },
      createdAt: new Date().toISOString(),
    };
    downloadText(`${safeFileName(activeGlyph.name)}.fontforge-job.json`, 'application/json', JSON.stringify(job, null, 2));
    setStatus('FontForge job declaration prepared. No font was compiled because the local worker is not installed yet.');
  }

  function panelContents() {
    if (panel === 'brush') return <BrushPanel library={library} onChangeLibrary={setLibrary} />;
    if (panel === 'colour') return <ColorPanel colourState={colourState} onChangeColourState={setColourState} onApplyColour={applyColour} />;
    if (panel === 'layers') return <LayerPanel glyph={activeGlyph} onChangeGlyph={(glyph) => changeGlyph(glyph, 'Layer stack updated.')} />;
    if (panel === 'text') return (
      <TextPanel
        layer={activeLayer}
        fontLibrary={fontLibrary}
        onChangeLayer={changeTextLayer}
        onChangeFontLibrary={setFontLibrary}
        onRasterize={() => setStatus('Rasterization is held until the raster surface and reversible history record are implemented.')}
      />
    );
    return <GlyphMetadataPanel glyph={activeGlyph} onChangeGlyph={changeGlyph} onAddText={addTextLayer} onFontForge={prepareFontForge} />;
  }

  return (
    <main className="glyph-studio-shell">
      <header className="studio-topbar">
        <div className="brand-block"><span>STARWELL Creative Foundry</span><h1>Glyph Studio</h1></div>
        <label className="project-name">Project<input value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value, updatedAt: new Date().toISOString() })} /></label>
        <div className="top-actions">
          <button onClick={undo} disabled={!undoStack.length}>Undo</button>
          <button onClick={redo} disabled={!redoStack.length}>Redo</button>
          <button onClick={() => projectImportRef.current?.click()}>Import</button>
          <input ref={projectImportRef} type="file" hidden accept=".json,.starwell-glyph.json" onChange={importProject} />
          <button onClick={exportProject}>Export Project</button>
          <button onClick={exportSvg}>Export SVG</button>
        </div>
      </header>

      <div className="studio-layout">
        <GlyphInventory
          project={project}
          onSelect={(activeGlyphId) => setProject({ ...project, activeGlyphId })}
          onAdd={addGlyph}
          onDuplicate={duplicateGlyph}
          onDelete={deleteGlyph}
        />

        <section className="canvas-column">
          <div className="canvas-toolbar">
            <div className="guide-toggles">
              {Object.entries(guides).map(([name, enabled]) => <button key={name} className={enabled ? 'pressed' : ''} onClick={() => setGuides({ ...guides, [name]: !enabled })}>{name}</button>)}
            </div>
            <div className="canvas-context">
              <span>{activeBrush.name}</span>
              <span>{activeLayer.name}</span>
              <span>{activeGlyph.strokes.length} strokes</span>
            </div>
          </div>
          <GlyphCanvas glyph={activeGlyph} activeLayer={activeLayer} activeBrush={activeBrush} guides={guides} onCommitStroke={commitStroke} />
          <div className="studio-status" aria-live="polite"><strong>Status</strong><span>{status}</span><small>Local-first preview · iPad Pointer Events enabled · ArcSweep OS organ bridge live · FontForge compilation not yet connected</small></div>
        </section>

        <aside className="inspector-column">
          <nav className="inspector-tabs" aria-label="Studio panels">
            {PANELS.map(([id, label]) => <button key={id} className={panel === id ? 'pressed' : ''} onClick={() => setPanel(id)}>{label}</button>)}
          </nav>
          <div className="inspector-scroll">{panelContents()}</div>
        </aside>
      </div>
    </main>
  );
}