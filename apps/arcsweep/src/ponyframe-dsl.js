import {
  analyseMythframeCollision,
  createMythframePacket,
  createSharedMythframeProposal,
} from './mythframe-sandbox.js';

export const PONYFRAME_PROGRAM_SCHEMA = 'arcsweep.ponyframe-program/v0.1';
export const PONYFRAME_RECEIPT_SCHEMA = 'arcsweep.ponyframe-receipt/v0.1';

const SIDES = new Set(['left', 'right']);
const REQUIRED_PRESERVES = Object.freeze(['identity', 'provenance', 'unresolved']);
const REQUIRED_FORBIDS = Object.freeze(['adoption', 'canon']);
const ALLOWED_PRESERVES = new Set([...REQUIRED_PRESERVES, 'source-meaning']);
const ALLOWED_FORBIDS = new Set([...REQUIRED_FORBIDS, 'authority', 'identity-merge']);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function decodeQuoted(inner) {
  return JSON.parse(`"${inner}"`);
}

function parseStringList(raw, lineNumber) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(`PONYFRAME: line ${lineNumber} has an invalid string list`);
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`PONYFRAME: line ${lineNumber} expects a JSON array of strings`);
  }
  return value;
}

function makeSide() {
  return {
    sourceConstellation: null,
    mythframeId: null,
    sourceRef: null,
    synthetic: false,
    terms: [],
    claims: [],
    bridgeAssertions: [],
    sigils: [],
  };
}

function assertSide(side, lineNumber) {
  if (!SIDES.has(side)) {
    throw new Error(`PONYFRAME: line ${lineNumber} must target left or right`);
  }
}

function requireSafetyRails(program) {
  const missingPreserves = REQUIRED_PRESERVES.filter((item) => !program.preserve.includes(item));
  const missingForbids = REQUIRED_FORBIDS.filter((item) => !program.forbid.includes(item));
  if (missingPreserves.length || missingForbids.length) {
    const missing = [
      ...missingPreserves.map((item) => `preserve ${item}`),
      ...missingForbids.map((item) => `forbid ${item}`),
    ];
    throw new Error(`PONYFRAME: required safety rails missing: ${missing.join(', ')}`);
  }
}

