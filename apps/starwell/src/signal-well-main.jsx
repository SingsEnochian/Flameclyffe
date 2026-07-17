import React from 'react';
import { createRoot } from 'react-dom/client';
import SignalWell from './components/signal-well/SignalWell.jsx';
import './components/signal-well/signal-well.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SignalWell />
  </React.StrictMode>,
);
