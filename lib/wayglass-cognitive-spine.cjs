'use strict';

// The cognitive spine is an owner-declared model binding, NOT the mathematical
// Canonical Spine, an identity proof, a successful deployment or model training.
// One active model powers the Ship Voice and the Amber speaking place.
const SCHEMA = 'wayglass.cognitive-spine/v0.1';
const OWNER_SELECTED_ORION_TAG = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M';
const MODEL_SETTINGS = Object.freeze([
  'WAYGLASS_SPINE_MODEL',
  'WAYGLASS_SHIP_MODEL',
  'WAYGLASS_AMBER_MODEL',
]);

function inspectWayglassCognitiveSpine(env = process.env) {
  const entries = MODEL_SETTINGS
    .map(key => [key, String(env[key] || '').trim()])
    .filter(([,value]) => value);
  const selected = entries[0]?.[1] || OWNER_SELECTED_ORION_TAG;
  const conflict = new Set(entries.map(([,v]) => v)).size > 1;
  const configured = entries.length > 0 && !conflict;
  return Object.freeze({
    schema: SCHEMA,
    participant_id: 'wayglass',
    model: selected,
    provider: 'ollama',
    primary_route_id: 'wayglass:ship',
    speaking_places: Object.freeze(['wayglass:ship', 'flame:amber:ollama']),
    configured,
    status: conflict ? 'conflicting-owner-model-settings' : configured ? 'configured-not-live-verified' : 'owner-selected-tag-not-host-configured',
    live_turn_verified: false,
    model_installed_verified: false,
    // Retain two speaking places, one identity, and distinct context scopes.
    one_participant: true,
    room_continuity_separate: true,
    native_wyrdrune_route_unchanged: true,
  });
}

module.exports = Object.freeze({
  SCHEMA,
  OWNER_SELECTED_ORION_TAG,
  MODEL_SETTINGS,
  inspectWayglassCognitiveSpine,
});
