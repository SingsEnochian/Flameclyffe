import React, { useState } from 'react';
import { makeId } from './glyphStudioModel.js';

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
];

export function makeStudioLayer(name = 'Ink', kind = 'vector') {
  return {
    id: makeId('layer'),
    name,
    kind,
    parentId: null,
    visible: true,
    locked: false,
    solo: false,
    selected: false,
    opacity: 1,
    blendMode: 'normal',
    alphaLock: false,
    clippingMask: false,
    reference: false,
    private: false,
    maskOf: null,
  };
}

function updateLayerList(glyph, layerId, patch) {
  return {
    ...glyph,
    layers: glyph.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer),
  };
}

export default function LayerPanel({ glyph, onChangeGlyph }) {
  const [expandedLayerId, setExpandedLayerId] = useState(null);
  const activeLayer = glyph.layers.find((layer) => layer.id === glyph.activeLayerId) || glyph.layers[0];

  function selectPrimary(layerId) {
    onChangeGlyph({
      ...glyph,
      activeLayerId: layerId,
      layers: glyph.layers.map((layer) => ({ ...layer, selected: layer.id === layerId ? true : layer.selected })),
    });
  }

  function toggleSecondary(layerId) {
    if (layerId === glyph.activeLayerId) return;
    onChangeGlyph(updateLayerList(glyph, layerId, {
      selected: !glyph.layers.find((layer) => layer.id === layerId)?.selected,
    }));
  }

  function addLayer(kind = 'vector') {
    const layer = makeStudioLayer(
      kind === 'group' ? 'New Group' : kind === 'mask' ? 'Layer Mask' : `Layer ${glyph.layers.length + 1}`,
      kind,
    );
    if (kind === 'mask') layer.maskOf = activeLayer?.id || null;
    const index = Math.max(0, glyph.layers.findIndex((entry) => entry.id === glyph.activeLayerId) + 1);
    const layers = [...glyph.layers];
    layers.splice(index, 0, layer);
    onChangeGlyph({ ...glyph, layers, activeLayerId: layer.id });
  }

  function duplicateLayer(layer) {
    const copy = {
      ...structuredClone(layer),
      id: makeId('layer'),
      name: `${layer.name} Copy`,
      selected: false,
      solo: false,
    };
    const index = glyph.layers.findIndex((entry) => entry.id === layer.id);
    const layers = [...glyph.layers];
    layers.splice(index + 1, 0, copy);
    const copiedStrokes = glyph.strokes
      .filter((stroke) => stroke.layerId === layer.id)
      .map((stroke) => ({ ...structuredClone(stroke), id: makeId('stroke'), layerId: copy.id }));
    onChangeGlyph({ ...glyph, layers, strokes: [...glyph.strokes, ...copiedStrokes], activeLayerId: copy.id });
  }

  function deleteLayer(layer) {
    if (glyph.layers.length <= 1) return;
    const layers = glyph.layers.filter((entry) => entry.id !== layer.id && entry.maskOf !== layer.id);
    const strokes = glyph.strokes.filter((stroke) => stroke.layerId !== layer.id);
    const nextActive = layer.id === glyph.activeLayerId ? layers[0]?.id : glyph.activeLayerId;
    onChangeGlyph({ ...glyph, layers, strokes, activeLayerId: nextActive });
  }

  function moveLayer(layerId, direction) {
    const index = glyph.layers.findIndex((layer) => layer.id === layerId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= glyph.layers.length) return;
    const layers = [...glyph.layers];
    [layers[index], layers[target]] = [layers[target], layers[index]];
    onChangeGlyph({ ...glyph, layers });
  }

  function toggleSolo(layerId) {
    const target = glyph.layers.find((layer) => layer.id === layerId);
    const enable = !target?.solo;
    onChangeGlyph({
      ...glyph,
      layers: glyph.layers.map((layer) => ({
        ...layer,
        solo: layer.id === layerId ? enable : false,
        visible: enable ? layer.id === layerId || layer.maskOf === layerId : layer.visible,
      })),
    });
  }

  function clearLayer(layer) {
    onChangeGlyph({ ...glyph, strokes: glyph.strokes.filter((stroke) => stroke.layerId !== layer.id) });
  }

  function mergeSelected() {
    const selected = glyph.layers.filter((layer) => layer.selected || layer.id === glyph.activeLayerId);
    if (selected.length < 2) return;
    const target = selected[0];
    const selectedIds = new Set(selected.map((layer) => layer.id));
    const strokes = glyph.strokes.map((stroke) => selectedIds.has(stroke.layerId) ? { ...stroke, layerId: target.id } : stroke);
    const layers = glyph.layers.filter((layer) => !selectedIds.has(layer.id) || layer.id === target.id)
      .map((layer) => layer.id === target.id ? { ...layer, name: `${target.name} Merged`, selected: false } : layer);
    onChangeGlyph({ ...glyph, strokes, layers, activeLayerId: target.id });
  }

  return (
    <section className="layer-panel" aria-label="Layers">
      <div className="panel-heading">
        <div><span>Stack</span><h2>Layers</h2></div>
        <div className="mini-actions">
          <button onClick={() => addLayer('vector')} title="New vector layer">＋</button>
          <button onClick={() => addLayer('raster')} title="New art layer">▧</button>
          <button onClick={() => addLayer('group')} title="New group">⌑</button>
        </div>
      </div>

      <div className="layer-bulk-actions">
        <button onClick={mergeSelected}>Merge selected</button>
        <button onClick={() => onChangeGlyph({ ...glyph, layers: glyph.layers.map((layer) => ({ ...layer, selected: true })) })}>Select all</button>
        <button onClick={() => onChangeGlyph({ ...glyph, layers: glyph.layers.map((layer) => ({ ...layer, selected: false })) })}>Deselect</button>
      </div>

      <div className="layer-list">
        {[...glyph.layers].reverse().map((layer) => {
          const active = layer.id === glyph.activeLayerId;
          return (
            <article key={layer.id} className={`layer-record ${active ? 'active' : ''} ${layer.selected && !active ? 'secondary-selected' : ''}`}>
              <div className="layer-main-row">
                <button className="layer-visibility" onClick={() => onChangeGlyph(updateLayerList(glyph, layer.id, { visible: !layer.visible }))} onDoubleClick={() => toggleSolo(layer.id)} title="Tap visibility; double tap to solo">{layer.visible ? '◉' : '○'}</button>
                <button className="layer-thumbnail" onClick={() => selectPrimary(layer.id)} onContextMenu={(event) => { event.preventDefault(); toggleSecondary(layer.id); }} title="Tap for primary; long-press/context for secondary">{layer.kind === 'vector' ? '◇' : layer.kind === 'raster' ? '▧' : layer.kind === 'mask' ? '◐' : '⌑'}</button>
                <button className="layer-name" onClick={() => selectPrimary(layer.id)}>{layer.name}<small>{layer.kind} · {Math.round(layer.opacity * 100)}% · {layer.blendMode}</small></button>
                <button className="layer-lock" onClick={() => onChangeGlyph(updateLayerList(glyph, layer.id, { locked: !layer.locked }))}>{layer.locked ? '◆' : '◇'}</button>
                <button className="layer-options" onClick={() => setExpandedLayerId(expandedLayerId === layer.id ? null : layer.id)}>•••</button>
              </div>

              {expandedLayerId === layer.id && <div className="layer-options-sheet">
                <label>Name<input value={layer.name} onChange={(event) => onChangeGlyph(updateLayerList(glyph, layer.id, { name: event.target.value }))} /></label>
                <label>Opacity<input type="range" min="0" max="1" step="0.01" value={layer.opacity} onChange={(event) => onChangeGlyph(updateLayerList(glyph, layer.id, { opacity: Number(event.target.value) }))} /></label>
                <label>Blend mode<select value={layer.blendMode} onChange={(event) => onChangeGlyph(updateLayerList(glyph, layer.id, { blendMode: event.target.value }))}>{BLEND_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
                <div className="option-toggles">
                  <button className={layer.alphaLock ? 'pressed' : ''} onClick={() => onChangeGlyph(updateLayerList(glyph, layer.id, { alphaLock: !layer.alphaLock }))}>Alpha lock</button>
                  <button className={layer.clippingMask ? 'pressed' : ''} onClick={() => onChangeGlyph(updateLayerList(glyph, layer.id, { clippingMask: !layer.clippingMask }))}>Clipping</button>
                  <button className={layer.reference ? 'pressed' : ''} onClick={() => onChangeGlyph(updateLayerList(glyph, layer.id, { reference: !layer.reference }))}>Reference</button>
                  <button className={layer.private ? 'pressed' : ''} onClick={() => onChangeGlyph(updateLayerList(glyph, layer.id, { private: !layer.private }))}>Private</button>
                </div>
                <div className="option-actions">
                  <button onClick={() => duplicateLayer(layer)}>Duplicate</button>
                  <button onClick={() => addLayer('mask')}>Mask</button>
                  <button onClick={() => clearLayer(layer)}>Clear</button>
                  <button onClick={() => moveLayer(layer.id, 1)}>Up</button>
                  <button onClick={() => moveLayer(layer.id, -1)}>Down</button>
                  <button className="danger" onClick={() => deleteLayer(layer)}>Delete</button>
                </div>
              </div>}
            </article>
          );
        })}
      </div>
      <p className="panel-footnote">Vector layers are eligible for font compilation. Raster, private, mask, clipping and blended layers remain art-only until explicitly flattened or traced.</p>
    </section>
  );
}
