import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ThemeStudio from './ThemeStudio.jsx';
import FlameChannel from './FlameChannel.jsx';
import ArtifactBridgePanel from './ArtifactBridgePanel.jsx';
import { applyProjectZeroTheme, loadProjectZeroTheme } from './themeEngine.js';
import './deepObserverBridge.js';
import './extensions.css';

function CompanionBridgeExtensions() {
  const [theme, setTheme] = useState(() => {
    const current = loadProjectZeroTheme();
    applyProjectZeroTheme(current);
    return current;
  });

  return <><FlameChannel /><ArtifactBridgePanel /><ThemeStudio theme={theme} onChange={setTheme} /></>;
}

function mount() {
  const shell = document.querySelector('.shell');
  if (!shell || document.querySelector('[data-project-zero-companion-bridge]')) return false;
  const host = document.createElement('div');
  host.dataset.projectZeroCompanionBridge = 'true';
  host.className = 'project-zero-companion-bridge';
  const hero = shell.querySelector('.hero');
  if (hero?.nextSibling) shell.insertBefore(host, hero.nextSibling);
  else shell.prepend(host);
  createRoot(host).render(<CompanionBridgeExtensions />);
  return true;
}

applyProjectZeroTheme(loadProjectZeroTheme());
if (!mount()) {
  const observer = new MutationObserver(() => {
    if (mount()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
