import React from 'react';
import { createRoot } from 'react-dom/client';
import GlyphStudio from './components/glyph-studio/GlyphStudio.jsx';
import FontForgeDock from './components/glyph-studio/FontForgeDock.jsx';
import './components/glyph-studio/glyph-studio.css';
import './components/glyph-studio/glyph-studio-panels.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlyphStudio />
    <FontForgeDock />
  </React.StrictMode>,
);
