import React, { useMemo, useRef, useState } from 'react';
import {
  BRUSH_ATTRIBUTE_GROUPS,
  BRUSH_LIBRARY_SCHEMA,
  downloadText,
  importReceipt,
  makeBrush,
  makeId,
  recordRecentBrush,
  safeFileName,
} from './glyphStudioModel.js';

const GROUP_KEYS = {
  'Stroke Path': 'strokePath',
  Stabilization: 'stabilization',
  Taper: 'taper',
  Shape: 'shape',
  Grain: 'grain',
  Rendering: 'rendering',
  'Wet Mix': 'wetMix',
  'Color Dynamics': 'colorDynamics',
  Dynamics: 'dynamics',
  'Apple Pencil': 'applePencil',
  Properties: 'properties',
  Materials: 'materials',
  Preview: 'preview',
  'About this Brush': 'about',
};

const COMPATIBLE_EXTENSIONS = new Set(['.brush', '.brushset', '.brushlibrary', '.abr']);

function extensionOf(name = '') {
  return name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
}

function rangeFor(key, value) {
  if (key.toLowerCase().includes('angle')) return { min: 0, max: 180, step: 1 };
  if (key.toLowerCase().includes('size') && value > 1) return { min: 1, max: 300, step: 1 };
  if (key === 'count') return { min: 1, max: 16, step: 1 };
  if (key.toLowerCase().includes('rotation')) return { min: -1, max: 1, step: 0.01 };
  return { min: 0, max: 1, step: 0.01 };
}

function labelFor(key) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
}

