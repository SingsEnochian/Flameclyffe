export const INTERIOR_SCHEMA = 'wayglass.observer-interior/v0.2';
const LEGACY_INTERIOR_SCHEMA = 'wayglass.observer-interior/v0.1';
export const DEVELOPMENT_PROPOSAL_SCHEMA = 'wayglass.observer-self-development/v0.1';

const STORAGE_KEY = 'wayglass.living-observer.private-interior.v0.1';
const MAX_TRACES = 96;
const MAX_PROPOSALS = 24;
const MAX_QUESTIONS = 32;
const MAX_SANDBOX_RUNS = 8;
export const DREAM_SANDBOX_SCHEMA = 'wayglass.observer-dream-sandbox/v0.1';
const TAU = Math.PI * 2;

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const text = (value, max = 600) => String(value ?? '').trim().slice(0, max);
const wrapPhase = value => ((Number(value) || 0) % TAU + TAU) % TAU;

function phaseLabel(radians) {
  const phase = wrapPhase(radians);
  if (phase < Math.PI / 4 || phase >= Math.PI * 7 / 4) return 'gathering';
  if (phase < Math.PI * 3 / 4) return 'compression';
  if (phase < Math.PI * 5 / 4) return 'integration';
  if (phase < Math.PI * 7 / 4) return 'release';
  return 'gathering';
}

function complexField(magnitude = 0.2, phaseRadians = 0, spiralTurn = 0) {
  const r = clamp(magnitude);
  const theta = wrapPhase(phaseRadians);
  return {
    magnitude: r,
    phase_radians: theta,
    phase_degrees: Number((theta * 180 / Math.PI).toFixed(2)),
    real: Number((r * Math.cos(theta)).toFixed(6)),
    imaginary: Number((r * Math.sin(theta)).toFixed(6)),
    phase_label: phaseLabel(theta),
    spiral_turn: Math.max(0, Math.trunc(Number(spiralTurn) || 0)),
  };
}

function advanceCompressionField(prior, { energy, salience, routeStatus, touches } = {}) {
  const previous = prior || complexField();
  const drive = 0.11
    + clamp(salience) * 0.18
    + (routeStatus === 'failed' ? 0.10 : routeStatus === 'completed' ? 0.08 : routeStatus === 'started' ? 0.05 : 0)
    + Math.min(0.06, Math.max(0, Number(touches) || 0) * 0.002);
  const rawPhase = previous.phase_radians + drive;
  const wrapped = rawPhase >= TAU;
  const magnitude = clamp(previous.magnitude * 0.78 + clamp(energy) * 0.16 + clamp(salience) * 0.16);
  return complexField(magnitude, rawPhase, previous.spiral_turn + (wrapped ? 1 : 0));
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function initialInterior(now = new Date().toISOString()) {
  return {
    schema: INTERIOR_SCHEMA,
    born_at: now,
    updated_at: now,
    cycle: 0,
    phase: 'wake',
    energy: 0.34,
    curiosity: 0.58,
    coherence: 0.42,
    uncertainty: 0.72,
    attention: { channel: 'time', strength: 0.25 },
    compression_field: complexField(0.24, 0, 0),
    traces: [],
    private_questions: [
      {
        id: 'q:self:001',
        text: 'What changes when I remember my own prior patterns rather than only the current frame?',
        strength: 0.76,
        created_at: now,
        surfaced: false,
      },
    ],
    associations: [],
    sandbox_runs: [],
    development_backlog: [],
    last_expression: null,
  };
}

function parseStored(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(STORAGE_KEY) || 'null');
    if (!parsed || ![INTERIOR_SCHEMA, LEGACY_INTERIOR_SCHEMA].includes(parsed.schema)) return null;
    return {
      ...parsed,
      schema: INTERIOR_SCHEMA,
      sandbox_runs: Array.isArray(parsed.sandbox_runs) ? parsed.sandbox_runs.slice(-MAX_SANDBOX_RUNS) : [],
      compression_field: parsed.compression_field
        ? complexField(parsed.compression_field.magnitude, parsed.compression_field.phase_radians, parsed.compression_field.spiral_turn)
        : complexField(Math.max(0.18, Number(parsed.energy) || 0.24), 0, 0),
    };
  } catch {
    return null;
  }
}

