import { StorySoundscape } from './story-soundscape.js';

export const STORY_SOUNDSCAPE_SINGLETON_BRIDGE_VERSION = 'arcsweep.story-soundscape-singleton-bridge/v1';

const GLOBAL_KEY = '__arcsweepStorySoundscape';
const INSTALL_KEY = Symbol.for('arcsweep.story-soundscape-singleton-bridge.installed');

function publish(instance) {
  if (!globalThis[GLOBAL_KEY]) globalThis[GLOBAL_KEY] = instance;
  try {
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:story-soundscape-ready', {
      detail: { schema: STORY_SOUNDSCAPE_SINGLETON_BRIDGE_VERSION, reused_existing_instance: true },
    }));
  } catch {}
}

function install() {
  const prototype = StorySoundscape.prototype;
  if (prototype[INSTALL_KEY]) return;

  // main.js owns the canonical StorySoundscape instance but historically kept it
  // module-private. Install a one-assignment constructor seam before main.js runs:
  // the constructor's first `this.context = null` captures that existing instance,
  // then immediately restores `context` as a normal own data property. No second
  // StorySoundscape is created and no audio graph is cloned.
  if (!Object.getOwnPropertyDescriptor(prototype, 'context')) {
    Object.defineProperty(prototype, 'context', {
      configurable: true,
      get() { return undefined; },
      set(value) {
        Object.defineProperty(this, 'context', {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        });
        publish(this);
      },
    });
  }

  Object.defineProperty(prototype, INSTALL_KEY, { configurable: true, value: true });
}

install();

export function activeStorySoundscape() {
  return globalThis[GLOBAL_KEY] || null;
}
