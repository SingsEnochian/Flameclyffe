import { loadState, saveState } from '../../../arcsweep/src/storage.js';
import { buildRuntimeWorldContext } from '../../../arcsweep/src/runtime-world-context.js';
import { normaliseContinuityEvidenceLedger, evidenceForWorld } from '../../../arcsweep/src/continuity-evidence-state.js';
import { getActiveWorld } from '../../../arcsweep/src/worlds.js';
import { visibleApplets } from '../../../arcsweep/src/applets.js';

export const WAYGLASS_WORLD_CONTINUITY_SURFACE = 'wayglass:world-continuity';
export const WAYGLASS_WORLD_CONTINUITY_SCHEMA = 'wayglass.world-continuity-surface/v1';

const html = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function text(value) {
  return String(value ?? '').trim();
}

function worldSummary(world) {
  return [
    world?.kind || 'World',
    world?.lineageLabel || 'Root world',
    world?.worldseedFingerprint ? 'Worldseed ' + world.worldseedFingerprint.slice(0, 14) + '…' : 'Worldseed not compiled',
  ].join(' · ');
}

function continuityLedger(state) {
  return normaliseContinuityEvidenceLedger(state?.continuityEvidence);
}

export async function mountWayglassWorldContinuitySurface(root) {
  let mounted = true;
  let busy = false;
  let state = await loadState();
  let active = getActiveWorld(state);
  let runtimeContext = active ? await buildRuntimeWorldContext(state, active.id) : null;

  root.innerHTML = [
    '<section class="wg-surface wg-world-continuity" data-surface="wayglass-world-continuity">',
      '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
        '<button type="button" class="glass-chip active" aria-current="page">World & Continuity</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:writing-room">Writing Room</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button>',
      '</nav>',
      '<header class="wg-surface-head glass-panel">',
        '<div><p class="eyebrow">Wayglass · native ArcSweep lineage</p><h1>World & Continuity</h1>',
        '<p class="lede">ArcSweep world state now runs as a native Wayglass organ. The old ArcSweep namespace remains only for compatibility with saved links and receipts.</p></div>',
        '<div class="systems-vitals" aria-label="World continuity status">',
          '<span><strong data-world-count>0</strong> worlds</span>',
          '<span><strong data-continuity-count>0</strong> continuity receipts</span>',
          '<span><strong>0</strong> iframe boundaries</span>',
        '</div>',
      '</header>',
      '<section class="glass-panel" style="border-radius:1.5rem;padding:1.25rem;margin-block:1rem;">',
        '<p class="eyebrow">Active world</p>',
        '<div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:end;">',
          '<label style="display:grid;gap:.35rem;min-width:min(28rem,100%);">World<select data-world-select aria-label="Active Wayglass world"></select></label>',
          '<button type="button" class="glass-chip" data-refresh>Refresh inherited state</button>',
        '</div>',
        '<p data-world-state role="status" class="tiny">Reading native world state…</p>',
      '</section>',
      '<section class="glass-panel" data-world-card style="border-radius:1.5rem;padding:1.25rem;margin-block:1rem;"></section>',
      '<section class="glass-panel" style="border-radius:1.5rem;padding:1.25rem;margin-block:1rem;">',
        '<p class="eyebrow">Continuity evidence</p><h2>Receipts carried with this world</h2>',
        '<div data-continuity-list></div>',
      '</section>',
      '<section class="glass-panel" style="border-radius:1.5rem;padding:1.25rem;margin-block:1rem;">',
        '<p class="eyebrow">Inherited ArcSweep instruments</p><h2>Mounted in the Wayglass body</h2>',
        '<p class="tiny">These are the active world’s inherited instrument declarations. They are state carried by Wayglass now, not links to a second application.</p>',
        '<div class="organ-tags" data-applet-list></div>',
      '</section>',
      '<footer class="wg-receipt tiny">Storage schema compatibility is preserved. Canonical surface authority is Wayglass; legacy <code>arcsweep:*</code> identifiers are aliases only.</footer>',
    '</section>'
  ].join('');

  const worldSelect = root.querySelector('[data-world-select]');
  const worldState = root.querySelector('[data-world-state]');
  const worldCard = root.querySelector('[data-world-card]');
  const continuityList = root.querySelector('[data-continuity-list]');
  const appletList = root.querySelector('[data-applet-list]');
  const worldCount = root.querySelector('[data-world-count]');
  const continuityCount = root.querySelector('[data-continuity-count]');
  const refresh = root.querySelector('[data-refresh]');

  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });

  function renderWorldOptions() {
    worldSelect.replaceChildren(...state.worlds.map(world => {
      const option = root.ownerDocument.createElement('option');
      option.value = world.id;
      option.textContent = world.name || world.id;
      option.selected = world.id === state.activeWorldId;
      return option;
    }));
  }

  function render() {
    if (!mounted) return;
    active = getActiveWorld(state);
    const ledger = continuityLedger(state);
    const evidence = active ? evidenceForWorld(ledger, active.id) : [];
    const applets = active ? visibleApplets(active.applets || []) : [];

    worldCount.textContent = String(state.worlds.length);
    continuityCount.textContent = String(ledger.entries.length);
    renderWorldOptions();

    if (!active) {
      worldCard.innerHTML = '<p>No world is available in the inherited registry.</p>';
      continuityList.innerHTML = '<p class="tiny">No continuity evidence.</p>';
      appletList.innerHTML = '';
      return;
    }

    const birth = (state.worldBirthReceipts || []).find(item => item?.worldId === active.id);
    worldCard.innerHTML = [
      '<p class="eyebrow">' + html(worldSummary(active)) + '</p>',
      '<h2>' + html(active.name || active.id) + '</h2>',
      active.description ? '<p>' + html(active.description) + '</p>' : '<p class="tiny">No authored world description.</p>',
      '<dl class="wg-world-facts">',
        '<div><dt>World ID</dt><dd>' + html(active.id) + '</dd></div>',
        '<div><dt>Birth receipt</dt><dd>' + html(birth?.id || 'not recorded') + '</dd></div>',
        '<div><dt>Runtime context</dt><dd>' + html(runtimeContext?.context_id || 'not minted') + '</dd></div>',
        '<div><dt>Storage</dt><dd>' + html(state.provenance?.storage || 'unknown') + '</dd></div>',
      '</dl>',
      '<div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem;">',
        '<button type="button" class="glass-chip" data-open-writing>Open Writing Room here</button>',
        '<button type="button" class="glass-chip" data-open-observer>Observe this world</button>',
      '</div>',
    ].join('');

    continuityList.innerHTML = evidence.length
      ? evidence.slice(-24).reverse().map(entry => [
          '<article class="turn-card">',
            '<header><strong>' + html(entry.kind) + '</strong><span>' + html(entry.recorded_at || '') + '</span></header>',
            '<div class="turn-text"><code>' + html(entry.evidence_id) + '</code></div>',
            '<footer>' + html(entry.origin?.organ || 'source receipt') + '</footer>',
          '</article>',
        ].join('')).join('')
      : '<p class="tiny">No recognition/admissibility receipts are attached to this world yet.</p>';

    appletList.innerHTML = applets.length
      ? applets.map(applet => '<span title="' + html(applet.category || 'instrument') + '">' + html(applet.label) + '</span>').join('')
      : '<span>No visible inherited instruments.</span>';

    worldCard.querySelector('[data-open-writing]')?.addEventListener('click', () => {
      globalThis.__wayglassOS?.fullSpectrum?.setScope({ room: 'wayglass:writing-room', world: active.id });
      globalThis.__wayglassOS?.mount('wayglass:writing-room');
    });
    worldCard.querySelector('[data-open-observer]')?.addEventListener('click', () => {
      globalThis.__wayglassOS?.fullSpectrum?.setScope({ room: 'wayglass:living-observer', world: active.id });
      globalThis.__wayglassOS?.mount('wayglass:living-observer');
    });
  }

  async function activateWorld(worldId) {
    if (busy || !state.worlds.some(world => world.id === worldId)) return;
    busy = true;
    worldSelect.disabled = true;
    worldState.textContent = 'Binding Wayglass to the selected world…';
    try {
      state.activeWorldId = worldId;
      await saveState(state, { reason: 'wayglass-native-world-selection' });
      runtimeContext = await buildRuntimeWorldContext(state, worldId);
      globalThis.__wayglassOS?.fullSpectrum?.setScope({ room: WAYGLASS_WORLD_CONTINUITY_SURFACE, world: worldId });
      worldState.textContent = 'Active world bound natively · ' + (runtimeContext?.context_id || worldId);
      render();
    } catch (error) {
      worldState.textContent = 'World selection could not be persisted: ' + error.message;
    } finally {
      busy = false;
      worldSelect.disabled = false;
    }
  }

  async function reload() {
    if (busy) return;
    busy = true;
    refresh.disabled = true;
    worldState.textContent = 'Refreshing inherited ArcSweep state inside Wayglass…';
    try {
      state = await loadState();
      active = getActiveWorld(state);
      runtimeContext = active ? await buildRuntimeWorldContext(state, active.id) : null;
      worldState.textContent = active
        ? 'Native state current · ' + (runtimeContext?.context_id || active.id)
        : 'No active world in the inherited registry.';
      render();
    } catch (error) {
      worldState.textContent = 'Native world state unavailable: ' + error.message;
    } finally {
      busy = false;
      refresh.disabled = false;
    }
  }

  worldSelect.addEventListener('change', () => void activateWorld(worldSelect.value));
  refresh.addEventListener('click', () => void reload());

  worldState.textContent = active
    ? 'Native state current · ' + (runtimeContext?.context_id || active.id)
    : 'No active world in the inherited registry.';
  render();

  return Object.freeze({
    schema: WAYGLASS_WORLD_CONTINUITY_SCHEMA,
    surface_id: WAYGLASS_WORLD_CONTINUITY_SURFACE,
    legacy_lineage: Object.freeze(['arcsweep:deck', 'arcsweep:world-registry', 'arcsweep:continuity-evidence']),
    get active_world_id() { return state.activeWorldId || null; },
    destroy() { mounted = false; },
  });
}
