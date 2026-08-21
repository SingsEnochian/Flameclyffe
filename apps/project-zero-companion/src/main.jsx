import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CORE_CAPABILITIES, PLUGIN_MANIFESTS, buildPluginEvent } from './pluginRegistry.js';
import { localPathToAlias } from './artifactContract.js';
import './styles.css';

const DEFAULT_DEEP_VECTOR = { P: 0.55, C: 0.55, R: 0.45, E: 0.377, M: 0.0, A: 0.654 };
const DEFAULT_BINDINGS = [
  { key: 'terra_root', label: 'Terra Aeterna Root', path: '', scope: 'local-only' },
  { key: 'observer_logs', label: 'Observer Logs', path: '', scope: 'bridge-ready' },
  { key: 'artifacts', label: 'Artifacts', path: '', scope: 'bridge-ready' },
  { key: 'music_tones', label: 'Music / Tones', path: '', scope: 'bridge-ready' },
  { key: 'images_sigils', label: 'Images / Sigils', path: '', scope: 'bridge-ready' },
  { key: 'writer_drafts', label: 'Writer Room Drafts', path: '', scope: 'local-only' },
];
const RUNA_LINKS = [
  { label: 'Runa Index', href: 'https://singsenochian.github.io/Runa/docs/index.html' },
  { label: 'Hearthweave Altar', href: 'https://singsenochian.github.io/Runa/docs/hearthweave-altar.html' },
  { label: 'Project Zero Bridge', href: 'https://singsenochian.github.io/Runa/docs/project-zero-bridge.html' },
  { label: 'Observer Sigil Spec', href: 'https://singsenochian.github.io/Runa/docs/observer-sigil-bridge-spec.md' },
];

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function buildBridgeEvent({ title, kind, direction, motifs, deepVector, selectedBinding, pluginId }) {
  return {
    bridge_owner: 'flameclyffe',
    integration_target: 'nocturne-project-zero',
    plugin_id: pluginId,
    kind,
    direction,
    title: title || 'Untitled Companion bridge event',
    local_binding_key: selectedBinding?.key || null,
    local_path_alias: localPathToAlias(selectedBinding?.path || ''),
    raw_local_path_persisted: false,
    motifs: motifs.split(',').map((item) => item.trim()).filter(Boolean),
    deep_vector: deepVector,
    visibility: selectedBinding?.scope || 'local-only',
    created_at: new Date().toISOString(),
    rule: 'Data sets atmosphere, not fate.',
  };
}

