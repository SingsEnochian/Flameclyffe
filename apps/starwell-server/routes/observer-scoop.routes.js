'use strict';

const { getObserverSnapshot } = require('../services/observer-scoop/observer-scoop.service');
const { hasSupabaseStoreConfig } = require('../services/observer-scoop/supabase.store');
const {
  MODES,
  ObserverScoopRuntime,
} = require('../services/observer-scoop/observer-scoop.runtime');

const LOOPBACK_ADDRESSES = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
]);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isLoopbackRequest(req) {
  const remoteAddress = req.socket?.remoteAddress || req.ip || '';
  if (!LOOPBACK_ADDRESSES.has(remoteAddress)) return false;

  const origin = req.get('origin');
  if (!origin) return true;
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function requireLoopback(req, res, next) {
  if (!isLoopbackRequest(req)) {
    return res.status(403).json({
      ok: false,
      error: 'Veil Observatory storage and control routes are available only through the local STARWELL server.',
    });
  }
  return next();
}

function registerObserverScoopRoutes(app, dataDir) {
  const runtime = new ObserverScoopRuntime({ dataDir });
  const local = [requireLoopback];

  app.get('/api/observer-scoop/status', ...local, async (_req, res) => {
    try {
      const snapshot = await getObserverSnapshot(dataDir);
      res.json({
        ok: true,
        runtime: runtime.getState(),
        archive_configured: hasSupabaseStoreConfig(),
        storage: snapshot.storage,
        generated_at: snapshot.generated_at,
        feed_count: snapshot.feeds.length,
        measurement_count: snapshot.timeline.length,
        recent_runs: snapshot.recent_runs || [],
      });
    } catch (error) {
      res.status(500).json({ ok: false, runtime: runtime.getState(), error: error.message });
    }
  });

  app.get('/api/observer-scoop/latest', ...local, async (_req, res) => {
    try {
      res.json({
        ok: true,
        runtime: runtime.getState(),
        ...(await getObserverSnapshot(dataDir)),
      });
    } catch (error) {
      res.status(500).json({ ok: false, runtime: runtime.getState(), error: error.message });
    }
  });

  app.post('/api/observer-scoop/poll', ...local, async (_req, res) => {
    try {
      const result = await runtime.runOnce('manual');
      const degraded = result.bundle?.failed_count || result.archive?.error;
      res.status(degraded ? 207 : 200).json({ ok: !degraded, ...result });
    } catch (error) {
      const status = error.code === 'OBSERVER_POLL_IN_PROGRESS' ? 409
        : error.code === 'OBSERVER_RUNTIME_LOCKED' ? 423
          : 500;
      res.status(status).json({ ok: false, runtime: runtime.getState(), error: error.message });
    }
  });

  app.post('/api/observer-scoop/interval', ...local, async (req, res) => {
    try {
      const intervalSeconds = Number(req.body?.interval_seconds);
      const state = await runtime.startInterval(
        Number.isFinite(intervalSeconds) ? intervalSeconds * 1000 : undefined,
      );
      res.json({ ok: true, runtime: state });
    } catch (error) {
      res.status(423).json({ ok: false, runtime: runtime.getState(), error: error.message });
    }
  });

  app.post('/api/observer-scoop/pause', ...local, async (_req, res) => {
    res.json({ ok: true, runtime: await runtime.pause() });
  });

  app.post('/api/observer-scoop/off', ...local, async (_req, res) => {
    res.json({ ok: true, runtime: await runtime.stop() });
  });

  app.post('/api/observer-scoop/reset', ...local, async (_req, res) => {
    res.json({ ok: true, runtime: await runtime.resetError() });
  });

  app.get('/api/observer-scoop/export', ...local, async (req, res) => {
    try {
      const snapshot = await getObserverSnapshot(dataDir);
      const format = String(req.query.format || 'json').toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportPacket = { runtime: runtime.getState(), ...snapshot };

      if (format === 'md' || format === 'markdown') {
        const lines = [
          '# Veil Observatory Export',
          '',
          `Generated: ${snapshot.generated_at}`,
          `Storage: ${snapshot.storage}`,
          `Mode: ${runtime.getState().mode}`,
          `Mechanism: ${snapshot.mechanism_claim}`,
          '',
          '## Latest Measurements',
          '',
          '| Metric | Value | Unit | Quality | Measured | Source |',
          '|---|---:|---|---|---|---|',
          ...snapshot.latest.map((row) => `| ${row.metric_key} | ${row.numeric_value ?? row.text_value ?? ''} | ${row.unit || ''} | ${String(row.quality_state || '').toUpperCase()} | ${row.measured_at} | ${row.source?.display_name || row.source?.source_key || row.source_id || ''} |`),
          '',
          '## Feed Health',
          '',
          '| Feed | State | Packet age | Stale after | Last success | Last error |',
          '|---|---|---:|---:|---|---|',
          ...snapshot.feeds.map((feed) => `| ${feed.display_name || feed.source_key} | ${feed.state} | ${feed.packet_age_seconds ?? ''} | ${feed.stale_after_seconds ?? ''} | ${feed.last_success_at || ''} | ${feed.last_error || ''} |`),
          '',
          '> Temporal correspondence may be recorded. Mechanism remains unresolved unless independently established.',
          '',
        ];
        res.setHeader('content-disposition', `attachment; filename="veil-observatory-${timestamp}.md"`);
        return res.type('text/markdown; charset=utf-8').send(lines.join('\n'));
      }

      res.setHeader('content-disposition', `attachment; filename="veil-observatory-${timestamp}.json"`);
      return res.json(exportPacket);
    } catch (error) {
      res.status(500).json({ ok: false, runtime: runtime.getState(), error: error.message });
    }
  });

  return { runtime, modes: MODES };
}

module.exports = registerObserverScoopRoutes;
module.exports.isLoopbackRequest = isLoopbackRequest;
module.exports.requireLoopback = requireLoopback;