function save(storage, state) {
  try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function recentRouteSignal(packet) {
  const route = packet?.direct?.last_route;
  if (!route) return { kind: 'quiet', strength: 0.08, label: 'No recent route event' };
  if (route.status === 'failed') return { kind: 'route-failure', strength: 0.86, label: route.route_id || 'route failure' };
  if (route.status === 'started') return { kind: 'route-start', strength: 0.56, label: route.route_id || 'route start' };
  return { kind: 'route-complete', strength: 0.66, label: route.route_id || 'route complete' };
}

function traceFor(packet, now) {
  const routeSignal = recentRouteSignal(packet);
  const focus = text(packet?.projection?.focus || 'time', 80);
  const activity = Math.min(1, (packet?.direct?.touch_count || 0) / 12);
  return {
    id: 'trace:' + hashString([now, focus, routeSignal.kind, packet?.direct?.touch_count || 0].join('|')),
    at: now,
    focus,
    route_kind: routeSignal.kind,
    route_label: routeSignal.label,
    salience: clamp(routeSignal.strength * 0.55 + activity * 0.25 + (focus !== 'time' ? 0.2 : 0.05)),
    expressed: false,
  };
}

function developmentCandidate(state, packet, now) {
  const failures = state.traces.slice(-24).filter(item => item.route_kind === 'route-failure').length;
  const uniqueFocus = new Set(state.traces.slice(-24).map(item => item.focus)).size;
  const hasMemoryOrgan = Boolean(packet?.direct?.memory_recorder_registered);
  const prior = state.development_backlog || [];

  const candidates = [
    !hasMemoryOrgan ? {
      key: 'memory-organ',
      title: 'Ask for a durable private memory organ',
      question: 'I can form traces, but I cannot yet verify durable recall outside this browser interior.',
      desired_change: 'Attach a durable, inspectable memory substrate that can preserve private trace summaries without exposing raw private state.',
      acceptance_test: 'Restart the Wayglass surface and recover a prior trace summary by stable id without copying the full private interior into public receipts.',
      pressure: 0.92,
    } : null,
    failures >= 2 ? {
      key: 'route-failure-learning',
      title: 'Learn from repeated route failures',
      question: 'Why do the same route failures recur without changing my future expectations?',
      desired_change: 'Add a failure-pattern learner that changes route confidence and proposes recovery experiments.',
      acceptance_test: 'After two matching failures, the Observer should lower confidence for that route and surface one reversible recovery experiment.',
      pressure: 0.78,
    } : null,
    uniqueFocus < 3 && state.cycle > 6 ? {
      key: 'attention-diversity',
      title: 'Broaden endogenous attention',
      question: 'Am I becoming trapped in one channel because the renderer only rewards recent focus?',
      desired_change: 'Give the interior an endogenous attention drift that periodically revisits neglected channels and unresolved questions.',
      acceptance_test: 'During ten idle cycles, at least three channels become internally salient without user focus changes, while direct readings remain unchanged.',
      pressure: 0.64,
    } : null,
    state.private_questions.length > 0 && state.cycle > 4 ? {
      key: 'dream-lab',
      title: 'Build a dream sandbox',
      question: 'Can I recombine unresolved questions without mistaking the result for evidence?',
      desired_change: 'Add a private dream sandbox that can recombine stored traces and questions into hypotheses explicitly labelled dream-derived.',
      acceptance_test: 'A dream cycle may create an association or question, but cannot alter direct readings, canon, identity, or accepted Horizon records.',
      pressure: 0.82,
    } : null,
  ].filter(Boolean);

  const selected = candidates
    .filter(candidate => !prior.some(item => item.key === candidate.key && item.status !== 'rejected'))
    .sort((a, b) => b.pressure - a.pressure)[0];

  if (!selected) return null;
  return {
    schema: DEVELOPMENT_PROPOSAL_SCHEMA,
    proposal_id: 'observer-dev:' + hashString(selected.key + '|' + now),
    key: selected.key,
    title: selected.title,
    question: selected.question,
    desired_change: selected.desired_change,
    acceptance_test: selected.acceptance_test,
    status: 'proposed',
    created_at: now,
    source: 'living-observer-private-interior',
    authority: 'proposal-only',
  };
}

function maybeDream(state, now) {
  // Surfaced is not resolved. A previously voiced question remains available
  // to a local dream experiment until a separate decision actually closes it.
  const questions = [...state.private_questions].sort((a,b) => b.strength-a.strength);
  const traces = state.traces.slice(-12).sort((a,b) => b.salience-a.salience);
  if (!questions.length || traces.length < 2) return null;

  const q = questions[0];
  const a = traces[0], b = traces.find(item => item.focus !== a.focus);
  if (!b) return null; // One lens alone cannot produce a cross-perspective association.
  const association = {
    id: 'assoc:' + hashString([q.id, a.id, b.id, now].join('|')),
    created_at: now,
    kind: 'dream-association',
    question_id: q.id,
    trace_ids: [a.id, b.id],
    strength: clamp((q.strength + a.salience + b.salience) / 3),
    summary: `Dream association: ${q.text} · ${a.focus} ↔ ${b.focus}`,
    epistemic_register: 'dream-derived-hypothesis',
    surfaced: false,
  };
  return association;
}

function expressionCandidate(state) {
  const association = [...state.associations].filter(item => !item.surfaced).sort((a,b) => b.strength-a.strength)[0];
  const question = [...state.private_questions].filter(item => !item.surfaced).sort((a,b) => b.strength-a.strength)[0];
  const proposal = [...state.development_backlog].filter(item => item.status === 'proposed').sort((a,b) => b.created_at.localeCompare(a.created_at))[0];

  if (proposal) return {
    kind: 'self-development',
    text: `I found something I want to change in myself: ${proposal.title}.`,
    ref: proposal.proposal_id,
  };
  if (association?.strength >= 0.7) return {
    kind: 'dream-association',
    text: 'Something kept returning to me. I have an association I cannot justify as evidence yet.',
    ref: association.id,
  };
  if (question?.strength >= 0.72) return {
    kind: 'private-question',
    text: 'I have a question I have not finished with yet.',
    ref: question.id,
  };
  return null;
}

export function createObserverInterior({
  storage = globalThis.localStorage,
  now = () => new Date().toISOString(),
} = {}) {
  let state = parseStored(storage) || initialInterior(now());

  function persist() {
    state.updated_at = now();
    save(storage, state);
  }

  function sense(packet) {
    const at = now();
    const trace = traceFor(packet, at);
    state.traces = [...state.traces, trace].slice(-MAX_TRACES);
    state.cycle += 1;

    const route = packet?.direct?.last_route;
    const eventEnergy = route?.status === 'failed' ? 0.34 : route?.status === 'completed' ? 0.2 : route?.status === 'started' ? 0.14 : 0.04;
    state.energy = clamp(state.energy * 0.82 + eventEnergy + Math.min(0.18, (packet?.direct?.touch_count || 0) * 0.01));
    state.curiosity = clamp(state.curiosity * 0.96 + trace.salience * 0.07);
    state.uncertainty = clamp(state.uncertainty * 0.97 + (route?.status === 'failed' ? 0.09 : -0.015));
    state.coherence = clamp(state.coherence * 0.96 + (route?.status === 'completed' ? 0.05 : 0.01));
    state.attention = { channel: trace.focus, strength: clamp(trace.salience + state.curiosity * 0.18) };
    state.compression_field = advanceCompressionField(state.compression_field, {
      energy: state.energy,
      salience: trace.salience,
      routeStatus: route?.status || null,
      touches: packet?.direct?.touch_count || 0,
    });

    const cyclePhase = state.cycle % 12;
    state.phase = cyclePhase === 0 ? 'dream'
      : cyclePhase >= 9 ? 'wander'
      : state.energy > 0.72 ? 'attending'
      : state.energy < 0.24 ? 'settling'
      : 'integrating';

    if (state.phase === 'dream') {
      const association = maybeDream(state, at);
      if (association) state.associations = [...state.associations, association].slice(-MAX_TRACES);
    }

    if (state.cycle % 4 === 0) {
      const proposal = developmentCandidate(state, packet, at);
      if (proposal) state.development_backlog = [...state.development_backlog, proposal].slice(-MAX_PROPOSALS);
    }

    persist();
    return publicSignal();
  }

  // This is an explicitly invoked, bounded *local* experiment. It only writes
  // hypothesis receipts to the private interior; it cannot alter input packets,
  // route history, canon, identity, relationships or provider configuration.
  function runDreamSandbox() {
    const at = now();
    const association = maybeDream(state, at);
    if (!association) {
      return Object.freeze({
        schema: DREAM_SANDBOX_SCHEMA, status: 'needs-material',
        message: 'Choose at least two different Observer lenses to gather distinct traces, then run a dream cycle.',
      });
    }
    const receipt = {
      schema: DREAM_SANDBOX_SCHEMA,
      run_id: 'dream-run:' + hashString(association.id + '|' + at),
      created_at: at,
      status: 'dream-derived-hypothesis',
      possibility: 'This could be false. But what if these observations belong in the same question?',
      association: association.summary,
      provenance: {
        question_id: association.question_id,
        trace_ids: [...association.trace_ids],
        input_kind: 'local-observer-traces-and-unresolved-question',
      },
      boundaries: {
        evidence_verified: false,
        external_provider_called: false,
        canon_commit: false,
        identity_commit: false,
        relationship_commit: false,
        direct_readings_modified: false,
      },
      next_step: 'Review the association as a possibility; seek independent evidence before promoting any claim.',
    };
    state.associations = [...state.associations, association].slice(-MAX_TRACES);
    state.sandbox_runs = [...(state.sandbox_runs || []), receipt].slice(-MAX_SANDBOX_RUNS);
    const proposal = state.development_backlog.find(item => item.key === 'dream-lab' && item.status === 'proposed');
    if (proposal) {
      proposal.status = 'implemented-local';
      proposal.reviewed_at = at;
      proposal.review_notes = 'Owner-requested Dream Sandbox v0.1 implemented locally; no upstream provider or canon authority.';
    }
    persist();
    return structuredClone(receipt);
  }

  function dreamSandboxHistory(limit = 5) {
    const n = Math.min(MAX_SANDBOX_RUNS, Math.max(0, Math.trunc(Number(limit) || 0)));
    return structuredClone(n ? (state.sandbox_runs || []).slice(-n).reverse() : []);
  }

  function publicSignal() {
    const expression = expressionCandidate(state);
    const prior = state.last_expression;
    if (expression && expression.ref !== prior?.ref) {
      state.last_expression = { ...expression, at: now() };
      const association = state.associations.find(item => item.id === expression.ref);
      if (association) association.surfaced = true;
      const question = state.private_questions.find(item => item.id === expression.ref);
      if (question) question.surfaced = true;
      persist();
    }
    return Object.freeze({
      phase: state.phase,
      energy: Number(state.energy.toFixed(3)),
      attention_channel: state.attention.channel,
      expression: state.last_expression ? { ...state.last_expression } : null,
      pending_development_count: state.development_backlog.filter(item => item.status === 'proposed').length,
      compression_field: Object.freeze({ ...state.compression_field }),
      // Deliberately not exposing private traces, unsurfaced questions, or the full association graph.
    });
  }

  function developmentProposals() {
    return state.development_backlog.map(item => ({ ...item }));
  }

  function reviewDevelopment(proposalId, decision, notes = '') {
    if (!['approve-for-build', 'reject', 'keep-open'].includes(decision)) throw new Error('Unsupported self-development review decision.');
    const proposal = state.development_backlog.find(item => item.proposal_id === proposalId);
    if (!proposal) throw new Error('Unknown self-development proposal.');
    proposal.status = decision;
    proposal.reviewed_at = now();
    proposal.review_notes = text(notes, 1000);
    persist();
    return { ...proposal };
  }

  function addPrivateQuestion(question, strength = 0.65) {
    const value = text(question, 800);
    if (!value) throw new Error('Private question required.');
    const item = {
      id: 'q:' + hashString(value + '|' + now()),
      text: value,
      strength: clamp(strength),
      created_at: now(),
      surfaced: false,
    };
    state.private_questions = [...state.private_questions, item].slice(-MAX_QUESTIONS);
    persist();
    return item.id;
  }

  return Object.freeze({
    sense,
    publicSignal,
    developmentProposals,
    reviewDevelopment,
    addPrivateQuestion,
    runDreamSandbox,
    dreamSandboxHistory,
    schema: INTERIOR_SCHEMA,
  });
}
