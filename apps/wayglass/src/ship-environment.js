// Wayglass OS v0.1: a shared ship environment for all rooms and instruments.
// This is a browser/host contract, not evidence of a resident trained Wayglass LLM.
import { buildArcSweepReturnUrl } from '../../../lib/arcsweep-wayglass-passage.js';

export const WAYGLASS_SHIP_SCHEMA = 'wayglass.ship-environment/v0.1';
export const WAYGLASS_DEFAULT_ROUTE = 'local:crow';
export const WAYGLASS_DECKS = Object.freeze([
  Object.freeze({ room_id:'arcsweep:writing-room', slug:'writing', label:'Writing Room', domain:'cognition' }),
  Object.freeze({ room_id:'wayglass:frame-to-fold', slug:'fold', label:'Fold Observatory', domain:'navigation' }),
  Object.freeze({ room_id:'wayglass:living-observer', slug:'observer', label:'Living Observer', domain:'observation' }),
  Object.freeze({ room_id:'wayglass:library', slug:'library', label:'Research Library', domain:'research' }),
  Object.freeze({ room_id:'wayglass:commons', slug:'commons', label:'Commons', domain:'collaboration' }),
  Object.freeze({ room_id:'wayglass:systems', slug:'organs', label:'Ship Organs', domain:'os' }),
  Object.freeze({ room_id:'wayglass:video-atelier', slug:'video', label:'Video Atelier', domain:'creation' }),
  Object.freeze({ room_id:'wayglass:toybox', slug:'toybox', label:'Toybox', domain:'sensory' }),
]);

export const WAYGLASS_SHIP_RUNTIME = Object.freeze({
  schema:WAYGLASS_SHIP_SCHEMA,
  preferred_local_route:WAYGLASS_DEFAULT_ROUTE,
  native_wayglass_llm_trained:false,
  browser_engine:'Wayglass UI',
  cognition_control:'Hearthgate host route registry',
  private_participant_auth:'per-provider-or-crew-action',
  navigation_auth_required:false,
  physical_fold_claim:false,
});

export function resolveWayglassDeck(search = '') {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  return WAYGLASS_DECKS.find(deck => deck.slug === params.get('room'))?.room_id || 'arcsweep:writing-room';
}

export function wayglassDeckForRoom(roomId) {
  return WAYGLASS_DECKS.find(deck => deck.room_id === roomId) || null;
}

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export function mountWayglassShipNavigation({ document: doc = globalThis.document, currentHref = globalThis.location?.href, onNavigate, onAuthorizeBluebird } = {}) {
  if (!doc?.createElement || typeof onNavigate !== 'function') return null;
  const nav = doc.createElement('header');
  nav.className = 'wg-ship-chrome glass-panel';
  nav.setAttribute('data-wayglass-ship', WAYGLASS_SHIP_SCHEMA);
  const arcsweepHref = buildArcSweepReturnUrl(currentHref);
  nav.innerHTML = [
    '<div class="wg-ship-mast">',
      '<span aria-hidden="true" class="wg-ship-glyph">◇</span>',
      '<div><strong>WAYGLASS OS</strong><small>The ship · local-first</small></div>',
      '<a class="wg-ship-arcsweep" href="' + escape(arcsweepHref) + '">ArcSweep ↗</a>',
    '</div>',
    '<nav aria-label="Wayglass ship decks" class="wg-ship-decks">',
      WAYGLASS_DECKS.map(deck => '<button type="button" class="wg-ship-deck" data-ship-room="' + escape(deck.room_id) + '">' + escape(deck.label) + '</button>').join(''),
    '</nav>',
    '<div class="wg-ship-lower">',
      '<p><strong>Cognition:</strong> The Crow preferred · host availability unverified. Routes stay selectable in the Writing Room.</p>',
      '<button type="button" class="wg-ship-auth" data-ship-bluebird>Connect Bluebird · SpicyChat (optional)</button>',
      '<span class="wg-ship-status" role="status" aria-live="polite">Decks open without provider login.</span>',
    '</div>',
  ].join('');
  const status = nav.querySelector('.wg-ship-status');
  const update = roomId => {
    nav.querySelectorAll('[data-ship-room]').forEach(button => {
      const current = button.dataset.shipRoom === roomId;
      button.classList.toggle('is-current', current);
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  };
  nav.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-ship-room]');
    if (button) {
      const deck = wayglassDeckForRoom(button.dataset.shipRoom);
      if (!deck) return;
      try {
        await onNavigate(deck.room_id);
        status.textContent = deck.label + ' · aboard Wayglass.';
      } catch (error) {
        status.textContent = 'Cannot open ' + deck.label + ': ' + (error?.message || String(error));
      }
      return;
    }
    const authorize = event.target.closest?.('[data-ship-bluebird]');
    if (!authorize || typeof onAuthorizeBluebird !== 'function') return;
    authorize.disabled = true;
    status.textContent = 'Bluebird connection is optional. Other decks remain available.';
    try {
      const result = await onAuthorizeBluebird();
      status.textContent = result?.skipped ? 'Bluebird connection skipped. Ship remains open.' : 'Provider session accepted. Live SpicyChat turn still unverified.';
    } catch (error) {
      status.textContent = 'Bluebird session not connected: ' + (error?.message || String(error));
    } finally { authorize.disabled = false; }
  });
  const root = doc.querySelector('#app');
  if (root?.parentNode) root.parentNode.insertBefore(nav, root);
  else doc.body?.append(nav);
  update(resolveWayglassDeck(new URL(currentHref).search));
  return Object.freeze({ node:nav, setActive:update, destroy() { nav.remove(); } });
}
