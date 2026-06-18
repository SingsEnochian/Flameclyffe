import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { LiveGlyphViewer as BaseLiveGlyphViewer, useSecondTicker } from './live-glyph.jsx';
import {
  DEEP_HUD_LAYER_CLASS,
  DEEP_HUD_LAYER_OWNER,
  DEEP_HUD_LAYER_STATE,
  DEEP_HUD_PANEL_SELECTOR,
  DEEP_HUD_ROOT_SELECTOR,
  DEEP_HUD_SCOPE_LAYER_SELECTOR,
} from './lib/deepHudLayerContract.js';

function findHudPanel() {
  return document.querySelector(DEEP_HUD_PANEL_SELECTOR);
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

    const root = document.querySelector(DEEP_HUD_ROOT_SELECTOR) || document.body;
    observer = new MutationObserver(updatePanel);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
    };
  }, []);

  if (!panel || panel.querySelector(DEEP_HUD_SCOPE_LAYER_SELECTOR)) return null;

  return createPortal(
    React.createElement('div', {
      className: DEEP_HUD_LAYER_CLASS,
      'data-deep-hud-layer': DEEP_HUD_LAYER_STATE.empty,
      'data-deep-hud-layer-owner': DEEP_HUD_LAYER_OWNER.react,
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
