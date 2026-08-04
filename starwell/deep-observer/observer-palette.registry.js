/* STARWELL / DEEP Observer Palette Registry v0.1
   Registry scaffold. Do not hardcode Bz thermal mood directly into the renderer.
*/
'use strict';

window.STARWELL_OBSERVER_PALETTE_REGISTRY = {
  version: '0.1',
  ruleId: 'bz-thermal-field-mood-v0.1',
  boundary: 'Experimental visual translation layer. Bz palette mood is not standalone prediction or proof.',
  bzThermalMood: {
    source: 'Bz north-south IMF component',
    thresholds: {
      positiveQuietMin: 1.0,
      negativeActiveMax: -1.0,
      neutralMin: -1.0,
      neutralMax: 1.0
    },
    bands: [
      {
        id: 'positive-quiet',
        test: 'bz >= +1.0',
        label: 'cool / quiet / holding',
        science: 'Positive Bz is treated as a quieter, more holding field-orientation input for the visual system.',
        instrument: 'Cool the palette, reduce thermal aggression, favour silver-blue quietness.',
        terraAeterna: 'The gate holds. The field quiets into moon-glass and still air.'
      },
      {
        id: 'neutral-liminal',
        test: '-1.0 < bz < +1.0',
        label: 'neutral / liminal / threshold',
        science: 'Near-zero Bz is treated as balanced or undecided field orientation.',
        instrument: 'Hold a liminal silver/pearl palette without strongly warming or cooling.',
        terraAeterna: 'The threshold breathes without choosing. The Well holds silver mist.'
      },
      {
        id: 'negative-active',
        test: 'bz <= -1.0',
        label: 'warm / active / angry',
        science: 'Negative Bz is treated as a more open, more geoeffective, more active field-orientation input.',
        instrument: 'Warm the palette, activate copper/ember/storm accents, increase perceived field urgency.',
        terraAeterna: 'The gate opens. The sky-current heats and the field grows teeth.'
      }
    ],
    themeExamples: {
      Between: {
        positiveQuiet: ['icy silver-blue', 'moon-glass', 'quiet mist'],
        neutralLiminal: ['pearl', 'silver-violet', 'threshold fog'],
        negativeActive: ['copper-gold flare', 'ember in fog', 'warm storm edge']
      },
      Forge: {
        positiveQuiet: ['banked steel-blue coals'],
        neutralLiminal: ['ash-silver', 'muted iron'],
        negativeActive: ['orange-red heat bloom', 'copper sparks']
      },
      Grove: {
        positiveQuiet: ['cool moonleaf green-blue'],
        neutralLiminal: ['pale lichen mist'],
        negativeActive: ['autumn-gold', 'foxfire', 'root-ember']
      }
    },
    plainEnglish: 'Bz shifts the field palette: positive values cool and quiet the instrument, near-zero values keep it liminal, and negative values warm and activate the field.'
  },
  classifyBz(bz) {
    const v = Number(bz);
    if (!Number.isFinite(v)) return 'neutral-liminal';
    if (v >= this.bzThermalMood.thresholds.positiveQuietMin) return 'positive-quiet';
    if (v <= this.bzThermalMood.thresholds.negativeActiveMax) return 'negative-active';
    return 'neutral-liminal';
  }
};
