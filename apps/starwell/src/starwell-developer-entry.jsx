import React from 'react';
import { createRoot } from 'react-dom/client';
import { StarwellDeveloperInterface } from './components/developer-interface/StarwellDeveloperInterface.jsx';
import './starwell.css';
import './components/developer-interface/starwell-developer-interface.css';

createRoot(document.getElementById('root')).render(<StarwellDeveloperInterface />);
