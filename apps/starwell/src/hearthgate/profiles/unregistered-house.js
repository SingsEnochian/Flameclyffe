import { defineHouseProfile } from '../contracts.js';

export const unregisteredHouseProfile = defineHouseProfile({
  id: 'unregistered-house',
  name: 'Unregistered House',
  world: 'Unregistered world',
  canon: {
    foundation: {
      id: 'unregistered-foundation',
      name: 'Unregistered foundation',
      version: 'unregistered-canon/0',
      source_class: 'unregistered',
      authority: 'none',
    },
    overlay: {
      id: 'unregistered-overlay',
      name: 'Unregistered overlay',
      version: 'unregistered-overlay/0',
      source_class: 'unregistered',
      authority: 'none',
    },
  },
  sovereignty: {
    foundation_preserved: true,
    overlay_silently_merges: false,
    house_identity_preserved: true,
    crossing_may_commit_canon: false,
  },
  temporalProfile: {
    timeline: null,
    initialDelta: 1,
    bridgeCoupling: 0.04,
    focusAxis: 'R',
    measurementStrength: 0.5,
    release: 0.5,
  },
  harmonicIdentity: {
    voice: 'neutral-degraded',
    baseCarrierHz: 144,
    beatFloorHz: 4,
    beatCeilingHz: 6,
  },
  visualIdentity: {
    structure: 'neutral-paired-bridge',
    atmosphere: 'explicit-unregistered-state',
    palette: ['neutral-silver', 'warning-amber'],
  },
  culturalIdentity: {
    arrivalPrompt: 'Unregistered House. No cultural interpretation is authorised.',
    receptionPrompt: 'Registration is required before House-native expression.',
  },
  transferFunctions: {
    version: 'hearthweave-unregistered-transfer/1.1.0',
    source_axes: ['P', 'C', 'R', 'E', 'M', 'A'],
    context_only_axes: ['Q'],
    outputs: ['glyph', 'tone', 'visual', 'haptic', 'narrative'],
  },
  packages: ['hearthgate.arcsweep', 'deep.observer'],
  rooms: ['ledger', 'bridge'],
  capabilities: {
    observer: true,
    audio: false,
    glyphs: true,
    canon: false,
    timeline: true,
    dualAspect: true,
    degraded: true,
  },
});
