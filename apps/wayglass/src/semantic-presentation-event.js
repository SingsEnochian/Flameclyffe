// Presentation-only FAEberpunk semantic envelope. Never grants permissions or infers cognition.
// Consumers may animate a verified application event, but must independently check authority.
import { normaliseMaterialSignal } from './material-state.js';

const PHASES = new Set(['rest', 'target', 'arm', 'capture', 'move', 'release', 'settle', 'cancel']);
const CHANNELS = new Set(['IC', 'OOC']);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const bounded = (value, limit = 128) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const identifier = value => { const v = bounded(value); return ID.test(v) ? v : null; };
const frozen = obj => Object.freeze(obj);

export function normaliseSemanticEvent(input = {}) {
  const material = normaliseMaterialSignal(input.material ?? input);
  const phase = PHASES.has(input.phase) ? input.phase : 'rest';
  const actor = frozen({
    participant_id: identifier(input.actor?.participant_id),
    worker_id: identifier(input.actor?.worker_id),
    model_id: identifier(input.actor?.model_id),
    session_id: identifier(input.actor?.session_id),
  });
  const provenance = frozen({
    source_sha: /^[a-f0-9]{40}$/.test(input.provenance?.source_sha ?? '') ? input.provenance.source_sha : null,
    receipt_id: identifier(input.provenance?.receipt_id),
    source_event_id: identifier(input.provenance?.source_event_id),
  });
  return frozen({
    schema: 'wayglass.presentation-event/v1',
    event_id: identifier(input.event_id),
    phase,
    target: identifier(input.target),
    channel: CHANNELS.has(input.channel) ? input.channel : material.channel,
    actor,
    provenance,
    material,
    // This is an observation of presentation state, NOT consent or authentication.
    feather: input.feather === true,
    reduced_motion: input.reduced_motion === true,
    presentation_only: true,
  });
}

export function presentationInstructions(event) {
  const e = normaliseSemanticEvent(event);
  const still = e.feather || e.reduced_motion || e.phase === 'cancel' || e.phase === 'rest';
  return frozen({
    event: e,
    animate: !still,
    sound: !still && e.phase !== 'target',
    haptics: !still && e.phase === 'capture',
    instant_reading: still,
    // No input in this module authorises dispatch, canon changes or provider calls.
    dispatch_authorised: false,
  });
}
