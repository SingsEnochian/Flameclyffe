import React, { useEffect, useMemo, useState } from 'react';
import {
  LiveGlyphViewer as InstrumentLiveGlyphViewer,
  useSecondTicker,
} from './live-glyph.jsx';
import './hearthweave-kernel/sensory-bus.js';
import './hearthweave-kernel/dual-aspect-boundary.css';
import {
  CLAIM_STATES,
} from './hearthweave-kernel/dual-aspect.js';
import {
  readActiveDualAspectPacket,
  recordDualAspectRender,
  subscribeToDualAspectActivation,
} from './hearthweave-kernel/activation.js';

export { useSecondTicker };

function initialPacket() {
  return readActiveDualAspectPacket({ storage: globalThis.sessionStorage });
}

export function LiveGlyphViewer({ now }) {
  const [packet, setPacket] = useState(initialPacket);

  useEffect(() => subscribeToDualAspectActivation(
    (nextPacket) => setPacket(nextPacket),
    {
      eventTarget: window,
      storage: sessionStorage,
      emitCurrent: true,
    },
  ), []);

  const effectiveNow = useMemo(() => {
    if (!packet) return now;
    const frozen = new Date(packet.temporal.activated_at);
    return Number.isNaN(frozen.getTime()) ? now : frozen;
  }, [now, packet]);

  useEffect(() => {
    if (!packet) return;
    recordDualAspectRender(packet, {
      renderer: 'glyph',
      output: packet.experiential.glyph,
      status: CLAIM_STATES.VERIFIED,
      notes: [
        'Live glyph remounted from the frozen packet timestamp.',
        'DEEP was read from packet.observable.deep_snapshot rather than refetched.',
      ],
      storage: sessionStorage,
    });
    recordDualAspectRender(packet, {
      renderer: 'visual',
      output: packet.experiential.visual,
      status: CLAIM_STATES.VERIFIED,
      notes: ['Visual structure and atmosphere share the glyph packet fingerprint.'],
      storage: sessionStorage,
    });
  }, [packet]);

  return (
    <div
      data-dual-aspect-packet={packet?.packet_id ?? 'unbound-observatory'}
      data-shared-state={packet?.correspondence?.shared_state_fingerprint ?? 'live-unbound'}
    >
      {packet ? (
        <p
          role="status"
          style={{
            margin: '0 0 0.75rem',
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            opacity: 0.78,
          }}
        >
          BIFRÖST BOUND · {packet.identity.house_id} · {packet.packet_id} · {packet.degraded.active ? 'DEGRADED' : 'LIVE'}
        </p>
      ) : null}
      <InstrumentLiveGlyphViewer
        key={packet?.packet_id ?? 'unbound-observatory'}
        now={effectiveNow}
      />
    </div>
  );
}
