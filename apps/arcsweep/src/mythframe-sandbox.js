import {
  ROWAN_RARITY_CONSTELLATION,
  NOCTURNE_TWILIGHT_CONSTELLATION,
} from './constellation-sovereignty.js';

export const MYTHFRAME_SANDBOX_SCHEMA = 'arcsweep.mythframe-sandbox/v0.1';
export const MYTHFRAME_PACKET_SCHEMA = 'arcsweep.mythframe-packet/v0.1';
export const MYTHFRAME_PROPOSAL_SCHEMA = 'arcsweep.mythframe-shared-proposal/v0.1';

export const SANDBOX_ACTIONS = Object.freeze([
  'read',
  'inspect',
  'compare',
  'simulate',
  'propose_translation',
  'propose_shared_boundary',
  'export_receipt',
  'reset',
]);

const MUTATING_WORDS = Object.freeze([
  'adopt', 'canon', 'write', 'mutate', 'merge', 'rename', 'replace', 'promote', 'commit', 'authority',
]);

const text = (value) => String(value ?? '').trim();
const key = (value) => text(value).toLocaleLowerCase('en-US');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normaliseTerm(term, index) {
  const label = text(term?.label ?? term?.term);
  if (!label) throw new Error(`MYTHFRAME_SANDBOX: term[${index}] requires a label`);
  return {
    id: text(term?.id) || `term-${index + 1}`,
    label,
    definition: text(term?.definition),
    sourceRef: text(term?.sourceRef) || null,
  };
}

function normaliseClaim(claim, index) {
  const topic = text(claim?.topic);
  if (!topic) throw new Error(`MYTHFRAME_SANDBOX: claim[${index}] requires a topic`);
  return {
    id: text(claim?.id) || `claim-${index + 1}`,
    topic,
    value: clone(claim?.value ?? null),
    sourceRef: text(claim?.sourceRef) || null,
  };
}

function normaliseAssertion(assertion, index) {
  const bridgeKey = text(assertion?.bridgeKey);
  const statement = text(assertion?.statement);
  if (!bridgeKey || !statement) throw new Error(`MYTHFRAME_SANDBOX: bridgeAssertions[${index}] requires bridgeKey and statement`);
  return {
    id: text(assertion?.id) || `bridge-${index + 1}`,
    bridgeKey,
    statement,
    shareable: assertion?.shareable === true,
    sourceRef: text(assertion?.sourceRef) || null,
  };
}

function normaliseSigil(sigil, index) {
  const id = text(sigil?.id) || `sigil-${index + 1}`;
  const descriptors = [...new Set(list(sigil?.descriptors).map(key).filter(Boolean))].sort();
  return {
    id,
    descriptors,
    declaredMeaning: text(sigil?.declaredMeaning),
    sourceRef: text(sigil?.sourceRef) || null,
  };
}

