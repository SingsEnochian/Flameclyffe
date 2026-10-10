const COMMANDS = Object.freeze({
  'Alt+KeyI': 'channel:ic',
  'Alt+KeyO': 'channel:ooc',
  'Alt+KeyR': 'focus:route',
  'Alt+KeyW': 'focus:composer',
  'Alt+Slash': 'help:keyboard',
});

export function commandForKeyboardEvent(event = {}) {
  if (!event.altKey || event.ctrlKey || event.metaKey) return null;
  const key = 'Alt+' + String(event.code || '');
  return COMMANDS[key] || null;
}

function isEditableTarget(target) {
  const tag = String(target?.tagName || '').toLowerCase();
  return Boolean(target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
}

export function installKeyboardControls({ root = document } = {}) {
  if (!root?.addEventListener) return null;

  function keydown(event) {
    const command = commandForKeyboardEvent(event);
    if (!command) return;

    // Alt commands remain available while typing because they do not collide
    // with ordinary text entry. Browser/OS-reserved combinations still win.
    if (isEditableTarget(event.target) && !event.altKey) return;

    event.preventDefault();
    if (typeof globalThis.CustomEvent === 'function') {
      globalThis.dispatchEvent?.(new CustomEvent('wayglass:command', {
        detail: Object.freeze({ command, source: 'keyboard' }),
      }));
    }
  }

  root.addEventListener('keydown', keydown);

  return Object.freeze({
    commands: COMMANDS,
    destroy() {
      root.removeEventListener('keydown', keydown);
    },
  });
}
