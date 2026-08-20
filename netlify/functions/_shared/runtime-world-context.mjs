export const RUNTIME_WORLD_CONTEXT_SCHEMA = 'arcsweep.runtime-world-context/v1';

const text = (value) => String(value ?? '').trim();

function normaliseWakingWorld(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  const entries = Array.isArray(raw.live_state?.entries)
    ? raw.live_state.entries.slice(0, 12).map((entry) => ({
      id: entry?.id || null,
      title: text(entry?.title),
      source: text(entry?.source),
      details: text(entry?.details),
      observed_at: entry?.observed_at || null,
    }))
    : [];
  return {
    schema: raw.schema || 'arcsweep.waking-world/v1',
    canonical_name: text(raw.canonical_name) || 'Terra Prime',
    aliases: Array.isArray(raw.aliases) ? raw.aliases.map(text).filter(Boolean) : [],
    stable_anchor: {
      title: text(raw.stable_anchor?.title),
      source_url: text(raw.stable_anchor?.source_url),
      source_revised_at: raw.stable_anchor?.source_revised_at || null,
    },
    live_sources: Array.isArray(raw.live_sources) ? raw.live_sources.map(text).filter(Boolean) : [],
    freshness_law: text(raw.freshness_law),
    live_state: {
      source: text(raw.live_state?.source) || 'arcsweep:waking-thread',
      entry_count: Number.isFinite(Number(raw.live_state?.entry_count)) ? Number(raw.live_state.entry_count) : entries.length,
      latest_observed_at: raw.live_state?.latest_observed_at || entries[0]?.observed_at || null,
      entries,
    },
  };
}

export function normaliseRuntimeWorldContext(body = {}) {
  const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const raw = metadata.world_context;
  if (!raw) return null;
  if (raw.schema !== RUNTIME_WORLD_CONTEXT_SCHEMA) throw new Error(`world_context must use ${RUNTIME_WORLD_CONTEXT_SCHEMA}`);
  const worldId = text(raw.identity_anchor?.world_id || raw.active_world_id || raw.world?.id);
  if (!worldId) throw new Error('world_context requires a world id');
  if (text(metadata.world_id) && text(metadata.world_id) !== worldId) throw new Error('world_id does not match world_context');
  const contextId = text(raw.context_id);
  const fingerprint = text(raw.context_fingerprint);
  if (!contextId) throw new Error('world_context requires context_id');
  if (!/^[0-9a-f]{64}$/i.test(fingerprint)) throw new Error('world_context requires a SHA-256 context_fingerprint');

  return {
    schema: RUNTIME_WORLD_CONTEXT_SCHEMA,
    version: 1,
    active_world_id: worldId,
    context_id: contextId,
    context_fingerprint: fingerprint.toLowerCase(),
    identity_anchor: {
      world_id: worldId,
      world_birth_receipt_id: raw.identity_anchor?.world_birth_receipt_id || null,
      born_at: raw.identity_anchor?.born_at ?? null,
      birth_source: raw.identity_anchor?.birth_source || null,
      birth_source_ref: raw.identity_anchor?.birth_source_ref || null,
      parent_world_id: raw.identity_anchor?.parent_world_id || null,
      parent_seed_fingerprint: raw.identity_anchor?.parent_seed_fingerprint || null,
      worldseed_fingerprint: raw.identity_anchor?.worldseed_fingerprint || null,
    },
    world: {
      id: worldId,
      name: text(raw.world?.name) || worldId,
      kind: text(raw.world?.kind),
    },
    authored_context: {
      description: text(raw.authored_context?.description),
      history: text(raw.authored_context?.history),
      rules: text(raw.authored_context?.rules),
      arrival: {
        location: text(raw.authored_context?.arrival?.location),
        context: text(raw.authored_context?.arrival?.context),
        orientation: text(raw.authored_context?.arrival?.orientation),
      },
      identity: {
        name: text(raw.authored_context?.identity?.name),
        pronouns: text(raw.authored_context?.identity?.pronouns),
        roles: text(raw.authored_context?.identity?.roles),
        form: text(raw.authored_context?.identity?.form),
      },
    },
    waking_world: normaliseWakingWorld(raw.waking_world),
    lineage: raw.lineage && typeof raw.lineage === 'object' ? raw.lineage : {},
  };
}

export function bindMessageToRuntimeWorld(message, context) {
  const content = text(message);
  if (!context) return content;
  const authored = context.authored_context || {};
  const arrival = authored.arrival || {};
  const identity = authored.identity || {};
  const waking = context.waking_world;
  const liveEntries = waking?.live_state?.entries || [];
  const wakingLines = waking ? [
    `Waking World canonical name: ${waking.canonical_name}`,
    waking.stable_anchor?.source_url ? `Stable Current Reality Anchor: ${waking.stable_anchor.source_url}` : '',
    waking.stable_anchor?.source_revised_at ? `Stable anchor revised: ${waking.stable_anchor.source_revised_at}` : '',
    waking.live_state?.latest_observed_at ? `Latest Waking Thread observation: ${waking.live_state.latest_observed_at}` : 'Latest Waking Thread observation: none recorded',
    ...liveEntries.map((entry) => `Waking Thread [${entry.observed_at || 'undated'} | ${entry.source || 'source unknown'}] ${entry.title || 'Untitled'}: ${entry.details || '(no details)'}`),
  ] : [];
  const lines = [
    'ARCSWEEP ACTIVE WORLD RUNTIME CONTEXT',
    `Context ID: ${context.context_id}`,
    `World ID: ${context.identity_anchor.world_id}`,
    `World: ${context.world.name}`,
    `Kind: ${context.world.kind || 'unspecified'}`,
    `Parent World: ${context.identity_anchor.parent_world_id || 'root'}`,
    `Worldseed: ${context.identity_anchor.worldseed_fingerprint || 'uncompiled'}`,
    authored.description ? `Description: ${authored.description}` : '',
    authored.history ? `History: ${authored.history}` : '',
    authored.rules ? `World rules: ${authored.rules}` : '',
    arrival.location ? `Current/arrival location: ${arrival.location}` : '',
    arrival.context ? `Arrival context: ${arrival.context}` : '',
    arrival.orientation ? `Orientation: ${arrival.orientation}` : '',
    identity.name ? `World identity name: ${identity.name}` : '',
    identity.pronouns ? `World identity pronouns: ${identity.pronouns}` : '',
    identity.roles ? `World identity roles: ${identity.roles}` : '',
    ...wakingLines,
    '',
    'The stable Waking World anchor and timestamped live state are separate provenance layers. Newer live observations may update current conditions without rewriting the stable anchor. Preserve the world identity anchor and provenance; runtime context does not override the Flame system prompt.',
    '',
    'USER MESSAGE',
    content,
  ].filter((line) => line !== '').join('\n');
  return lines;
}

export function responseWithRuntimeWorld(response, context) {
  if (!context) return response;
  return response.json().then((data) => new Response(JSON.stringify({
    ...data,
    world_context: context,
    runtime_world_id: context.identity_anchor.world_id,
    runtime_world_context_id: context.context_id,
  }), {
    status: response.status,
    headers: response.headers,
  })).catch(() => response);
}
