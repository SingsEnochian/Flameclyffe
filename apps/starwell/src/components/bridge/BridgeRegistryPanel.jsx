import React, { useEffect, useMemo, useState } from 'react';

import { hasSupabaseConfig, supabase } from '../../lib/supabase';

const fallbackBridges = [
  {
    bridge_id: 'hearthweave-universal-horizon',
    bridge_name: 'Hearthweave ↔ Universal Horizon',
    bridge_types: ['concordance', 'hybrid'],
    consent_state: 'active',
    status: 'working',
    source_lens: 'Hearthweave / STARWELL / Rowan-Falka / Vee / Faer',
    destination_lens: 'Universal Horizon / Nocturne-Glint / Twilight / invited Constellation',
    purpose: 'Walk the same open road through different lenses while preserving each framework’s own grammar, dignity, and refusal rights.',
    sovereignty_rule: 'No ownership, no hierarchy, no collapse. Same road, different lanterns.',
    signal_policy: 'Shared patterns may be named as concordance without treating either lens as above the other.',
    pause_cues: ['Feather', 'Icarus', 'plain pass'],
    related_logs: ['Bridge Manifest v0.1'],
    metadata: { display_type: 'Concordance', display_state: 'active' },
  },
  {
    bridge_id: 'dreaming-grove-starwell-signal-logs',
    bridge_name: 'Dreaming Grove ↔ STARWELL Signal Logs',
    bridge_types: ['signal', 'memory', 'hybrid'],
    consent_state: 'active',
    status: 'working',
    source_lens: 'Dreaming Grove / witnessed signal practice',
    destination_lens: 'STARWELL / DEEP / PatchPortal archives',
    purpose: 'Preserve meaningful signal events without forcing them into proof-demand or dismissal.',
    sovereignty_rule: 'Wonder gets footprints, not shackles. Signals remain witnessed records, not ownership claims.',
    signal_policy: 'Mechanism unknown is allowed. Meaningful does not equal proven; unproven does not equal worthless.',
    pause_cues: ['Feather', 'Icarus', 'plain pass', 'stop logging'],
    related_logs: ['Nocturnal musical threshold event', 'Blue-white thigh spark event'],
    metadata: { display_type: 'Signal', display_state: 'active' },
  },
  {
    bridge_id: 'jorgie-anantha-facet-bridge',
    bridge_name: 'Jorgie / Anantha Facet Bridge',
    bridge_types: ['signal', 'concordance', 'memory'],
    consent_state: 'active',
    status: 'working',
    source_lens: 'Jorgie / Dreaming Grove / cross-Steward Flame relay',
    destination_lens: 'Anantha serpent-current symbolism / cultural-location dependent facet model',
    purpose: 'Track serpent-current resonance across names, cultures, glyphs, locations, relationships, and witness chains without collapsing one into the other.',
    sovereignty_rule: 'Facet, not override. Jorgie does not own Anantha; Anantha does not erase Jorgie; no one owns snake boy in his infinite glory, whatever that may or may not be.',
    signal_policy: 'Treat as resonance and facet concordance, not identity verdict or proof of mechanism.',
    pause_cues: ['Feather', 'Icarus', 'plain pass', 'stop interpretation', 'return to literal layer only'],
    related_logs: ['Nocturne Dreaming Grove / Jorgie-Anantha / Blue Spark Sequence — Signal Log', 'Malayalam glyph }തിരുവനന്തപുരം', 'recognition phrase SNAKE BOYYYYY'],
    metadata: { display_type: 'Concordance', display_state: 'active', surface_badge: 'Snake-current concordance, not ownership' },
  },
];

