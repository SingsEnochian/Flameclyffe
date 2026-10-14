const MAX_TILT_X = 0.55;
const MAX_TILT_Y = 0.8;

const motionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const pointerQuery = globalThis.matchMedia?.('(pointer: fine)');

function enabled() {
  return motionQuery?.matches !== true && pointerQuery?.matches === true;
}

function eligiblePanel(target) {
  const panel = target?.closest?.('.panel');
  if (!panel) return null;
  if (panel.closest('#houseglass, .modal-backdrop, .return-dialog')) return null;
  if (panel.classList.contains('hero')) return panel;
  if (panel.parentElement?.matches('.grid, .split-layout')) return panel;
  return null;
}

function reset(panel) {
  if (!panel) return;
  panel.style.setProperty('--board-tilt-x', '0deg');
  panel.style.setProperty('--board-tilt-y', '0deg');
  panel.removeAttribute('data-board-hover');
}

function armShell(root) {
  const shell = root.querySelector('.app-shell');
  if (!shell) return;
  shell.dataset.boardDepth = enabled() ? 'sculpted' : 'quiet';
}

function install() {
  const root = document.querySelector('#app');
  if (!root) return;

  armShell(root);
  const observer = new MutationObserver(() => armShell(root));
  observer.observe(root, { childList: true, subtree: true });

  root.addEventListener('pointermove', (event) => {
    if (!enabled()) return;
    const panel = eligiblePanel(event.target);
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    panel.dataset.boardHover = 'true';
    panel.style.setProperty('--board-tilt-x', `${(-ny * MAX_TILT_X).toFixed(2)}deg`);
    panel.style.setProperty('--board-tilt-y', `${(nx * MAX_TILT_Y).toFixed(2)}deg`);
  }, { passive: true });

  root.addEventListener('pointerout', (event) => {
    const panel = eligiblePanel(event.target);
    if (!panel || panel.contains(event.relatedTarget)) return;
    reset(panel);
  }, { passive: true });

  const refresh = () => {
    armShell(root);
    if (enabled()) return;
    root.querySelectorAll('[data-board-hover]').forEach(reset);
  };

  motionQuery?.addEventListener?.('change', refresh);
  pointerQuery?.addEventListener?.('change', refresh);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
