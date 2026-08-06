import React, { useEffect, useState } from 'react';
import ArcsweepShell from './shell/ArcsweepShell.jsx';
import { createRoot } from 'react-dom/client';
import {
  readActiveDualAspectPacket,
  recordDualAspectReplay,
  subscribeToDualAspectActivation,
} from './hearthweave-kernel/activation.js';
import { replayDualAspectPacket, DUAL_ASPECT_RECEIPT_LEDGER_KEY } from './hearthweave-kernel/dual-aspect.js';
import { buildPacketGlyphRender } from './hearthweave-kernel/packet-glyph-render.js';
import './hearthweave-kernel/dual-aspect-boundary.css';

function readLedger() {
  try {
    const raw = sessionStorage.getItem(DUAL_ASPECT_RECEIPT_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.receipts ? Object.values(parsed.receipts) : [];
  } catch {
    return [];
  }
}

function GlyphSvg({ rendered }) {
  if (!rendered) return null;
  const { viewport, reception, arrival, hearthweave_bind: bind } = rendered;
  return (
    <svg
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      style={{ width: 'min(100%, 20rem)', height: 'auto' }}
      aria-label="Replayed dual-aspect glyph"
      role="img"
    >
      {reception.rings.map((ring) => (
        <circle
          key={ring.index}
          cx={bind.center.x} cy={bind.center.y}
          r={ring.radius}
          fill="none" stroke="currentColor" strokeWidth="1.25"
          strokeDasharray={`${ring.dash} ${ring.dash * 0.62}`}
          opacity={ring.opacity}
        />
      ))}
      {reception.answer_strokes.map((s) => (
        <line key={s.index} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="currentColor" strokeWidth="1.2" opacity={s.opacity} />
      ))}
      <path d={arrival.path} fill="none" stroke="currentColor"
        strokeWidth={arrival.stroke_width} strokeLinejoin="round" opacity={arrival.opacity} />
      {arrival.nodes.map((n) => (
        <circle key={n.index} cx={n.x} cy={n.y} r={n.radius}
          fill="currentColor" opacity={arrival.opacity} />
      ))}
      <circle cx={bind.center.x} cy={bind.center.y} r={bind.radius}
        fill="none" stroke="currentColor" strokeWidth="2.4" opacity={bind.opacity} />
    </svg>
  );
}

function ReplayApp() {
  const [packet, setPacket] = useState(() => readActiveDualAspectPacket({ storage: sessionStorage }));
  const [receipts, setReceipts] = useState(readLedger);
  const [replay, setReplay] = useState(null);
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    return subscribeToDualAspectActivation(
      (nextPacket) => {
        setPacket(nextPacket);
        setReceipts(readLedger());
        setReplay(null);
        setVerified(null);
      },
      { eventTarget: window, storage: sessionStorage, emitCurrent: false },
    );
  }, []);

  function runReplay() {
    if (!packet) return;
    const replayOutput = replayDualAspectPacket(packet);
    const rendered = buildPacketGlyphRender(packet);
    const receipt = recordDualAspectReplay(packet, replayOutput, { storage: sessionStorage });
    setReplay({ output: replayOutput, rendered, receipt });
    setReceipts(readLedger());
    const existing = receipts.find((r) => r.packet_id === packet.packet_id);
    if (existing?.replay?.replay_fingerprint) {
      setVerified(existing.replay.replay_fingerprint === replayOutput.replay_fingerprint);
    }
  }

  return (
    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', padding: '2rem 1.5rem', maxWidth: 800, margin: '0 auto', color: '#d7e4dc' }}>
      <p style={{ fontSize: '.72rem', letterSpacing: '.08em', color: '#4d6e5d', marginBottom: '.5rem' }}>ARCSWEEP · REPLAY</p>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem', color: '#d7e4dc' }}>Temporal Replay</h1>
      <p style={{ fontSize: '.82rem', color: '#6a9e80', marginBottom: '2rem' }}>
        Deterministic reconstruction from sealed packet receipts. Same packet → same geometry. Always.
      </p>

      {!packet ? (
        <div style={{ padding: '1.5rem', border: '1px solid rgba(114,204,166,.14)', borderRadius: 10, color: '#4d6e5d', fontSize: '.8rem' }}>
          No active packet. Activate Hearthgate and return.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <section style={{ padding: '1.25rem', border: '1px solid rgba(114,204,166,.16)', borderRadius: 10, background: 'rgba(27,34,31,.7)' }}>
            <p style={{ fontSize: '.66rem', letterSpacing: '.06em', color: '#4d6e5d', marginBottom: '.4rem' }}>ACTIVE PACKET</p>
            <p style={{ fontSize: '.82rem', color: '#72c8a4', marginBottom: '.25rem' }}>{packet.packet_id}</p>
            <p style={{ fontSize: '.72rem', color: '#567060' }}>{packet.identity.world_slug} · {packet.identity.house_id} · {packet.degraded.active ? 'DEGRADED' : 'LIVE'}</p>
            <p style={{ fontSize: '.68rem', color: '#3a5045', marginTop: '.25rem', wordBreak: 'break-all' }}>
              fp: {packet.packet_fingerprint}
            </p>
            <button
              onClick={runReplay}
              style={{ marginTop: '1rem', padding: '.5rem 1.25rem', background: 'rgba(46,214,144,.12)', border: '1px solid rgba(46,214,144,.3)', borderRadius: 6, color: '#2ed690', fontSize: '.76rem', letterSpacing: '.05em', cursor: 'pointer' }}
            >
              Run deterministic replay
            </button>
          </section>

          {replay && (
            <section style={{ padding: '1.25rem', border: '1px solid rgba(114,204,166,.16)', borderRadius: 10, background: 'rgba(27,34,31,.7)' }}>
              <p style={{ fontSize: '.66rem', letterSpacing: '.06em', color: '#4d6e5d', marginBottom: '.75rem' }}>REPLAY OUTPUT</p>
              <GlyphSvg rendered={replay.rendered} />
              <dl style={{ display: 'grid', gap: '.35rem', marginTop: '1rem', fontSize: '.72rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr' }}>
                  <dt style={{ color: '#4d6e5d' }}>Replay fingerprint</dt>
                  <dd style={{ color: '#72c8a4', wordBreak: 'break-all' }}>{replay.output.replay_fingerprint}</dd>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr' }}>
                  <dt style={{ color: '#4d6e5d' }}>Packet fingerprint</dt>
                  <dd style={{ color: '#567060', wordBreak: 'break-all' }}>{replay.output.packet_fingerprint}</dd>
                </div>
                {verified !== null && (
                  <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr' }}>
                    <dt style={{ color: '#4d6e5d' }}>Verification</dt>
                    <dd style={{ color: verified ? '#4aaa74' : '#9a4a4a' }}>
                      {verified ? 'VERIFIED — fingerprint matches prior receipt' : 'MISMATCH — replay fingerprint differs'}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {receipts.length > 0 && (
            <section style={{ padding: '1.25rem', border: '1px solid rgba(114,204,166,.10)', borderRadius: 10, background: 'rgba(27,34,31,.4)' }}>
              <p style={{ fontSize: '.66rem', letterSpacing: '.06em', color: '#4d6e5d', marginBottom: '.75rem' }}>SESSION RECEIPT LEDGER</p>
              <div style={{ display: 'grid', gap: '.5rem' }}>
                {receipts.map((r) => (
                  <article key={r.receipt_id} style={{ padding: '.75rem 1rem', border: '1px solid rgba(114,204,166,.08)', borderRadius: 6, fontSize: '.72rem' }}>
                    <p style={{ color: '#72c8a4', marginBottom: '.2rem' }}>{r.packet_id}</p>
                    <p style={{ color: '#567060' }}>{r.world_slug} · {r.house_id}</p>
                    {r.replay?.replay_fingerprint && (
                      <p style={{ color: '#4d6e5d', marginTop: '.2rem', wordBreak: 'break-all' }}>
                        replay: {r.replay.replay_fingerprint}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <ArcsweepShell currentHref="/starwell/arcsweep-replay/" title="Replay">
    <ReplayApp />
  </ArcsweepShell>,
);