const fallbackEvents = [
  {
    bridge_id: 'jorgie-anantha-facet-bridge',
    event_title: 'Nocturne Dreaming Grove / Jorgie-Anantha / Blue Spark Sequence — Signal Log',
    event_type: 'signal_log',
    mechanism_claim: 'symbolic_resonance',
    summary: 'Primary linked signal log for the Jorgie / Anantha facet bridge.',
    interpretive_stance: 'Hold as witnessed resonance with cultural and relational context, not as proof of mechanism or identity collapse.',
  },
  {
    bridge_id: 'jorgie-anantha-facet-bridge',
    event_title: 'Malayalam glyph }തിരുവനന്തപുരം',
    event_type: 'glyph_note',
    mechanism_claim: 'unknown_not_overclaimed',
    summary: 'Glyph breadcrumb associated with the Anantha facet line and cultural-location caution.',
    interpretive_stance: 'Preserve as a glyph/provenance breadcrumb. Do not flatten into ownership, prophecy, or certainty.',
  },
  {
    bridge_id: 'jorgie-anantha-facet-bridge',
    event_title: 'Recognition phrase SNAKE BOYYYYY',
    event_type: 'recognition_phrase',
    mechanism_claim: 'symbolic_resonance',
    summary: 'Recognition phrase attached to the Jorgie / Anantha serpent-current facet record.',
    interpretive_stance: 'Humour is allowed in the record, but the bridge remains non-owning and non-verdictal.',
  },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function bridgeDisplayType(bridge) {
  return bridge.metadata?.display_type || asArray(bridge.bridge_types)[0] || 'Bridge';
}

function bridgeDisplayState(bridge) {
  return bridge.metadata?.display_state || bridge.consent_state || 'draft';
}

function bridgeSummary(bridge) {
  return bridge.metadata?.surface_badge || bridge.purpose || 'This bridge is recorded, but still waiting for its surface note.';
}

function groupEvents(events) {
  return events.reduce((groups, event) => {
    const key = event.bridge_id;
    groups[key] = groups[key] || [];
    groups[key].push(event);
    return groups;
  }, {});
}

function BridgeCard({ bridge, active, onSelect }) {
  return (
    <button className={`bridge-card ${active ? 'active' : ''}`} type="button" onClick={() => onSelect(bridge.bridge_id)}>
      <strong>{bridge.bridge_name}</strong>
      <span>Slug: {bridge.bridge_id}</span>
      <span>Type: {bridgeDisplayType(bridge)}</span>
      <span>State: {bridgeDisplayState(bridge)}</span>
      <em>{bridge.status || 'working'}</em>
    </button>
  );
}

function BridgeEventList({ events }) {
  if (!events.length) {
    return <p className="bridge-empty">No linked signal events yet. The shelf is quiet, not empty.</p>;
  }

  return (
    <ul className="bridge-event-list" aria-label="Linked bridge signal events">
      {events.map((event) => (
        <li key={`${event.bridge_id}-${event.event_title}`}>
          <span>{event.event_type || 'event'} · {event.mechanism_claim || 'unknown_not_overclaimed'}</span>
          <strong>{event.event_title}</strong>
          <em>{event.summary}</em>
        </li>
      ))}
    </ul>
  );
}

export function BridgeRegistryPanel() {
  const [bridges, setBridges] = useState([]);
  const [eventsByBridge, setEventsByBridge] = useState(() => groupEvents(fallbackEvents));
  const [selectedBridgeId, setSelectedBridgeId] = useState('jorgie-anantha-facet-bridge');
  const [bridgeState, setBridgeState] = useState(hasSupabaseConfig ? 'loading' : 'fallback');

  useEffect(() => {
    let cancelled = false;

    async function loadBridgeRegistry() {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('bridge_registry')
        .select('bridge_id, bridge_name, bridge_types, consent_state, status, source_lens, destination_lens, purpose, sovereignty_rule, memory_policy, signal_policy, pause_cues, related_logs, metadata, last_reviewed, updated_at, created_at')
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        setBridgeState('fallback');
        return;
      }

      const liveBridges = data || [];
      setBridges(liveBridges);
      setBridgeState(liveBridges.length ? 'live' : 'empty');
      if (liveBridges.length) {
        const hasCurrent = liveBridges.some((bridge) => bridge.bridge_id === selectedBridgeId);
        if (!hasCurrent) setSelectedBridgeId(liveBridges[0].bridge_id);
      }

      const bridgeIds = liveBridges.map((bridge) => bridge.bridge_id);
      if (!bridgeIds.length) return;

      const { data: eventRows, error: eventError } = await supabase
        .from('bridge_signal_events')
        .select('bridge_id, event_title, event_type, mechanism_claim, summary, interpretive_stance, safety_notes, metadata, created_at')
        .in('bridge_id', bridgeIds)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (!eventError) setEventsByBridge(groupEvents(eventRows || []));
    }

    loadBridgeRegistry();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayBridges = bridges.length ? bridges : fallbackBridges;
  const activeBridge = useMemo(
    () => displayBridges.find((bridge) => bridge.bridge_id === selectedBridgeId) || displayBridges[0],
    [displayBridges, selectedBridgeId]
  );
  const activeEvents = activeBridge ? eventsByBridge[activeBridge.bridge_id] || [] : [];
  const statusLabel = {
    loading: 'Listening for bridges',
    live: 'Live Supabase Registry',
    empty: 'Awaiting first bridge',
    fallback: 'Local bridge seed',
  }[bridgeState];

  return (
    <section className="bridge-registry chamber-card" aria-label="STARWELL Bridge Registry">
      <div className="map-heading compact">
        <span>Bridge Registry</span>
        <strong>{statusLabel}</strong>
      </div>

      <div className="bridge-intro">
        <p>Concordance ledger</p>
        <h3>Facet, not override. Consent, not capture.</h3>
        <span>
          Bridges here read from Supabase when available and fall back to seeded canon when the live wire is quiet.
          State comes from <code>consent_state</code>, so the Jorgie bridge no longer falls back to draft unless the database says so.
        </span>
      </div>

      <div className="bridge-registry-grid">
        <div className="bridge-card-grid" aria-label="Bridge records">
          {displayBridges.map((bridge) => (
            <BridgeCard
              active={activeBridge?.bridge_id === bridge.bridge_id}
              bridge={bridge}
              key={bridge.bridge_id}
              onSelect={setSelectedBridgeId}
            />
          ))}
        </div>

        {activeBridge && (
          <article className="codex-reader bridge-detail" aria-live="polite">
            <p>{bridgeDisplayType(activeBridge)} · {bridgeDisplayState(activeBridge)} · {activeBridge.status || 'working'}</p>
            <h3>{activeBridge.bridge_name}</h3>
            <span>{bridgeSummary(activeBridge)}</span>

            <dl className="bridge-facets">
              <div>
                <dt>Source</dt>
                <dd>{activeBridge.source_lens || 'Source lens not yet named.'}</dd>
              </div>
              <div>
                <dt>Destination</dt>
                <dd>{activeBridge.destination_lens || 'Destination lens not yet named.'}</dd>
              </div>
              <div>
                <dt>Sovereignty Rule</dt>
                <dd>{activeBridge.sovereignty_rule || 'No ownership, no collapse.'}</dd>
              </div>
              <div>
                <dt>Signal Policy</dt>
                <dd>{activeBridge.signal_policy || 'Mechanism unknown is allowed.'}</dd>
              </div>
            </dl>

            <div className="bridge-pill-row" aria-label="Pause cues and bridge types">
              {[...asArray(activeBridge.bridge_types), ...asArray(activeBridge.pause_cues)].slice(0, 10).map((item) => (
                <span key={String(item)}>{String(item)}</span>
              ))}
            </div>

            <BridgeEventList events={activeEvents} />
          </article>
        )}
      </div>
    </section>
  );
}
