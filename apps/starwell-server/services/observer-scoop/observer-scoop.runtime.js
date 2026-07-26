'use strict';

const fs = require('fs').promises;
const path = require('path');
const { runObserverScoop } = require('./observer-scoop.service');

const MODES = Object.freeze({
  OFF: 'OFF',
  MANUAL: 'MANUAL',
  INTERVAL: 'INTERVAL',
  PAUSED: 'PAUSED',
  DEGRADED: 'DEGRADED',
  ERROR: 'ERROR',
});

const MIN_INTERVAL_MS = 30_000;
const DEFAULT_INTERVAL_MS = 5 * 60_000;
const MAX_DEGRADED_BACKOFF_MS = 30 * 60_000;

function finiteMs(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(MIN_INTERVAL_MS, Math.round(parsed)) : fallback;
}

function publicState(state) {
  return {
    mode: state.mode,
    polling: state.polling,
    interval_ms: state.intervalMs,
    next_poll_at: state.nextPollAt,
    last_transition_at: state.lastTransitionAt,
    last_transition_reason: state.lastTransitionReason,
    last_run_started_at: state.lastRunStartedAt,
    last_run_completed_at: state.lastRunCompletedAt,
    last_execution_time_ms: state.lastExecutionTimeMs,
    last_status: state.lastStatus,
    consecutive_faults: state.consecutiveFaults,
    last_error: state.lastError,
    locked: state.mode === MODES.ERROR,
  };
}

class ObserverScoopRuntime {
  constructor({ dataDir, env = process.env, run = runObserverScoop, intervalMs } = {}) {
    if (!dataDir) throw new Error('ObserverScoopRuntime requires dataDir');
    this.dataDir = dataDir;
    this.env = env;
    this.run = run;
    this.timer = null;
    this.state = {
      mode: MODES.OFF,
      polling: false,
      intervalMs: finiteMs(intervalMs ?? env.OBSERVER_SCOOP_INTERVAL_MS, DEFAULT_INTERVAL_MS),
      nextPollAt: null,
      lastTransitionAt: new Date().toISOString(),
      lastTransitionReason: 'runtime_created',
      lastRunStartedAt: null,
      lastRunCompletedAt: null,
      lastExecutionTimeMs: null,
      lastStatus: null,
      consecutiveFaults: 0,
      lastError: null,
    };
  }

  getState() {
    return publicState(this.state);
  }

