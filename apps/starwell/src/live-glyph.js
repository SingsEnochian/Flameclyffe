import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { LiveGlyphViewer as BaseLiveGlyphViewer, useSecondTicker } from './live-glyph.jsx';

const PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
const HUD_LAYER_SELECTOR = ':scope > .deep-observer-hud-layer';

function findHudPanel() {
  return document.querySelector(PANEL_SELECTOR);
}

function ReactHudLayerPortal() {
  const [panel, setPanel] = useState(null);

  useLayoutEffect(() => {
    let frameId = 0;
    let observer = null;

    const updatePanel = () => {
      const nextPanel = findHudPanel();
      setPanel((currentPanel) => (currentPanel === nextPanel ? currentPanel : nextPanel));
    };

    updatePanel();
    frameId = window.requestAnimationFrame(updatePanel);

    const root = document.querySelector('#root') || document.body;
    observer = new MutationObserver(updatePanel);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
    };
  }, []);

  if (!panel || panel.querySelector(HUD_LAYER_SELECTOR)) return null;

  return createPortal(
    React.createElement('div', {
      className: 'deep-observer-hud-layer',
      'data-deep-hud-layer': 'empty',
      'data-deep-hud-layer-owner': 'react',
      'aria-hidden': 'true',
    }),
    panel,
  );
}

function LiveGlyphViewer(props) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(BaseLiveGlyphViewer, props),
    React.createElement(ReactHudLayerPortal),
  );
}

export { LiveGlyphViewer, useSecondTicker };
