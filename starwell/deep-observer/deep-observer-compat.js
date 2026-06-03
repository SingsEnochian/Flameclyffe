/* DEEP Observer Browser Compatibility Guard v0.1 */
'use strict';

(() => {
  const features = {
    webAudio: Boolean(window.AudioContext || window.webkitAudioContext),
    pointerEvents: 'PointerEvent' in window,
    touchEvents: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    vibration: 'vibrate' in navigator,
    localStorage: false,
    clipboard: Boolean(navigator.clipboard && navigator.clipboard.writeText),
    backdropFilter: false,
    cssSupports: Boolean(window.CSS && CSS.supports)
  };

  try {
    const key = '__deep_observer_storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    features.localStorage = true;
  } catch (e) {
    features.localStorage = false;
  }

  try {
    features.backdropFilter = Boolean(
      window.CSS && CSS.supports && (
        CSS.supports('backdrop-filter', 'blur(1px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
      )
    );
  } catch (e) {
    features.backdropFilter = false;
  }

  function setClass(name, enabled) {
    document.documentElement.classList.toggle(name, enabled);
    document.body?.classList.toggle(name, enabled);
  }

  function applyClasses() {
    setClass('has-web-audio', features.webAudio);
    setClass('no-web-audio', !features.webAudio);
    setClass('has-pointer-events', features.pointerEvents);
    setClass('no-pointer-events', !features.pointerEvents);
    setClass('has-vibration', features.vibration);
    setClass('no-vibration', !features.vibration);
    setClass('has-local-storage', features.localStorage);
    setClass('no-local-storage', !features.localStorage);
    setClass('has-clipboard', features.clipboard);
    setClass('no-clipboard', !features.clipboard);
    setClass('has-backdrop-filter', features.backdropFilter);
    setClass('no-backdrop-filter', !features.backdropFilter);
  }

  function status() {
    const supported = [features.webAudio, features.pointerEvents || features.touchEvents, features.localStorage, features.backdropFilter].filter(Boolean).length;
    if (supported >= 4) return ['good', 'Compatibility: full instrument mode'];
    if (supported >= 2) return ['mixed', 'Compatibility: graceful fallback mode'];
    return ['limited', 'Compatibility: limited fallback mode'];
  }

  function ensurePill() {
    if (document.getElementById('compatPill')) return;
    const panel = document.querySelector('.panel');
    if (!panel) return;
    const [kind, text] = status();
    const pill = document.createElement('p');
    pill.id = 'compatPill';
    pill.className = `compat-pill ${kind}`;
    pill.textContent = text;
    panel.insertBefore(pill, panel.firstElementChild);
  }

  function safeClipboardFallback() {
    if (features.clipboard) return;
    document.addEventListener('click', event => {
      const copy = event.target.closest?.('#copyPacket');
      if (!copy) return;
      const packet = document.getElementById('packet');
      if (!packet) return;
      const selection = window.getSelection?.();
      const range = document.createRange?.();
      if (selection && range) {
        selection.removeAllRanges();
        range.selectNodeContents(packet);
        selection.addRange(range);
      }
    }, { passive: true });
  }

  function localStorageFallback() {
    if (features.localStorage) return;
    document.addEventListener('click', event => {
      const save = event.target.closest?.('#saveLocal');
      if (!save) return;
      const hint = document.getElementById('instrumentHint');
      if (hint) hint.textContent = 'Local storage is unavailable in this browser mode. Copy the packet instead.';
    }, { passive: true });
  }

  function expose() {
    window.DEEP_OBSERVER_COMPAT = {
      ...features,
      note: 'Feature-detected compatibility guard. Unsupported features should degrade gracefully, not break the instrument.'
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyClasses();
    ensurePill();
    safeClipboardFallback();
    localStorageFallback();
    expose();
  });
})();