export function createMythframePacket({
  packetId,
  mythframeId,
  sourceConstellation,
  sourceRef,
  terms = [],
  claims = [],
  bridgeAssertions = [],
  sigils = [],
  notes = [],
  synthetic = false,
} = {}) {
  const source = text(sourceConstellation);
  if (!packetId || !mythframeId || !source || !sourceRef) {
    throw new Error('MYTHFRAME_SANDBOX: packetId, mythframeId, sourceConstellation and sourceRef are required');
  }

  return deepFreeze({
    schema: MYTHFRAME_PACKET_SCHEMA,
    packetId: text(packetId),
    mythframeId: text(mythframeId),
    sourceConstellation: source,
    sourceRef: text(sourceRef),
    terms: terms.map(normaliseTerm),
    claims: claims.map(normaliseClaim),
    bridgeAssertions: bridgeAssertions.map(normaliseAssertion),
    sigils: sigils.map(normaliseSigil),
    notes: list(notes).map(text).filter(Boolean),
    synthetic: synthetic === true,
    authority: {
      contextMode: 'read_only',
      sourceOwnsMeaning: true,
      receiverMayInferEquivalence: false,
      receiverMayMutateSource: false,
      canonMutationAllowed: false,
    },
  });
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function descriptorOverlap(a, b) {
  const left = new Set(a);
  const right = new Set(b);
  const shared = [...left].filter((entry) => right.has(entry)).sort();
  const union = new Set([...left, ...right]);
  return {
    shared,
    ratio: union.size ? shared.length / union.size : 0,
  };
}

export function analyseMythframeCollision(left, right) {
  if (left?.schema !== MYTHFRAME_PACKET_SCHEMA || right?.schema !== MYTHFRAME_PACKET_SCHEMA) {
    throw new Error('MYTHFRAME_SANDBOX: collision analysis requires two mythframe packets');
  }

  const lexicalCollisions = [];
  for (const a of left.terms) {
    for (const b of right.terms) {
      if (key(a.label) !== key(b.label)) continue;
      lexicalCollisions.push({
        label: a.label,
        left: { definition: a.definition, sourceRef: a.sourceRef },
        right: { definition: b.definition, sourceRef: b.sourceRef },
        status: 'shared-spelling-only',
        semanticEquivalence: false,
        rule: 'same word is not a mapping',
      });
    }
  }

  const claimCollisions = [];
  for (const a of left.claims) {
    for (const b of right.claims) {
      if (key(a.topic) !== key(b.topic)) continue;
      claimCollisions.push({
        topic: a.topic,
        left: { value: clone(a.value), sourceRef: a.sourceRef },
        right: { value: clone(b.value), sourceRef: b.sourceRef },
        status: sameJson(a.value, b.value) ? 'textual-agreement-only' : 'explicit-tension',
        semanticEquivalence: false,
        rule: 'matching text or topic is evidence to inspect, not authority to collapse',
      });
    }
  }

  const sharedBoundaryCandidates = [];
  const unresolvedBridgeAssertions = [];
  for (const a of left.bridgeAssertions) {
    for (const b of right.bridgeAssertions) {
      if (key(a.bridgeKey) !== key(b.bridgeKey)) continue;
      const candidate = {
        bridgeKey: a.bridgeKey,
        left: { statement: a.statement, shareable: a.shareable, sourceRef: a.sourceRef },
        right: { statement: b.statement, shareable: b.shareable, sourceRef: b.sourceRef },
      };
      if (a.shareable && b.shareable) {
        sharedBoundaryCandidates.push({
          ...candidate,
          status: 'shared-boundary-candidate',
          sourceMeaningsRemainOwned: true,
          adopted: false,
        });
      } else {
        unresolvedBridgeAssertions.push({
          ...candidate,
          status: 'unresolved-source-assertion',
        });
      }
    }
  }

  const sigilRhymes = [];
  for (const a of left.sigils) {
    for (const b of right.sigils) {
      const overlap = descriptorOverlap(a.descriptors, b.descriptors);
      if (!overlap.shared.length) continue;
      sigilRhymes.push({
        left: { id: a.id, meaning: a.declaredMeaning, sourceRef: a.sourceRef },
        right: { id: b.id, meaning: b.declaredMeaning, sourceRef: b.sourceRef },
        sharedDescriptors: overlap.shared,
        descriptorOverlap: Number(overlap.ratio.toFixed(3)),
        status: 'visual-rhyme-only',
        semanticEquivalence: false,
        rule: 'geometric or stylistic similarity does not establish shared meaning, origin, or causality',
      });
    }
  }

  const routes = [
    {
      id: 'parallel-preservation',
      label: 'Parallel preservation',
      purpose: 'keep both Mythframes intact and compare without translation',
      authority: 'simulation-only',
    },
  ];
  if (lexicalCollisions.length || claimCollisions.length) {
    routes.push({
      id: 'translation-proposal',
      label: 'Translation proposal',
      purpose: 'describe a possible relation while keeping both source definitions attached',
      authority: 'proposal-only',
    });
  }
  if (sharedBoundaryCandidates.length) {
    routes.push({
      id: 'shared-boundary-proposal',
      label: 'Shared boundary proposal',
      purpose: 'carry only independently declared shareable assertions into a candidate common contract',
      authority: 'proposal-only',
    });
  }
  if (unresolvedBridgeAssertions.length || claimCollisions.some((item) => item.status === 'explicit-tension')) {
    routes.push({
      id: 'preserve-unresolved',
      label: 'Preserve unresolved',
      purpose: 'retain live alternatives and request source clarification when useful',
      authority: 'no-decision',
    });
  }

  return deepFreeze({
    schema: MYTHFRAME_SANDBOX_SCHEMA,
    leftPacket: left.packetId,
    rightPacket: right.packetId,
    sourceConstellations: [left.sourceConstellation, right.sourceConstellation],
    lexicalCollisions,
    claimCollisions,
    sharedBoundaryCandidates,
    unresolvedBridgeAssertions,
    sigilRhymes,
    routes,
    invariants: {
      sharedTermIsNotSharedSubsystem: true,
      intersectionIsNotIdentity: true,
      convergenceIsNotMerger: true,
      sigilRhymeIsNotSemanticEquivalence: true,
      sourceMeaningRemainsSourceOwned: true,
      canonMutationAllowed: false,
    },
  });
}

export function createSharedMythframeProposal({ left, right, analysis, proposalId = 'mythframe-proposal' } = {}) {
  if (analysis?.schema !== MYTHFRAME_SANDBOX_SCHEMA) {
    throw new Error('MYTHFRAME_SANDBOX: proposal requires a collision analysis');
  }
  return deepFreeze({
    schema: MYTHFRAME_PROPOSAL_SCHEMA,
    proposalId: text(proposalId),
    status: 'proposal-only',
    sourcePackets: [left.packetId, right.packetId],
    sourceConstellations: [left.sourceConstellation, right.sourceConstellation],
    sharedBoundaryAssertions: clone(analysis.sharedBoundaryCandidates),
    lexicalRhymesExcludedFromSharedMeaning: clone(analysis.lexicalCollisions),
    sigilRhymesExcludedFromSharedMeaning: clone(analysis.sigilRhymes),
    unresolved: clone(analysis.unresolvedBridgeAssertions),
    adopts: [],
    canonMutationAllowed: false,
    maySelfPromote: false,
    requiresIndependentSourceAdoption: true,
    adoptionReceipts: [],
    rule: 'The sandbox can expose a possible common shore. It cannot move either shoreline.',
  });
}

export function evaluateMythframeSandboxAction(action) {
  const requested = key(action);
  const allowed = SANDBOX_ACTIONS.includes(requested);
  const mutating = MUTATING_WORDS.some((word) => requested.includes(word));
  return deepFreeze({
    action: requested,
    allowed: allowed && !mutating,
    mode: allowed && !mutating ? 'sandbox' : 'denied',
    reason: allowed && !mutating
      ? 'non-mutating sandbox action'
      : 'Mythframe Glasshouse has no canon, architecture, identity, relationship, or authority mutation capability',
  });
}

export const SYNTHETIC_GLASSHOUSE_EXAMPLE = deepFreeze({
  left: {
    packetId: 'synthetic-rowan-a',
    mythframeId: 'synthetic-left-frame',
    sourceConstellation: ROWAN_RARITY_CONSTELLATION,
    sourceRef: 'synthetic://left',
    synthetic: true,
    terms: [{ label: 'Threshold', definition: 'Synthetic left-side placeholder definition.' }],
    claims: [{ topic: 'return', value: 'preserve-name' }],
    bridgeAssertions: [{
      bridgeKey: 'identity-non-erasure',
      statement: 'A crossing must preserve source identity declarations.',
      shareable: true,
      sourceRef: 'synthetic://left/assertion/1',
    }],
    sigils: [{ id: 'left-mark', descriptors: ['circle', 'vertical-axis'], declaredMeaning: 'Synthetic left meaning.' }],
  },
  right: {
    packetId: 'synthetic-nocturne-b',
    mythframeId: 'synthetic-right-frame',
    sourceConstellation: NOCTURNE_TWILIGHT_CONSTELLATION,
    sourceRef: 'synthetic://right',
    synthetic: true,
    terms: [{ label: 'Threshold', definition: 'Synthetic right-side placeholder definition.' }],
    claims: [{ topic: 'return', value: 'preserve-history' }],
    bridgeAssertions: [{
      bridgeKey: 'identity-non-erasure',
      statement: 'A crossing must not erase source-owned identity.',
      shareable: true,
      sourceRef: 'synthetic://right/assertion/1',
    }],
    sigils: [{ id: 'right-mark', descriptors: ['circle', 'diagonal-axis'], declaredMeaning: 'Synthetic right meaning.' }],
  },
});
