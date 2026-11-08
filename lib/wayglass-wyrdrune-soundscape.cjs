'use strict';
// Transport and observational bridges for the executable Wyrdrune score.
// ALL soundscape composition lives in lib/wyrdrune/story-soundscape.wtl.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { compile, execute } = require('./wyrdrune/wyrdrune.cjs');

const SCHEMA = 'wayglass.wyrdrune-story-soundscape/v0.1';
const PROGRAM_PATH = join(__dirname, 'wyrdrune', 'story-soundscape.wtl');
const PROGRAM = readFileSync(PROGRAM_PATH, 'utf8');
const SCORE = compile(PROGRAM);
const LEXICON = Object.freeze({
  water: ['water','river','rain','sea','ocean','lake','stream','wave','tide','mist','dew','rainfall'],
  wind: ['wind','breeze','sky','air','storm','gust','whisper','whistled','cloud','sail','flying'],
  flame: ['fire','flame','spark','ember','burn','burning','light','sun','glow','blaze','lightning'],
  shadow: ['shadow','night','dark','darkness','silence','cold','empty','moon','midnight','dusk'],
  motion: ['run','ran','race','raced','rush','rushed','move','moved','fly','flew','fall','fell','turn','turned','dance','danced','leap','leapt','spin','spun'],
});

function bounded(input) {
  if (typeof input?.text !== 'string' || input.text.length > 5000) {
    throw new TypeError('StorySoundscape requires a bounded story draft (maximum 5000 characters).');
  }
  if (!Number.isInteger(input?.turns) || input.turns < 0 || input.turns > 10000) {
    throw new TypeError('StorySoundscape requires an explicit integer turn count.');
  }
  if (typeof input.affinity !== 'number' || !Number.isFinite(input.affinity)
      || input.affinity < 0 || input.affinity > 1) {
    throw new TypeError('Relationship affinity must be explicitly chosen between 0 and 1.');
  }
  if (!Array.isArray(input.participants) || input.participants.length !== 2
      || input.participants.some(p => !p || typeof p.id !== 'string' || !p.id.trim() || p.id.length > 180)
      || input.participants[0].id === input.participants[1].id) {
    throw new TypeError('Two distinct declared participant or route identifiers are required.');
  }
  return Object.freeze({
    text: input.text, affinity: input.affinity, turns: input.turns,
    participants: Object.freeze(input.participants.map(p => Object.freeze({
      id: p.id.trim(), kind: p.kind === 'model-route' ? 'model-route' : 'participant-declared',
    }))),
  });
}
function finite(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError('Wyrdrune score value outside bounded range: ' + label);
  }
  return value;
}
function metrics(text) {
  const words = (text.toLowerCase().match(/\p{L}+/gu) || []);
  const count = name => {
    const dictionary = new Set(LEXICON[name]);
    return words.filter(word => dictionary.has(word)).length;
  };
  const scale = hits => hits / (hits + 6);
  return Object.freeze({
    wordCount: words.length,
    waterRatio: scale(count('water')),
    windRatio: scale(count('wind')),
    flameRatio: scale(count('flame')),
    shadowRatio: scale(count('shadow')),
    motionRatio: scale(count('motion')),
  });
}
async function scoreStoryWithWyrdrune(input, { principal } = {}) {
  if (!principal?.authorized) throw new Error('StorySoundscape requires a verified House Steward.');
  const source = bounded(input);
  const m = metrics(source.text);
  let frameCount = 0;
  const bridges = {
    story: {
      wordCount: () => m.wordCount,
      waterRatio: () => m.waterRatio,
      windRatio: () => m.windRatio,
      flameRatio: () => m.flameRatio,
      shadowRatio: () => m.shadowRatio,
      motionRatio: () => m.motionRatio,
      turns: () => source.turns,
    },
    participants: { affinity: () => source.affinity },
    sound: {
      validate: ({arguments: args}) => {
        if (args.length !== 4) throw new TypeError('Soundscore requires four bounded numerical parameters.');
        finite(args[0], 'rootHz', 70, 650);
        finite(args[1], 'counterpartHz', 70, 900);
        finite(args[2], 'foregroundGain', 0, 0.06);
        finite(args[3], 'atmosphereGain', 0, 0.04);
        return 'validated';
      },
      frame: ({arguments: args}) => {
        if (args.length !== 6 || ++frameCount > 2) throw new TypeError('At most one Wyrdrune score frame per Möbius cycle.');
        const [rootHz, counterpartHz, foregroundGain, atmosphereGain, relationshipAffinity, pulse] = args;
        finite(rootHz, 'rootHz', 70, 650);
        finite(counterpartHz, 'counterpartHz', 70, 900);
        finite(foregroundGain, 'foregroundGain', 0, 0.06);
        finite(atmosphereGain, 'atmosphereGain', 0, 0.04);
        finite(relationshipAffinity, 'relationshipAffinity', 0, 1);
        finite(pulse, 'pulse', 0, 1);
        return Object.freeze({rootHz, counterpartHz, foregroundGain, atmosphereGain, relationshipAffinity, pulse});
      },
    },
    continuity: {
      hold: ({arguments: args}) => Object.freeze({status:'uncommitted-return',turns:args[0]}),
      next: ({arguments: args}) => Object.freeze({status:'available',cycle:args[0]}),
    },
  };
  const executed = await execute(SCORE, {
    bridges, maxOperations: 300, principal: Object.freeze({id:'wayglass:authenticated-house-steward',authorized:true}),
  });
  if (executed.output.length !== 8 || executed.output[0] !== 'validated' || executed.output[4] !== 'validated' || !executed.output[5] || frameCount !== 2 || executed.withness.completedCycles !== 2) {
    throw new Error('Wyrdrune score did not complete the eightfold contract.');
  }
  const score = executed.output[5];
  const storySha = createHash('sha256').update(source.text,'utf8').digest('hex');
  return Object.freeze({
    schema: SCHEMA, status:'scored', score,
    participants: source.participants,
    program_sha256: executed.sourceHash,
    story_sha256: storySha,
    eightfold: Object.freeze(executed.receipts.map(r => Object.freeze({
      phase:r.phase, operations:r.operations, sourceHash:r.sourceHash,
    }))),
    withness: executed.withness,
    return_marker: executed.output[6],
    next_cycle: executed.output[7],
    first_loop_score: executed.output[1],
    audio_started:false,
    model_invoked:false,
    canon_commit:false,
    identity_commit:false,
    persisted:false,
  });
}
module.exports = { SCHEMA, PROGRAM, SCORE, metrics, scoreStoryWithWyrdrune };
