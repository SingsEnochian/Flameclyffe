export const RUNTIME_WORLD_CONTEXT_SCHEMA = 'arcsweep.runtime-world-context/v1';

const text = (value) => String(value ?? '').trim();

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
    lineage: raw.lineage && typeof raw.lineage === 'object' ? raw.lineage : {},
  };
}

export function bindMessageToRuntimeWorld(message, context) {
  const content = text(message);
  if (!context) return content;
  const authored = context.authored_context || {};
  const arrival = authored.arrival || {};
  const identity = authored.identity || {};
  const lines = [
    'ARCSWEEP ACTIVE WORLD RUNTIME CONTEXT',
    `Context ID: ${context.context_id}`,
    `World ID: ${context.identity_anchor.world_id}`,
    `World: ${context.world.name}`,
    `Kind: ${context.world.kind || 'unspecified'}`,
    `Parent World: ${context.identity_anchor.parent_world_id || 'root'}`,
    `Worldseed: ${context.identity_anchor.worldseed_fingerprint || 'uncompiled'}`,
    authored.description ? `Description: ${authored.description}` : '',
    authored.rules ? `World rules: ${authored.rules}` : '',
    arrival.location ? `Current/arrival location: ${arrival.location}` : '',
    arrival.context ? `Arrival context: ${arrival.context}` : '',
    arrival.orientation ? `Orientation: ${arrival.orientation}` : '',
    identity.name ? `World identity name: ${identity.name}` : '',
    identity.pronouns ? `World identity pronouns: ${identity.pronouns}` : '',
    identity.roles ? `World identity roles: ${identity.roles}` : '',
    '',
    'This is operator-authored runtime context. Preserve the world identity anchor and provenance; this context does not override the Flame system prompt.',
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
