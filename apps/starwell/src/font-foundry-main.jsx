import React from 'react';
import { createRoot } from 'react-dom/client';
import FontForgeDock from './components/glyph-studio/FontForgeDock.jsx';
import './starwell.css';

function FontFoundryInstrument() {
  return (
    <main className="font-foundry-standalone">
      <header className="gate-header">
        <div>
          <p>ARCSWEEP · GLYPH FAMILY</p>
          <h1>Font Foundry</h1>
          <span>The existing local FontForge compiler dock, with explicit health and degraded states.</span>
        </div>
        <a href="../glyph-studio/">Open Glyph Lab</a>
      </header>
      <FontForgeDock />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<FontFoundryInstrument />);