function NumericSetting({ name, value, onChange }) {
  const range = rangeFor(name, value);
  return (
    <label className="range-field">
      <span>{labelFor(name)}<output>{Number(value).toFixed(range.step < 1 ? 2 : 0)}</output></span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function SettingField({ name, value, onChange }) {
  if (typeof value === 'number') return <NumericSetting name={name} value={value} onChange={onChange} />;
  if (typeof value === 'boolean') {
    return (
      <label className="toggle-field">
        <span>{labelFor(name)}</span>
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      </label>
    );
  }
  if (name.toLowerCase().includes('color') || name.toLowerCase().includes('colour')) {
    return (
      <label className="colour-row">
        <span>{labelFor(name)}</span>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }
  if (value === null) return <p className="empty-setting">No reset point has been saved yet.</p>;
  return (
    <label className="field-label">
      {labelFor(name)}
      <input value={String(value)} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function BrushPanel({ library, onChangeLibrary }) {
  const importRef = useRef(null);
  const [setId, setSetId] = useState('set-foundation');
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('Stroke Path');
  const [status, setStatus] = useState('STARWELL brush definitions are editable and local-first.');

  const activeBrush = library.brushes.find((brush) => brush.id === library.activeBrushId) || library.brushes[0];
  const visibleBrushes = useMemo(() => {
    let brushes = library.brushes;
    if (setId === 'set-recent') brushes = library.recentBrushIds.map((id) => library.brushes.find((brush) => brush.id === id)).filter(Boolean);
    else if (setId === 'set-pinned') brushes = brushes.filter((brush) => brush.pinned);
    else brushes = brushes.filter((brush) => brush.setId === setId);
    const needle = query.trim().toLowerCase();
    return needle ? brushes.filter((brush) => brush.name.toLowerCase().includes(needle)) : brushes;
  }, [library, query, setId]);

  function patchBrush(patch) {
    onChangeLibrary({
      ...library,
      brushes: library.brushes.map((brush) => brush.id === activeBrush.id
        ? { ...brush, ...patch, modifiedAt: new Date().toISOString() }
        : brush),
    });
  }

  function patchAttribute(attributeKey, setting, value) {
    patchBrush({
      attributes: {
        ...activeBrush.attributes,
        [attributeKey]: { ...activeBrush.attributes[attributeKey], [setting]: value },
      },
    });
  }

  function addBrush() {
    const targetSet = library.sets.find((set) => set.id === setId && !set.virtual)?.id || 'set-foundation';
    const brush = makeBrush({ id: makeId('brush'), name: `New Brush ${library.brushes.length + 1}`, setId: targetSet, pinned: false });
    onChangeLibrary(recordRecentBrush({ ...library, brushes: [...library.brushes, brush] }, brush.id));
  }

  function duplicateBrush() {
    const copy = structuredClone(activeBrush);
    copy.id = makeId('brush');
    copy.name = `${activeBrush.name} Copy`;
    copy.pinned = false;
    copy.modifiedAt = new Date().toISOString();
    onChangeLibrary(recordRecentBrush({ ...library, brushes: [...library.brushes, copy] }, copy.id));
  }

  function deleteBrush() {
    if (library.brushes.length <= 1) return;
    const brushes = library.brushes.filter((brush) => brush.id !== activeBrush.id);
    onChangeLibrary({
      ...library,
      brushes,
      activeBrushId: brushes[0].id,
      recentBrushIds: library.recentBrushIds.filter((id) => id !== activeBrush.id),
    });
  }

  function exportBrush() {
    downloadText(`${safeFileName(activeBrush.name)}.starwell-brush.json`, 'application/json', JSON.stringify({ schemaVersion: 'starwell.brush.v0.1', brush: activeBrush }, null, 2));
    setStatus(`Exported ${activeBrush.name} in STARWELL's documented JSON format.`);
  }

  function exportLibrary() {
    downloadText(`${safeFileName(library.name)}.starwell-brushlibrary.json`, 'application/json', JSON.stringify(library, null, 2));
    setStatus(`Exported ${library.name}.`);
  }

  async function importBrushFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    let next = structuredClone(library);
    const messages = [];

    for (const file of files) {
      const extension = extensionOf(file.name);
      if (COMPATIBLE_EXTENSIONS.has(extension)) {
        const detail = `${extension} recognised as a compatibility target; decoder adapter is not installed yet.`;
        next.importReceipts.push(importReceipt(file, 'held', detail));
        messages.push(`${file.name}: held for adapter`);
        continue;
      }
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed.schemaVersion === BRUSH_LIBRARY_SCHEMA && Array.isArray(parsed.brushes)) {
          const remapped = parsed.brushes.map((brush) => ({ ...brush, id: makeId('brush'), setId: 'set-foundation' }));
          next.brushes.push(...remapped);
          next.importReceipts.push(importReceipt(file, 'imported', `${remapped.length} brushes imported from STARWELL library JSON.`));
          messages.push(`${file.name}: ${remapped.length} brushes`);
        } else if (parsed.brush?.attributes) {
          const brush = { ...parsed.brush, id: makeId('brush'), setId: 'set-foundation' };
          next.brushes.push(brush);
          next.activeBrushId = brush.id;
          next.importReceipts.push(importReceipt(file, 'imported', 'One STARWELL brush imported.'));
          messages.push(`${file.name}: one brush`);
        } else {
          throw new Error('not a recognised STARWELL brush package');
        }
      } catch (error) {
        next.importReceipts.push(importReceipt(file, 'rejected', error.message));
        messages.push(`${file.name}: rejected`);
      }
    }
    onChangeLibrary(next);
    setStatus(messages.join(' · '));
  }

  const attributeKey = GROUP_KEYS[groupName];
  const settings = activeBrush.attributes[attributeKey] || {};

  return (
    <section className="brush-panel" aria-label="Brush Library and Brush Studio">
      <div className="panel-heading">
        <div><span>Mark-making</span><h2>Brush Library</h2></div>
        <div className="mini-actions">
          <button onClick={addBrush} title="New brush">＋</button>
          <button onClick={duplicateBrush} title="Duplicate brush">⧉</button>
          <button onClick={() => importRef.current?.click()} title="Import brushes">⇩</button>
          <input ref={importRef} type="file" multiple hidden accept=".json,.brush,.brushset,.brushlibrary,.abr" onChange={importBrushFiles} />
        </div>
      </div>

      <input className="panel-search" type="search" placeholder="Search brushes" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="brush-library-grid">
        <nav className="brush-sets" aria-label="Brush sets">
          {library.sets.map((set) => <button key={set.id} className={set.id === setId ? 'pressed' : ''} onClick={() => setSetId(set.id)}>{set.name}</button>)}
        </nav>
        <div className="brush-list">
          {visibleBrushes.map((brush) => (
            <button
              key={brush.id}
              className={`brush-record ${brush.id === activeBrush.id ? 'active' : ''}`}
              onClick={() => onChangeLibrary(recordRecentBrush(library, brush.id))}
            >
              <span className="brush-preview" style={{ '--brush-colour': brush.attributes.preview.color, '--brush-size': `${8 + brush.attributes.preview.size * 28}px` }} />
              <span>{brush.name}<small>{brush.pinned ? 'Pinned · ' : ''}{brush.attributes.shape.sourceName} / {brush.attributes.grain.sourceName}</small></span>
            </button>
          ))}
          {!visibleBrushes.length && <p className="empty-setting">No brushes match this shelf.</p>}
        </div>
      </div>

      <div className="brush-record-editor">
        <label className="field-label">Brush name<input value={activeBrush.name} onChange={(event) => patchBrush({ name: event.target.value })} /></label>
        <div className="inline-actions">
          <button className={activeBrush.pinned ? 'pressed' : ''} onClick={() => patchBrush({ pinned: !activeBrush.pinned })}>Pin</button>
          <button onClick={exportBrush}>Share Brush</button>
          <button onClick={exportLibrary}>Share Library</button>
          <button className="danger" onClick={deleteBrush}>Delete</button>
        </div>
      </div>

      <div className="brush-studio">
        <nav className="attribute-rail" aria-label="Brush attributes">
          {BRUSH_ATTRIBUTE_GROUPS.map((group) => <button key={group} className={group === groupName ? 'pressed' : ''} onClick={() => setGroupName(group)}>{group}</button>)}
        </nav>
        <div className="attribute-inspector">
          <div className="panel-heading compact"><div><span>Brush Studio</span><h3>{groupName}</h3></div></div>
          <div className="brush-live-pad" aria-label="Brush preview pad">
            <span style={{ '--preview-colour': activeBrush.attributes.preview.color, '--preview-width': `${Math.max(3, activeBrush.attributes.properties.size / 5)}px` }} />
          </div>
          {Object.entries(settings).map(([name, value]) => <SettingField key={name} name={name} value={value} onChange={(nextValue) => patchAttribute(attributeKey, name, nextValue)} />)}
        </div>
      </div>
      <p className="panel-footnote" aria-live="polite">{status}</p>
    </section>
  );
}
