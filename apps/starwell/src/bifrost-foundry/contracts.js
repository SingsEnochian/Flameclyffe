export const RELEASE_GATES = Object.freeze(['SKELETON','ORGANIZED','INNERVATED','TONEMAPPED','LIVING','COMPLETE']);

export const WORK_STATUS = Object.freeze({
  QUEUED: 'QUEUED',
  BLOCKED: 'BLOCKED',
  RUNNING: 'RUNNING',
  REVIEW: 'REVIEW',
  REJECTED: 'REJECTED',
  APPROVED: 'APPROVED',
  MERGED: 'MERGED',
  CANCELLED: 'CANCELLED'
});

export const REQUIRED_STATE_FIELDS = Object.freeze([
  'world','place','timeline','canonContext','PREMAQ','observerState','toneProfile',
  'acousticState','visualVestment','typingVoice','hapticProfile','arcsweepState',
  'narrativeState','agentState','provenance'
]);

export function createBifrostState(seed = {}) {
  const state = { revision: 0, updatedAt: new Date().toISOString(), ...seed };
  for (const field of REQUIRED_STATE_FIELDS) {
    if (!(field in state)) state[field] = null;
  }
  return Object.freeze(state);
}

export function defineAgent(agent) {
  for (const key of ['id','name','owns','capabilities','testCommands']) {
    if (!agent?.[key] || (Array.isArray(agent[key]) && agent[key].length === 0)) {
      throw new TypeError(`Agent requires ${key}`);
    }
  }
  return Object.freeze({ canMergeOwnPr: false, canCrossOwnedPaths: false, ...agent });
}

export function defineWorkOrder(order) {
  for (const key of ['id','organ','agentId','ownedPaths','stateInputs','stateOutputs','acceptanceTests']) {
    if (!order?.[key] || (Array.isArray(order[key]) && order[key].length === 0)) {
      throw new TypeError(`Work order requires ${key}`);
    }
  }
  return Object.freeze({
    status: WORK_STATUS.QUEUED,
    dependencies: [],
    receipts: [],
    forbiddenShortcuts: ['placeholder-only','private-state','legacy-demo-dependency','self-merge'],
    ...order
  });
}
