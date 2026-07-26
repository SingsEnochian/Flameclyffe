'use strict';

const {
  getObserverSnapshot,
  runObserverScoop,
} = require('../services/observer-scoop/observer-scoop.service');
const { hasSupabaseStoreConfig } = require('../services/observer-scoop/supabase.store');

let polling = false;

function registerObserverScoopRoutes(app, dataDir) {
  app.get('/api/observer-scoop/status', async (_req, res) => {
    try {
      const snapshot = await getObserverSnapshot(dataDir);
      res.json({
        ok: true,
        polling,
        archive_configured: hasSupabaseStoreConfig(),
        storage: snapshot.storage,
        generated_at: snapshot.generated_at,
        feed_count: snapshot.feeds.length,
        measurement_count: snapshot.timeline.length,
      });
    } catch (error) {
      res.status(500).json({ ok: false, polling, error: error.message });
    }
  });

  app.get('/api/observer-scoop/latest', async (_req, res) => {
    try {
      res.json({ ok: true, ...(await getObserverSnapshot(dataDir)) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/observer-scoop/poll', async (_req, res) => {
    if (polling) return res.status(409).json({ ok: false, error: 'Observer scoop already polling' });
    polling = true;
    try {
      const result = await runObserverScoop({ dataDir });
      const failed = result.bundle.failed_count;
      res.status(failed ? 207 : 200).json({ ok: failed === 0, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      polling = false;
    }
  });

  app.get('/api/observer-scoop/export', async (req, res) => {
    try {
      const snapshot = await getObserverSnapshot(dataDir);
      const format = String(req.query.format || 'json').toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'md' || format === 'markdown') {
        const lines = [
          '# Veil Observatory Export',
          '',
          `Generated: ${snapshot.generated_at}`,
          `Storage: ${snapshot.storage}`,
          `Mechanism: ${snapshot.mechanism_claim}`,
          '',
          '## Latest Measurements',
          '',
          '| Metric | Value | Unit | Measured | Source |',
          '|---|---:|---|---|---|',
          ...snapshot.latest.map((row) => `| ${row.metric_key} | ${row.numeric_value ?? row.text_value ?? ''} | ${row.unit || ''} | ${row.measured_at} | ${row.source?.display_name || row.source?.source_key || row.source_id || ''} |`),
          '',
          '## Feed Health',
          '',
          '| Feed | State | Last success | Last error |',
          '|---|---|---|---|',
          ...snapshot.feeds.map((feed) => `| ${feed.display_name || feed.source_key} | ${feed.state} | ${feed.last_success_at || ''} | ${feed.last_error || ''} |`),
          '',
          '> Observer records measurements and correspondence. It does not certify a hidden cause.',
          '',
        ];
        res.setHeader('content-disposition', `attachment; filename="veil-observatory-${timestamp}.md"`);
        return res.type('text/markdown; charset=utf-8').send(lines.join('\n'));
      }

      res.setHeader('content-disposition', `attachment; filename="veil-observatory-${timestamp}.json"`);
      return res.json(snapshot);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}

module.exports = registerObserverScoopRoutes;