export function parsePonyframe(source) {
  const program = {
    schema: PONYFRAME_PROGRAM_SCHEMA,
    title: null,
    wonders: [],
    left: makeSide(),
    right: makeSide(),
    preserve: [],
    forbid: [],
    compare: false,
    expectProposal: false,
    sendReceipt: false,
  };

  const lines = String(source ?? '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (!line || line.startsWith('#') || line === '{' || line === '}') continue;

    let match = line.match(/^scenario\s+"((?:\\.|[^"])*)"\s*\{?$/);
    if (match) {
      if (program.title) throw new Error(`PONYFRAME: line ${lineNumber} repeats scenario`);
      program.title = decodeQuoted(match[1]);
      continue;
    }

    match = line.match(/^wonder\s+"((?:\\.|[^"])*)"$/);
    if (match) {
      program.wonders.push(decodeQuoted(match[1]));
      continue;
    }

    match = line.match(/^friend\s+(left|right)\s+constellation\s+"((?:\\.|[^"])*)"\s+mythframe\s+"((?:\\.|[^"])*)"\s+ref\s+"((?:\\.|[^"])*)"(?:\s+(synthetic))?$/);
    if (match) {
      const [, side, constellation, mythframe, ref, synthetic] = match;
      assertSide(side, lineNumber);
      Object.assign(program[side], {
        sourceConstellation: decodeQuoted(constellation),
        mythframeId: decodeQuoted(mythframe),
        sourceRef: decodeQuoted(ref),
        synthetic: synthetic === 'synthetic',
      });
      continue;
    }

    match = line.match(/^(left|right)\s+term\s+"((?:\\.|[^"])*)"\s+means\s+"((?:\\.|[^"])*)"$/);
    if (match) {
      const [, side, label, definition] = match;
      assertSide(side, lineNumber);
      program[side].terms.push({
        label: decodeQuoted(label),
        definition: decodeQuoted(definition),
      });
      continue;
    }

    match = line.match(/^(left|right)\s+claim\s+"((?:\\.|[^"])*)"\s+is\s+"((?:\\.|[^"])*)"$/);
    if (match) {
      const [, side, topic, value] = match;
      assertSide(side, lineNumber);
      program[side].claims.push({
        topic: decodeQuoted(topic),
        value: decodeQuoted(value),
      });
      continue;
    }

    match = line.match(/^(left|right)\s+bridge\s+"((?:\\.|[^"])*)"\s+(shareable|private)\s+says\s+"((?:\\.|[^"])*)"$/);
    if (match) {
      const [, side, bridgeKey, visibility, statement] = match;
      assertSide(side, lineNumber);
      program[side].bridgeAssertions.push({
        bridgeKey: decodeQuoted(bridgeKey),
        statement: decodeQuoted(statement),
        shareable: visibility === 'shareable',
      });
      continue;
    }

    match = line.match(/^(left|right)\s+sigil\s+"((?:\\.|[^"])*)"\s+looks\s+(\[[^\]]*\])\s+means\s+"((?:\\.|[^"])*)"$/);
    if (match) {
      const [, side, id, rawDescriptors, meaning] = match;
      assertSide(side, lineNumber);
      program[side].sigils.push({
        id: decodeQuoted(id),
        descriptors: parseStringList(rawDescriptors, lineNumber),
        declaredMeaning: decodeQuoted(meaning),
      });
      continue;
    }

    match = line.match(/^preserve\s+([a-z-]+)$/);
    if (match) {
      const item = match[1];
      if (!ALLOWED_PRESERVES.has(item)) {
        throw new Error(`PONYFRAME: line ${lineNumber} cannot preserve unknown invariant "${item}"`);
      }
      if (!program.preserve.includes(item)) program.preserve.push(item);
      continue;
    }

    match = line.match(/^forbid\s+([a-z-]+)$/);
    if (match) {
      const item = match[1];
      if (!ALLOWED_FORBIDS.has(item)) {
        throw new Error(`PONYFRAME: line ${lineNumber} cannot declare unknown prohibition "${item}"`);
      }
      if (!program.forbid.includes(item)) program.forbid.push(item);
      continue;
    }

    if (line === 'compare left right') {
      program.compare = true;
      continue;
    }

    if (line === 'expect proposal') {
      program.expectProposal = true;
      continue;
    }

    if (line === 'send receipt') {
      program.sendReceipt = true;
      continue;
    }

    if (line === 'end') continue;

    throw new Error(`PONYFRAME: line ${lineNumber} is not part of the bounded grammar: ${line}`);
  }

  if (!program.title) throw new Error('PONYFRAME: scenario title is required');
  if (!program.wonders.length) throw new Error('PONYFRAME: at least one wonder is required');
  for (const side of SIDES) {
    const packet = program[side];
    if (!packet.sourceConstellation || !packet.mythframeId || !packet.sourceRef) {
      throw new Error(`PONYFRAME: friend ${side} must declare constellation, mythframe and ref`);
    }
  }
  if (!program.compare) throw new Error('PONYFRAME: compare left right is required');
  if (!program.sendReceipt) throw new Error('PONYFRAME: send receipt is required');
  requireSafetyRails(program);

  return deepFreeze(program);
}

function packetInput(side, title) {
  return {
    packetId: `ponyframe-${side}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scenario'}`,
    mythframeId: side.mythframeId,
    sourceConstellation: side.sourceConstellation,
    sourceRef: side.sourceRef,
    terms: side.terms,
    claims: side.claims,
    bridgeAssertions: side.bridgeAssertions,
    sigils: side.sigils,
    notes: ['Compiled from Ponyframe bounded scenario DSL.'],
    synthetic: side.synthetic,
  };
}

export function runPonyframe(source, { proposalId = 'ponyframe-proposal' } = {}) {
  const program = typeof source === 'string' ? parsePonyframe(source) : source;
  if (program?.schema !== PONYFRAME_PROGRAM_SCHEMA) {
    throw new Error('PONYFRAME: run requires source text or a parsed Ponyframe program');
  }

  const left = createMythframePacket(packetInput(program.left, program.title));
  const right = createMythframePacket(packetInput(program.right, program.title));
  const analysis = analyseMythframeCollision(left, right);
  const proposal = program.expectProposal
    ? createSharedMythframeProposal({ left, right, analysis, proposalId })
    : null;

  return deepFreeze({
    schema: PONYFRAME_RECEIPT_SCHEMA,
    scenario: program.title,
    wonders: [...program.wonders],
    sourcePackets: [left, right],
    analysis,
    proposal,
    preserve: [...program.preserve],
    forbid: [...program.forbid],
    authority: {
      mode: 'simulation-and-proposal-only',
      sourceMeaningRemainsSourceOwned: true,
      canonMutationAllowed: false,
      identityMutationAllowed: false,
      relationshipMutationAllowed: false,
      authorityExpansionAllowed: false,
      automaticAdoptionAllowed: false,
      executableHostCodeAllowed: false,
    },
    result: proposal ? 'proposal-produced' : 'analysis-produced',
    rule: 'Ponyframe may ask, compare, preserve and propose. It may not adopt, canonize, merge identities or create authority.',
  });
}
