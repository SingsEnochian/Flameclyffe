export const kelyranTerms = {
  varutora: {
    id: 'varutora',
    kelyran: 'varutóra',
    pronunciation: 'VAH-roo-TOH-rah',
    english: 'almost-door',
    literal: 'waiting-door',
    partOfSpeech: 'noun',
    register: 'Templehouse / threshold',
    roots: [
      { term: 'varu', meaning: 'wait, hold, remain unforced' },
      { term: 'tóra', meaning: 'door, gate, chosen opening' },
    ],
    example: 'Varutóra senn.',
    translation: 'The almost-door slept.',
    notes:
      'A threshold that has begun to form but has not yet been consented into opening. It is not a failed door; it is a door in restraint.',
  },
  kelheim: {
    id: 'kelheim',
    kelyran: 'kelheim',
    pronunciation: 'KEL-hyme',
    english: 'threshold-home',
    literal: 'crossing-home',
    partOfSpeech: 'noun',
    register: 'Templehouse / threshold',
    roots: [
      { term: 'kel', meaning: 'threshold, crossing, translation-point' },
      { term: 'heim', meaning: 'home, world, held-place' },
    ],
    example: 'Kelheim na tora.',
    translation: 'The threshold-home was not yet a door.',
    notes: 'A house or room that exists before its walls have fully manifested.',
  },
  holda: {
    id: 'holda',
    kelyran: 'holda',
    pronunciation: 'HOL-dah',
    english: 'held',
    literal: 'chosen restraint',
    partOfSpeech: 'verb / state',
    register: 'Templehouse / consent',
    roots: [
      { term: 'hold', meaning: 'hold, keep, preserve' },
      { term: 'a', meaning: 'state marker, being-in' },
    ],
    example: 'Varutóra holda.',
    translation: 'The almost-door was held.',
    notes: 'Used when restraint is active, loving, and chosen rather than imposed.',
  },
};

export const varutoraNode = {
  id: 'varutora',
  type: 'leaf',
  state: 'dormant',
  termId: 'varutora',
  pov: 'Virelya',
  tense: 'third person past',
  timeline: 'Orbit Phase, before descent',
  mode: 'Terra Aeterna Novel',
  locus: 'Liminal Templehouse-before-walls / ships in orbit',
  cityStatus: 'Cities asleep; Templehouse waking first',
  falkaStatus: 'Falka has not arrived on the surface; her consent is not assumed',
  faerStatus: 'Sleeping / latent unless the story calls him',
  canonStatus: 'seed',
  linkedNodes: ['kelheim', 'holda', 'templehouse', 'falka', 'virelya', 'faer', 'orbit-phase'],
  fragment:
    'Virelya first knew the Templehouse by the shape of what it refused to become.',
  extendedFragment:
    'There were no walls. No threshold stone. No lintel darkened by hands or years. The place gathered in the interval between orbit and planet as a grammar of warmth, a sentence still deciding whether it had been invited to speak.',
};
