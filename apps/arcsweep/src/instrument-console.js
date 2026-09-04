import { APPLET_CATALOGUE } from './applets.js';

export const INSTRUMENT_CONSOLE_SCHEMA = 'arcsweep.instrument-console/v1';
export const APPLET_COMPLETENESS_MATRIX_SCHEMA = 'arcsweep.applet-completeness-matrix/v1';
export const BRAID_GLYPH_SCHEMA = 'arcsweep.braid-glyph/v1';

export const ORGAN_HEALTH_STATES = Object.freeze(['registered', 'configured', 'verified-live', 'degraded', 'offline', 'unknown']);

export function buildInstrumentContext(state) {
  const world = state?.worlds?.find((item) => item.id === state.activeWorldId) || state?.worlds?.[0] || null;
  return Object.freeze({
    schema: INSTRUMENT_CONSOLE_SCHEMA,
    worldId: world?.id || null,
    worldName: world?.name || null,
    worldKind: world?.kind || null,
    worldseedFingerprint: world?.worldseedFingerprint || null,
    activeRoom: globalThis.document?.querySelector?.('.sidebar [data-room].active')?.dataset?.room || null,
    source: 'arcsweep',
  });
}

export function contextualLaunchUrl(href, context = {}, appletId = '') {
  if (!href) return '';
  const base = globalThis.location?.origin || 'https://singsenochian.github.io';
  const url = new URL(href, base);
  if (context.worldId) url.searchParams.set('worldId', context.worldId);
  if (context.worldName) url.searchParams.set('worldName', context.worldName);
  if (context.worldseedFingerprint) url.searchParams.set('worldseed', context.worldseedFingerprint);
  url.searchParams.set('from', 'arcsweep');
  if (appletId) url.searchParams.set('appletId', appletId);
  const relative = href.startsWith('/') && url.origin === base ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  return relative;
}

export function normaliseFavourites(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(String).filter((id) => APPLET_CATALOGUE.some((item) => item.id === id)))];
}

export function appletHealth(applet, probe = null) {
  if (!applet) return Object.freeze({ state: 'unknown', reason: 'unregistered applet' });
  if (probe?.ok === true) return Object.freeze({ state: 'verified-live', reason: probe.reason || 'launch target responded' });
  if (probe?.ok === false) return Object.freeze({ state: 'offline', reason: probe.reason || 'launch target did not respond' });
  if (applet.pagesHref) return Object.freeze({ state: 'configured', reason: 'canonical launch target registered; live target not yet probed' });
  return Object.freeze({ state: 'registered', reason: 'native ArcSweep room registered' });
}

export function buildAppletCompletenessMatrix(state, probes = {}) {
  const worlds = Array.isArray(state?.worlds) ? state.worlds : [];
  const rows = worlds.flatMap((world) => {
    const layout = new Map((world.applets || []).map((item) => [item.id, item]));
    return APPLET_CATALOGUE.map((applet) => {
      const item = layout.get(applet.id);
      const health = appletHealth(applet, probes[applet.id]);
      return Object.freeze({
        worldId: world.id,
        worldName: world.name,
        appletId: applet.id,
        label: item?.customLabel || applet.label,
        category: applet.category,
        selected: Boolean(item?.visible),
        persisted: Boolean(item),
        routeKind: applet.pagesHref ? 'launch-target' : 'native-room',
        health: health.state,
        healthReason: health.reason,
      });
    });
  });
  return Object.freeze({
    schema: APPLET_COMPLETENESS_MATRIX_SCHEMA,
    worldCount: worlds.length,
    appletCount: APPLET_CATALOGUE.length,
    rows,
  });
}

export function braidGlyph(receipt = null) {
  if (receipt?.event_type === 'model-reply-receipted' || receipt?.event_id) {
    return Object.freeze({ schema: BRAID_GLYPH_SCHEMA, glyph: '◈', state: 'verified', label: `braided${receipt.event_sequence != null ? ` #${receipt.event_sequence}` : ''}`, receiptId: receipt.event_id || null });
  }
  return Object.freeze({ schema: BRAID_GLYPH_SCHEMA, glyph: '◇', state: 'not-observed', label: 'receipt not observed', receiptId: null });
}