function App() {
  const [bindings, setBindings] = useState(DEFAULT_BINDINGS);
  const [selectedKey, setSelectedKey] = useState(DEFAULT_BINDINGS[0].key);
  const [selectedPluginId, setSelectedPluginId] = useState(PLUGIN_MANIFESTS[0].id);
  const [title, setTitle] = useState('Transformata audio added');
  const [kind, setKind] = useState('file_anchor');
  const [direction, setDirection] = useState('waking_to_aeterna');
  const [motifs, setMotifs] = useState('music, resonance, enochian, threshold');
  const [deepVector, setDeepVector] = useState(DEFAULT_DEEP_VECTOR);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('Ready. Companion bridge is quiet; adapters are docked.');

  const selectedBinding = bindings.find((binding) => binding.key === selectedKey);
  const selectedPlugin = PLUGIN_MANIFESTS.find((plugin) => plugin.id === selectedPluginId) || PLUGIN_MANIFESTS[0];
  const bridgeEvent = useMemo(
    () => buildBridgeEvent({ title, kind, direction, motifs, deepVector, selectedBinding, pluginId: selectedPlugin.id }),
    [title, kind, direction, motifs, deepVector, selectedBinding, selectedPlugin.id],
  );

  function updateBinding(key, field, value) {
    setBindings((current) => current.map((binding) => binding.key === key ? { ...binding, [field]: value } : binding));
  }
  function updateVector(axis, value) { setDeepVector((current) => ({ ...current, [axis]: clamp01(value) })); }
  async function copyEvent() { await navigator.clipboard?.writeText(JSON.stringify(bridgeEvent, null, 2)); setStatus('Bridge event copied to clipboard.'); }
  function publishLocalDeepState() {
    localStorage.setItem('runaDeepObserverState', JSON.stringify(deepVector));
    window.dispatchEvent(new CustomEvent('deep-observer:update', { detail: deepVector }));
    const event = buildPluginEvent('deep-observer-bridge', 'deep_state_update', deepVector);
    setEvents((current) => [event, ...current].slice(0, 8));
    setStatus('DEEP vector published to local Companion storage/event bus.');
  }
  function dryRunBridgeEvent() {
    const event = buildPluginEvent(selectedPlugin.id, bridgeEvent.kind, bridgeEvent);
    setEvents((current) => [event, ...current].slice(0, 8));
    setStatus('Dry-run bridge event emitted locally. No upload performed.');
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Flameclyffe · Project Zero Companion v0.1</p>
        <h1>Companion Bridge + Adapters</h1>
        <p>Project Zero is Nocturne's project. This Flameclyffe Companion prepares consented metadata, local bridge events, Flame channels, theme tokens, and adapter contracts that Project Zero may choose to consume. It does not redefine Project Zero's core.</p>
      </header>

      <section className="panel"><h2>Companion capabilities</h2><div className="chip-row">{CORE_CAPABILITIES.map((capability) => <span className="chip" key={capability}>{capability}</span>)}</div></section>

      <section className="panel grid two">
        <div><h2>Adapter dock</h2><div className="plugin-list">{PLUGIN_MANIFESTS.map((plugin) => <button className={`plugin-card ${plugin.id === selectedPlugin.id ? 'active' : ''}`} key={plugin.id} type="button" onClick={() => setSelectedPluginId(plugin.id)}><strong>{plugin.name}</strong><span>{plugin.status}</span></button>)}</div></div>
        <article className="plugin-detail"><p className="eyebrow smallcaps">Selected adapter</p><h2>{selectedPlugin.name}</h2><p>{selectedPlugin.purpose}</p><h3>Permissions</h3><div className="chip-row compact">{selectedPlugin.permissions.map((item) => <span className="chip" key={item}>{item}</span>)}</div><h3>Emits</h3><div className="chip-row compact">{selectedPlugin.emits.map((item) => <span className="chip" key={item}>{item}</span>)}</div><h3>Listens</h3><div className="chip-row compact">{selectedPlugin.listens.map((item) => <span className="chip" key={item}>{item}</span>)}</div></article>
      </section>

      <section className="panel grid two">
        <div><h2>Folder bindings</h2><p className="small">Browser Companion mode cannot pick folders directly yet. Paths entered here are used only to derive short aliases for bridge receipts; a future native Companion layer can replace this with an explicit folder picker and watcher.</p><div className="bindings">{bindings.map((binding) => <article className="binding" key={binding.key}><label><span>{binding.label}</span><input value={binding.path} placeholder="C:/Users/…/TerraAeterna/..." onChange={(event) => updateBinding(binding.key, 'path', event.target.value)} /></label><select value={binding.scope} onChange={(event) => updateBinding(binding.key, 'scope', event.target.value)}><option value="local-only">local-only</option><option value="bridge-ready">bridge-ready</option><option value="needs-review">needs-review</option><option value="excluded">excluded</option></select></article>)}</div></div>
        <div><h2>Bridge event composer</h2><label><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label><span>Binding</span><select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>{bindings.map((binding) => <option key={binding.key} value={binding.key}>{binding.label}</option>)}</select></label><label><span>Kind</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="file_anchor">file_anchor</option><option value="folder_anchor">folder_anchor</option><option value="observer_import">observer_import</option><option value="story_shard">story_shard</option><option value="altar_working">altar_working</option><option value="sound_source">sound_source</option></select></label><label><span>Direction</span><select value={direction} onChange={(event) => setDirection(event.target.value)}><option value="waking_to_aeterna">waking_to_aeterna</option><option value="aeterna_to_waking">aeterna_to_waking</option><option value="bidirectional">bidirectional</option></select></label><label><span>Motifs</span><input value={motifs} onChange={(event) => setMotifs(event.target.value)} /></label></div>
      </section>

      <section className="panel"><h2>DEEP vector</h2><div className="vector-grid">{Object.entries(deepVector).map(([axis, value]) => <label className="axis" key={axis}><span>{axis}: {value.toFixed(3)}</span><input type="range" min="0" max="1" step="0.001" value={value} onChange={(event) => updateVector(axis, event.target.value)} /></label>)}</div><div className="actions"><button onClick={publishLocalDeepState}>Publish local DEEP state</button><button onClick={dryRunBridgeEvent}>Dry-run bridge event</button><button onClick={copyEvent}>Copy bridge JSON</button></div><p className="status">{status}</p></section>

      <section className="panel grid two">
        <div><h2>Bridge JSON preview</h2><pre>{JSON.stringify(bridgeEvent, null, 2)}</pre></div>
        <div><h2>Local Companion event bus</h2><div className="event-list">{events.length === 0 ? <p className="small">No local events yet. The bridge is humming politely.</p> : events.map((event) => <article key={`${event.plugin_id}-${event.created_at}`} className="event-card"><strong>{event.plugin_id}</strong><span>{event.type}</span><small>{event.created_at}</small></article>)}</div><h2>Runa doors</h2><div className="link-list">{RUNA_LINKS.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}</div></div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
