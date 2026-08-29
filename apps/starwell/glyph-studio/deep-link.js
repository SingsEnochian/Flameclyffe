const PANEL_LABELS = Object.freeze({
  glyph: 'Glyph',
  brush: 'Brushes',
  colour: 'Colour',
  layers: 'Layers',
  text: 'Text',
});

function requestedPanel() {
  return new URLSearchParams(window.location.search).get('panel') || '';
}

function openRequestedPanel() {
  const label = PANEL_LABELS[requestedPanel()];
  if (!label) return true;
  const button = [...document.querySelectorAll('.inspector-tabs button')]
    .find((candidate) => candidate.textContent?.trim() === label);
  if (!button) return false;
  if (!button.classList.contains('pressed')) button.click();
  document.title = `${requestedPanel() === 'brush' ? 'Brush Foundry' : 'Glyph Lab'} · STARWELL`;
  return true;
}

if (!openRequestedPanel()) {
  const observer = new MutationObserver(() => {
    if (openRequestedPanel()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}
