import React, { useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

const THREAD_KEY = 'starwell:last-thread:v1';
const LEDGER_KEY = 'starwell:action-ledger:v1';

const DEFAULT_THREAD = {
  roomKey: 'writing',
  roomTitle: 'Writing Room',
  note: 'Continue the active manuscript chamber.',
  updatedAt: null,
};

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // STARWELL remains usable when storage is blocked or private browsing is strict.
  }
}

async function probe(url, timeoutMs = 1800) {
  if (!url) return { state: 'unconfigured', detail: 'No health route configured' };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json, text/plain, */*' },
    });

    return response.ok
      ? { state: 'online', detail: `Responded ${response.status}` }
      : { state: 'warning', detail: `Responded ${response.status}` };
  } catch (error) {
    return {
      state: 'offline',
      detail: error?.name === 'AbortError' ? 'Timed out' : 'No response',
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function greetingForHour(hour) {
  if (hour < 5) return 'The night watch is still holding.';
  if (hour < 12) return 'Good morning. The observatory is listening.';
  if (hour < 17) return 'Good afternoon. The instruments are awake.';
  if (hour < 21) return 'Good evening. Copper dusk is on the glass.';
  return 'The observatory is quiet beneath the night sky.';
}

function statusLabel(state) {
  return {
    online: 'Online',
    ready: 'Ready',
    warning: 'Attention',
    offline: 'Unavailable',
    checking: 'Listening',
    unconfigured: 'Not configured',
  }[state] || state;
}

export function ObservatoryHandoff({ now, selected, onContinue }) {
  const [thread, setThread] = useState(() => readJson(THREAD_KEY, DEFAULT_THREAD));
  const [checks, setChecks] = useState({
    starwell: { state: 'ready', detail: 'Interface loaded locally' },
    supabase: { state: hasSupabaseConfig ? 'checking' : 'unconfigured', detail: hasSupabaseConfig ? 'Checking archive route' : 'Environment keys absent' },
    router: { state: 'checking', detail: 'Listening for Hearthfire' },
    yggdrasil: { state: 'checking', detail: 'Listening for local model route' },
  });
  const [ledgerCount, setLedgerCount] = useState(() => readJson(LEDGER_KEY, []).length);

  const healthUrls = useMemo(() => ({
    router: import.meta.env.VITE_HEARTHFIRE_HEALTH_URL || '',
    yggdrasil: import.meta.env.VITE_YGGDRASIL_HEALTH_URL || 'http://127.0.0.1:11434/api/tags',
  }), []);

  useEffect(() => {
    const nextThread = {
      roomKey: selected.key,
      roomTitle: selected.title,
      note: selected.text || `Continue in ${selected.title}.`,
      updatedAt: new Date().toISOString(),
    };
    setThread(nextThread);
    writeJson(THREAD_KEY, nextThread);
  }, [selected]);

  useEffect(() => {
    let cancelled = false;

    async function listen() {
      const [router, yggdrasil] = await Promise.all([
        probe(healthUrls.router),
        probe(healthUrls.yggdrasil),
      ]);

      let supabaseState = checks.supabase;
      if (hasSupabaseConfig && supabase) {
        const { error } = await supabase.from('starwell_codex_entries').select('id', { head: true, count: 'exact' }).limit(1);
        supabaseState = error
          ? { state: 'warning', detail: 'Configured; archive check needs attention' }
          : { state: 'online', detail: 'Archive route responded' };
      }

      if (!cancelled) {
        setChecks((current) => ({
          ...current,
          router,
          yggdrasil,
          supabase: supabaseState,
        }));
      }
    }

    listen();
    return () => { cancelled = true; };
  }, [healthUrls]);

  const attentionCount = Object.values(checks).filter((check) => ['warning', 'offline'].includes(check.state)).length;
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).format(now).replace('24', '0'));

  function recordHandoff() {
    const ledger = readJson(LEDGER_KEY, []);
    const entry = {
      id: crypto.randomUUID?.() || `entry-${Date.now()}`,
      action: 'continue-thread',
      roomKey: thread.roomKey,
      roomTitle: thread.roomTitle,
      note: thread.note,
      createdAt: new Date().toISOString(),
      consent: 'user-invoked',
      status: 'offered',
    };
    const nextLedger = [entry, ...ledger].slice(0, 100);
    writeJson(LEDGER_KEY, nextLedger);
    setLedgerCount(nextLedger.length);
    onContinue(thread.roomKey);
  }

  return (
    <section className="observatory-handoff chamber-card" aria-label="STARWELL observatory handoff">
      <div className="handoff-copy">
        <p className="eyebrow">Observatory Handoff</p>
        <h2>{greetingForHour(hour)}</h2>
        <p>
          {attentionCount
            ? `${attentionCount} instrument ${attentionCount === 1 ? 'needs' : 'need'} attention. Nothing has been changed without your action.`
            : 'The instruments are quiet. Nothing has been changed without your action.'}
        </p>

        <div className="handoff-thread" aria-live="polite">
          <span>Last held thread</span>
          <strong>{thread.roomTitle}</strong>
          <p>{thread.note}</p>
          <button type="button" onClick={recordHandoff}>Continue where I left off</button>
        </div>
      </div>

      <div className="handoff-status" aria-label="Local system state">
        {Object.entries(checks).map(([key, check]) => (
          <article className={`handoff-status-row state-${check.state}`} key={key}>
            <span className="status-light" aria-hidden="true" />
            <div>
              <strong>{key === 'starwell' ? 'STARWELL' : key === 'yggdrasil' ? 'Yggdrasil' : key[0].toUpperCase() + key.slice(1)}</strong>
              <small>{check.detail}</small>
            </div>
            <em>{statusLabel(check.state)}</em>
          </article>
        ))}
        <p className="ledger-whisper">Action Ledger · {ledgerCount} local {ledgerCount === 1 ? 'entry' : 'entries'}</p>
      </div>
    </section>
  );
}
