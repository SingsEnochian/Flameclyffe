import React from 'react';
import { createRoot } from 'react-dom/client';
import SignalWell from './components/signal-well/SignalWell.jsx';
import SignalSourceArray from './components/signal-well/SignalSourceArray.jsx';
import './components/signal-well/signal-well.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SignalWell />
    <div className="signal-well-shell source-array-shell">
      <SignalSourceArray />
    </div>
  </React.StrictMode>,
);
