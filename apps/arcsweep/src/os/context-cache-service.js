// The tab cache is derived from the active OS state, not the authority for it.
export function registerContextCacheService({ caretaker, persistence, state, ready = Promise.resolve() }) {
  const content = (value) => JSON.stringify(value && { session: value.session, capsules: value.capsules });
  caretaker.registerRequiredService({
    serviceId: 'os-context-cache',
    faultClass: 'DERIVED-STATE',
    probe: async () => {
      await ready;
      return { ok: persistence.available() && content(persistence.load()) === content(state()), storage: 'session-cache' };
    },
    captureState: () => persistence.capture(),
    repair: () => { if (!persistence.save(state())) throw new Error('Could not restore context cache.'); },
    rollback: ({ priorState }) => persistence.restore(priorState),
    verifyRollback: ({ priorState }) => persistence.capture() === priorState,
  });
}
