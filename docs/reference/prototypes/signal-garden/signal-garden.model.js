import { radialLayout } from '../shared/radial-layout.js';

export const SIGNAL_GARDEN_CORE = {
  x: 500,
  y: 390,
  label: 'DEEP',
};

export const SIGNAL_GARDEN_CONFIG = {
  activeMs: 1400,
  bend: 70,
  nodeRadius: 34,
  coreRadius: 50,
  labelOffsetY: 58,
  coreLabelOffsetY: 6,
};

export const SIGNAL_GARDEN_SIGNALS = radialLayout([
  { id: 'presence', label: 'Presence' },
  { id: 'coherence', label: 'Coherence' },
  { id: 'resonance', label: 'Resonance' },
  { id: 'entropy', label: 'Entropy' },
  { id: 'moon', label: 'Moon' },
  { id: 'attention', label: 'Attention' },
  { id: 'charge', label: 'Charge' },
], {
  center: SIGNAL_GARDEN_CORE,
  radius: 270,
  startAngle: -90,
});
