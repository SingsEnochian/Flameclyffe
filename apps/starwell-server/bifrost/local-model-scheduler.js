'use strict';

const { localConcurrency } = require('./residency-policy');

class LocalModelScheduler {
  constructor({ concurrency = localConcurrency(), clock = () => Date.now() } = {}) {
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.clock = clock;
    this.active = 0;
    this.queue = [];
    this.sequence = 0;
    this.completed = 0;
    this.failed = 0;
  }

  run({ model = null, profileId = null, identityId = null, mode = 'interactive' } = {}, task) {
    if (typeof task !== 'function') throw new TypeError('LocalModelScheduler requires a task function.');
    const queuedAtMs = this.clock();
    const ticket = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.queue.push({ ticket, model, profileId, identityId, mode, queuedAtMs, task, resolve, reject });
      this.#drain();
    });
  }

  snapshot() {
    return {
      contract: 'bifrost.local-model-scheduler/v1',
      concurrency: this.concurrency,
      active: this.active,
      queued: this.queue.length,
      completed: this.completed,
      failed: this.failed,
      rules: {
        schedulingDoesNotChangeIdentity: true,
        schedulingDoesNotSelectFallbackModels: true,
        fifoWithinLocalCapacity: true,
      },
    };
  }

  #drain() {
    while (this.active < this.concurrency && this.queue.length) {
      const item = this.queue.shift();
      this.active += 1;
      const startedAtMs = this.clock();
      Promise.resolve()
        .then(() => item.task({
          ticket: item.ticket,
          queuedAtMs: item.queuedAtMs,
          startedAtMs,
          waitMs: Math.max(0, startedAtMs - item.queuedAtMs),
          model: item.model,
          profileId: item.profileId,
          identityId: item.identityId,
          mode: item.mode,
        }))
        .then((value) => {
          this.completed += 1;
          item.resolve({
            value,
            scheduling: {
              ticket: item.ticket,
              waitMs: Math.max(0, startedAtMs - item.queuedAtMs),
              startedAtMs,
              finishedAtMs: this.clock(),
              mode: item.mode,
              model: item.model,
              profileId: item.profileId,
              identityId: item.identityId,
            },
          });
        }, (error) => {
          this.failed += 1;
          error.bifrostScheduling = {
            ticket: item.ticket,
            waitMs: Math.max(0, startedAtMs - item.queuedAtMs),
            startedAtMs,
            failedAtMs: this.clock(),
            mode: item.mode,
            model: item.model,
            profileId: item.profileId,
            identityId: item.identityId,
          };
          item.reject(error);
        })
        .finally(() => {
          this.active -= 1;
          this.#drain();
        });
    }
  }
}

const defaultLocalModelScheduler = new LocalModelScheduler();

module.exports = {
  LocalModelScheduler,
  defaultLocalModelScheduler,
};
