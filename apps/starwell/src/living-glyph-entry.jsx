import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LiveGlyphViewer, useSecondTicker } from './live-glyph-dual.jsx';
import { subscribeToDualAspectActivation } from './hearthweave-kernel/activation.js';
import { enrichPacketWithSpiralState } from './harmonic-spiral/spiral-wire.js';
import './hearthweave-kernel/dual-aspect-boundary.css';
import ArcsweepShell from './shell/ArcsweepShell.jsx';

const HARMONIC_PACKET_KEY = 'hearthweave:harmonic-packet:v1';

function installSpiralWire() {
  return subscribeToDualAspectActivation(
    (packet) => {
      if (!packet) return;
      try {
        const enriched = enrichPacketWithSpiralState(packet);
        sessionStorage.setItem(HARMONIC_PACKET_KEY, JSON.stringify(enriched));
      } catch {
        // enrichment failed — sealed packet still drives renderer
      }
    },
    { eventTarget: window, storage: sessionStorage, emitCurrent: true },
  );
}

function LivingGlyphPage() {
  const now = useSecondTicker();
  useEffect(() => installSpiralWire(), []);
  return <LiveGlyphViewer now={now} />;
}

createRoot(document.getElementById('root')).render(
  <ArcsweepShell currentHref="/starwell/living-glyph/" title="Living Glyph">
    <LivingGlyphPage />
  </ArcsweepShell>,
);
