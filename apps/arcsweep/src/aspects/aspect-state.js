export const ASPECT_SHARED_STATE_SCHEMA = 'hearthweave.aspect-shared-state/v0.2';

function id(prefix = 'contribution') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function createAspectSharedState(seed = {}) {
  const contributions = Array.isArray(seed.contributions) ? structuredClone(seed.contributions) : [];
  const alternatives = Array.isArray(seed.alternatives) ? structuredClone(seed.alternatives) : [];
  const openQuestions = Array.isArray(seed.openQuestions) ? structuredClone(seed.openQuestions) : [];

  return Object.freeze({
    schema: ASPECT_SHARED_STATE_SCHEMA,

    contribute({ id: contributionId, aspectId, kind, content, refs = [], createdAt = new Date().toISOString() } = {}) {
      if (!String(aspectId || '').trim()) throw new Error('Shared-state contribution requires aspectId.');
      if (!String(kind || '').trim()) throw new Error('Shared-state contribution requires kind.');
      const contribution = Object.freeze({
        id: String(contributionId || id()),
        aspectId: String(aspectId),
        kind: String(kind),
        content: structuredClone(content),
        refs: Object.freeze([...new Set(refs.map((ref) => String(ref).trim()).filter(Boolean))]),
        createdAt: String(createdAt),
      });
      contributions.push(contribution);
      return contribution;
    },

    preserveAlternative(route) {
      if (!route?.id) throw new Error('Alternative route requires an id.');
      if (!alternatives.some((entry) => entry.id === route.id)) alternatives.push(route);
      return route;
    },

    ask({ id: questionId, aspectId, text, createdAt = new Date().toISOString() } = {}) {
      if (!String(aspectId || '').trim() || !String(text || '').trim()) throw new Error('Open question requires aspectId and text.');
      const question = Object.freeze({ id: String(questionId || id('question')), aspectId: String(aspectId), text: String(text).trim(), createdAt: String(createdAt) });
      openQuestions.push(question);
      return question;
    },

    snapshot() {
      return Object.freeze({
        schema: ASPECT_SHARED_STATE_SCHEMA,
        contributions: Object.freeze([...contributions]),
        alternatives: Object.freeze([...alternatives]),
        openQuestions: Object.freeze([...openQuestions]),
      });
    },
  });
}
