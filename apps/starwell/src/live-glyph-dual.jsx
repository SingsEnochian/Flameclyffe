import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { buildPacketGlyphRender } from './hearthweave-kernel/packet-glyph-render.js';

export { useSecondTicker };

function initialPacket() {
  return readActiveDualAspectPacket({ storage: globalThis.sessionStorage });
}

function PacketBoundGlyph({ packet, onRendered }) {
  const rendered = useMemo(() => buildPacketGlyphRender(packet), [packet]);

  useEffect(() => {
    onRendered(rendered);
  }, [onRendered, rendered]);

  return (
    <figure
      data-packet-glyph={packet.packet_id}
      style={{
        margin: 0,
        display: 'grid',
        gap: '0.75rem',
        justifyItems: 'center',
      }}
    >
      <svg
        viewBox={`0 0 ${rendered.viewport.width} ${rendered.viewport.height}`}
        role="img"
        aria-label={`Packet-bound dual-aspect glyph for ${packet.experiential.house.name}`}
        style={{ width: 'min(100%, 34rem)', height: 'auto', overflow: 'visible' }}
      >
        <title>{`Bifröst packet glyph ${packet.packet_id}`}</title>
        {rendered.reception.rings.map((ring) => (
          <circle
            key={`ring-${ring.index}`}
            cx={rendered.hearthweave_bind.center.x}
            cy={rendered.hearthweave_bind.center.y}
            r={ring.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeDasharray={`${ring.dash} ${ring.dash * 0.62}`}
            opacity={ring.opacity}
          />
        ))}
        {rendered.reception.answer_strokes.map((stroke) => (
          <line
            key={`answer-${stroke.index}`}
            x1={stroke.x1}
            y1={stroke.y1}
            x2={stroke.x2}
            y2={stroke.y2}
            stroke="currentColor"
            strokeWidth="1.2"
            opacity={stroke.opacity}
          />
        ))}
        <path
          d={rendered.arrival.path}
          fill="none"
          stroke="currentColor"
          strokeWidth={rendered.arrival.stroke_width}
          strokeLinejoin="round"
          opacity={rendered.arrival.opacity}
        />
        {rendered.arrival.nodes.map((node) => (
          <circle
            key={`arrival-${node.index}`}
            cx={node.x}
            cy={node.y}
            r={node.radius}
            fill="currentColor"
            opacity={rendered.arrival.opacity}
          />
        ))}
        <circle
          cx={rendered.hearthweave_bind.center.x}
          cy={rendered.hearthweave_bind.center.y}
          r={rendered.hearthweave_bind.radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          opacity={rendered.hearthweave_bind.opacity}
        />
        <path
          d={`M ${rendered.hearthweave_bind.center.x - rendered.hearthweave_bind.radius} ${rendered.hearthweave_bind.center.y} L ${rendered.hearthweave_bind.center.x + rendered.hearthweave_bind.radius} ${rendered.hearthweave_bind.center.y} M ${rendered.hearthweave_bind.center.x} ${rendered.hearthweave_bind.center.y - rendered.hearthweave_bind.radius} L ${rendered.hearthweave_bind.center.x} ${rendered.hearthweave_bind.center.y + rendered.hearthweave_bind.radius}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity={rendered.hearthweave_bind.opacity}
        />
      </svg>
      <figcaption style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.76 }}>
        Arrival {rendered.arrival.node_count} · Reception {rendered.reception.ring_count} · Bind {rendered.hearthweave_bind.tension.toFixed(3)}
      </figcaption>
    </figure>
  );
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

  const recordRenderedGlyph = useCallback((renderedOutput) => {
    if (!packet) return;
    recordDualAspectRender(packet, {
      renderer: 'glyph',
      output: renderedOutput,
      status: CLAIM_STATES.VERIFIED,
      notes: [
        'The displayed SVG was derived directly from packet.experiential.glyph.',
        'The receipted output contains the exact paths, nodes, rings, and bind geometry that were rendered.',
      ],
      storage: sessionStorage,
    });
    recordDualAspectRender(packet, {
      renderer: 'visual',
      output: {
        rendered_glyph: renderedOutput,
        visual_contract: packet.experiential.visual,
      },
      status: CLAIM_STATES.VERIFIED,
      notes: ['The displayed vector structure and House visual contract share the sealed packet fingerprint.'],
      storage: sessionStorage,
    });
  }, [packet]);

  if (!packet) {
    return (
      <div
        data-dual-aspect-packet="unbound-observatory"
        data-shared-state="live-unbound"
      >
        <InstrumentLiveGlyphViewer now={now} />
      </div>
    );
  }

  return (
    <div
      data-dual-aspect-packet={packet.packet_id}
      data-shared-state={packet.correspondence.shared_state_fingerprint}
    >
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
      <PacketBoundGlyph
        key={packet.packet_id}
        packet={packet}
        onRendered={recordRenderedGlyph}
      />
    </div>
  );
}
