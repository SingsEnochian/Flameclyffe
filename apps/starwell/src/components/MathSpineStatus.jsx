import React, { useEffect, useState } from 'react';
import { loadAndSubscribeMathSpine } from '../math-spine/live-math-spine.js';

export function MathSpineStatus({ worldId = 'terra-aeterna' }) {
  const [packet, setPacket] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [detail, setDetail] = useState('Reading the accepted derivation ledger…');

  useEffect(() => {
    let stop = () => {};
    let active = true;
    loadAndSubscribeMathSpine({
      worldId,
      onPacket(next) {
        if (!active) return;
        setPacket(next);
        setDetail(`Shared packet ${next.packet_fingerprint.slice(0, 12)} · cycle ${next.projection.released_state.spiral.cycle}`);
      },
      onStatus(next, error) {
        if (!active) return;
        setStatus(next);
        if (error) setDetail(error.message);
      },
    }).then((unsubscribe) => { stop = unsubscribe; }).catch((error) => {
      if (!active) return;
      setStatus('degraded');
      setDetail(`Live Math Spine unavailable: ${error.message}`);
    });
    return () => { active = false; stop(); };
  }, [worldId]);

  return (
    <aside className="math-spine-status" data-status={status} aria-live="polite">
      <span className="math-spine-status-mark" aria-hidden="true">⋈</span>
      <div>
        <strong>Math Spine · {packet ? 'SEATED' : 'WAITING'}</strong>
        <small>{detail}</small>
      </div>
      <code>{packet?.spine_version ?? 'hearthgate-braided-spine/1.8'}</code>
    </aside>
  );
}