  async persistState() {
    const dir = path.join(this.dataDir, 'observer-scoop');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'runtime-state.json'),
      `${JSON.stringify(this.getState(), null, 2)}\n`,
      'utf8',
    );
  }

  async writeDiagnostic(error, context = {}) {
    const dir = path.join(this.dataDir, 'observer-scoop', 'diagnostics');
    await fs.mkdir(dir, { recursive: true });
    const timestamp = new Date().toISOString();
    const name = `${timestamp.replace(/[:.]/g, '-')}.json`;
    const payload = {
      timestamp,
      state: this.getState(),
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
      context,
    };
    await fs.writeFile(path.join(dir, name), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  async transition(mode, reason) {
    if (!Object.values(MODES).includes(mode)) throw new RangeError(`Unknown Observer mode: ${mode}`);
    this.state.mode = mode;
    this.state.lastTransitionAt = new Date().toISOString();
    this.state.lastTransitionReason = reason || null;
    if (mode !== MODES.INTERVAL && mode !== MODES.DEGRADED) this.state.nextPollAt = null;
    await this.persistState();
    return this.getState();
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.state.nextPollAt = null;
  }

  schedule(delayMs = this.state.intervalMs) {
    this.clearTimer();
    if (![MODES.INTERVAL, MODES.DEGRADED].includes(this.state.mode)) return;
    const delay = finiteMs(delayMs, this.state.intervalMs);
    this.state.nextPollAt = new Date(Date.now() + delay).toISOString();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.state.nextPollAt = null;
      this.runOnce('interval').catch(() => {});
    }, delay);
    this.timer.unref?.();
    this.persistState().catch(() => {});
  }

  async runOnce(trigger = 'manual') {
    if (this.state.mode === MODES.ERROR) {
      const error = new Error('Observer runtime is locked in ERROR mode; reset is required');
      error.code = 'OBSERVER_RUNTIME_LOCKED';
      throw error;
    }
    if (this.state.polling) {
      const error = new Error('Observer scoop already polling');
      error.code = 'OBSERVER_POLL_IN_PROGRESS';
      throw error;
    }
    if (trigger === 'interval' && ![MODES.INTERVAL, MODES.DEGRADED].includes(this.state.mode)) {
      return { skipped: true, reason: `mode_${this.state.mode.toLowerCase()}`, runtime: this.getState() };
    }

    if (trigger === 'manual') await this.transition(MODES.MANUAL, 'user_poll');
    this.state.polling = true;
    this.state.lastRunStartedAt = new Date().toISOString();
    this.state.lastError = null;
    await this.persistState();
    const started = Date.now();

    try {
      const operatingMode = trigger === 'manual' ? MODES.MANUAL : this.state.mode;
      const result = await this.run({
        dataDir: this.dataDir,
        env: this.env,
        operatingMode,
      });
      const executionTimeMs = Math.max(0, Date.now() - started);
      const failureCount = Number(result.bundle?.failed_count || 0)
        + (result.archive?.error ? 1 : 0);

      this.state.lastRunCompletedAt = new Date().toISOString();
      this.state.lastExecutionTimeMs = executionTimeMs;
      this.state.lastStatus = failureCount ? 'DEGRADED' : 'SUCCESS';
      this.state.lastError = result.archive?.error || null;
      this.state.consecutiveFaults = failureCount ? this.state.consecutiveFaults + 1 : 0;
      this.state.polling = false;

      if (trigger === 'interval') {
        if (failureCount) {
          await this.transition(MODES.DEGRADED, 'poll_completed_with_faults');
          const backoff = Math.min(
            this.state.intervalMs * Math.max(2, 2 ** this.state.consecutiveFaults),
            MAX_DEGRADED_BACKOFF_MS,
          );
          this.schedule(backoff);
        } else {
          await this.transition(MODES.INTERVAL, 'poll_completed');
          this.schedule(this.state.intervalMs);
        }
      } else {
        await this.persistState();
      }

      return { ...result, runtime: this.getState() };
    } catch (error) {
      this.clearTimer();
      this.state.polling = false;
      this.state.lastRunCompletedAt = new Date().toISOString();
      this.state.lastExecutionTimeMs = Math.max(0, Date.now() - started);
      this.state.lastStatus = 'ERROR';
      this.state.lastError = error instanceof Error ? error.message : String(error);
      this.state.consecutiveFaults += 1;
      await this.transition(MODES.ERROR, 'severe_runtime_exception');
      await this.writeDiagnostic(error, { trigger });
      throw error;
    } finally {
      this.state.polling = false;
      await this.persistState().catch(() => {});
    }
  }

  async startInterval(intervalMs) {
    if (this.state.mode === MODES.ERROR) throw new Error('Reset ERROR mode before starting interval polling');
    this.state.intervalMs = finiteMs(intervalMs, this.state.intervalMs);
    this.state.consecutiveFaults = 0;
    this.state.lastError = null;
    await this.transition(MODES.INTERVAL, 'interval_started');
    this.schedule(250);
    return this.getState();
  }

  async pause() {
    this.clearTimer();
    await this.transition(MODES.PAUSED, 'scheduler_paused');
    return this.getState();
  }

  async stop() {
    this.clearTimer();
    await this.transition(MODES.OFF, 'runtime_stopped');
    return this.getState();
  }

  async resetError() {
    if (this.state.mode !== MODES.ERROR) return this.getState();
    this.state.lastError = null;
    this.state.consecutiveFaults = 0;
    await this.transition(MODES.OFF, 'error_reset');
    return this.getState();
  }
}

module.exports = {
  MODES,
  MIN_INTERVAL_MS,
  DEFAULT_INTERVAL_MS,
  ObserverScoopRuntime,
  publicState,
};
