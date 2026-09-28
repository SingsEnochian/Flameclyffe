import {
  buildPluralRetrievalSet,
  createCodexContribution,
  createCompressionMap,
  createDissent,
  createWildGardenEntry,
  promoteWildGardenEntry,
  releaseCompression,
} from './universal-codex-anti-flattening.js';

export const CODEX_LIVING_STATE_SCHEMA = 'universal-codex.living-state/v0.1';

const freeze = (value) => Object.freeze([...value]);

function id(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function bodyText(body) {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') return body.text ?? body.summary ?? JSON.stringify(body);
  return String(body ?? '');
}

export function createCodexLivingState(seed = {}) {
  const contributions = [...(seed.contributions ?? [])];
  const dissents = [...(seed.dissents ?? [])];
  const questions = [...(seed.questions ?? [])];
  const wildGarden = [...(seed.wildGarden ?? [])];
  const compressionMaps = [...(seed.compressionMaps ?? [])];
  const canon = [...(seed.canon ?? [])];
  const receipts = [...(seed.receipts ?? [])];

  const lookup = (ref) =>
    contributions.find((x) => x.id === ref) ||
    dissents.find((x) => x.id === ref) ||
    questions.find((x) => x.id === ref) ||
    wildGarden.find((x) => x.id === ref) ||
    compressionMaps.find((x) => x.id === ref) ||
    canon.find((x) => x.id === ref);

  function receipt(event, refs = [], actor = 'codex') {
    const entry = Object.freeze({
      schema: 'universal-codex.witness-receipt/v0.1',
      id: id('receipt'),
      event,
      actor,
      refs: freeze(refs),
      createdAt: new Date().toISOString(),
    });
    receipts.push(entry);
    return entry;
  }

  return Object.freeze({
    schema: CODEX_LIVING_STATE_SCHEMA,

    ingestEnvelope(envelope, { exploratory = false } = {}) {
      if (!envelope?.id || !envelope?.sender?.aspectId || !envelope?.kind) {
        throw new Error('Codex ingestion requires an AspectEnvelope-like value.');
      }
      const author = envelope.sender.aspectId;
      const text = bodyText(envelope.body);

      if (exploratory) {
        const entry = createWildGardenEntry({
          id: `wild:${envelope.id}`,
          author,
          body: envelope.body,
          kind: envelope.kind,
          parentRefs: envelope.parentId ? [envelope.parentId] : [],
          evidenceRefs: envelope.evidenceRefs,
          createdAt: envelope.createdAt,
        });
        wildGarden.push(entry);
        receipt('wild-garden-ingested', [entry.id, envelope.id], author);
        return entry;
      }

      if (envelope.kind === 'challenge') {
        const target = envelope.stateRefs?.[0] || envelope.parentId;
        if (!target) throw new Error('Challenge ingestion requires a target stateRef or parentId.');
        const dissent = createDissent({
          id: `dissent:${envelope.id}`,
          author,
          target,
          claim: text,
          reason: text,
          evidenceRefs: envelope.evidenceRefs,
          createdAt: envelope.createdAt,
        });
        dissents.push(dissent);
        receipt('dissent-ingested', [dissent.id, target], author);
        return dissent;
      }

      const contribution = createCodexContribution({
        id: `contribution:${envelope.id}`,
        author,
        kind: envelope.kind,
        body: envelope.body,
        evidenceRefs: envelope.evidenceRefs,
        stateRefs: envelope.stateRefs,
        contextRefs: [envelope.traceId].filter(Boolean),
        createdAt: envelope.createdAt,
      });
      if (envelope.kind === 'question') questions.push(contribution);
      else contributions.push(contribution);
      receipt('contribution-ingested', [contribution.id, envelope.id], author);
      return contribution;
    },

    retrieve({ limit = 12 } = {}) {
      return buildPluralRetrievalSet({ contributions, dissents, questions, limit });
    },

    compress({ id: mapId = id('compression'), author, summary, sourceRefs, dissentRefs = [], unresolvedQuestionRefs = [] }) {
      const missing = sourceRefs.filter((ref) => !lookup(ref));
      if (missing.length) throw new Error(`Compression source not found: ${missing.join(', ')}`);
      const map = createCompressionMap({ id: mapId, author, summary, sourceRefs, dissentRefs, unresolvedQuestionRefs });
      compressionMaps.push(map);
      receipt('compression-created', [map.id, ...map.sourceRefs], author);
      return map;
    },

    release(mapId) {
      const map = compressionMaps.find((entry) => entry.id === mapId);
      if (!map) throw new Error(`Compression map not found: ${mapId}`);
      const released = releaseCompression(map, lookup);
      receipt('compression-released', [map.id, ...map.sourceRefs]);
      return released;
    },

    matureWildGarden(entryId, status, { evidenceRefs = [] } = {}) {
      const index = wildGarden.findIndex((entry) => entry.id === entryId);
      if (index < 0) throw new Error(`Wild Garden entry not found: ${entryId}`);
      const order = ['wild', 'interesting', 'investigated', 'challenged', 'demonstrated', 'candidate'];
      const current = wildGarden[index];
      const next = order.indexOf(status);
      const prior = order.indexOf(current.status);
      if (next < 0 || next < prior || next > prior + 1) throw new Error('Wild Garden maturation must move one step forward.');
      const matured = Object.freeze({
        ...current,
        status,
        evidenceRefs: freeze([...current.evidenceRefs, ...evidenceRefs]),
      });
      wildGarden[index] = matured;
      receipt('wild-garden-matured', [entryId, status], current.author);
      return matured;
    },

    promoteWildGarden(entryId, options) {
      const entry = wildGarden.find((item) => item.id === entryId);
      const promoted = promoteWildGardenEntry(entry, options);
      canon.push(promoted);
      receipt('canon-promoted', [entryId, promoted.authorityRef], promoted.author);
      return promoted;
    },

    snapshot() {
      return Object.freeze({
        schema: CODEX_LIVING_STATE_SCHEMA,
        contributions: freeze(contributions),
        dissents: freeze(dissents),
        questions: freeze(questions),
        wildGarden: freeze(wildGarden),
        compressionMaps: freeze(compressionMaps),
        canon: freeze(canon),
        receipts: freeze(receipts),
      });
    },
  });
}

export function createCollectiveClaim({
  id: claimId = id('collective-claim'),
  claim,
  supporters = [],
  dissenters = [],
  abstentions = [],
  evidenceRefs = [],
  scope = 'interpretive',
  createdAt = new Date().toISOString(),
} = {}) {
  if (!claim) throw new Error('Collective claim requires claim text.');
  const all = [...supporters, ...dissenters, ...abstentions];
  if (new Set(all).size !== all.length) throw new Error('A participant may occupy only one collective-claim position.');
  return Object.freeze({
    schema: 'universal-codex.collective-claim/v0.1',
    id: claimId,
    claim,
    supporters: freeze(supporters),
    dissenters: freeze(dissenters),
    abstentions: freeze(abstentions),
    evidenceRefs: freeze(evidenceRefs),
    scope,
    unanimous: dissenters.length === 0 && abstentions.length === 0 && supporters.length > 0,
    systemBelief: false,
    createdAt,
  });
}
