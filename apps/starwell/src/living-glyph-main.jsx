import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiveGlyphViewer, useSecondTicker } from './live-glyph.jsx';
import './starwell.css';

function LivingGlyphInstrument() {
  const now = useSecondTicker();
  return (
    <main className="living-glyph-standalone">
      <header className="gate-header">
        <div>
          <p>ARCSWEEP · GLYPH FAMILY</p>
          <h1>Living Glyph</h1>
          <span>The existing DEEP mathematical glyph instrument, mounted directly rather than copied.</span>
        </div>
        <a href="../">Return to STARWELL</a>
      </header>
      <LiveGlyphViewer now={now} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<LivingGlyphInstrument />);
