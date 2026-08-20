import { authoriseHouseRequest } from './house-session.mjs';
import { invokeFlame } from './flame-runtime.mjs';
import { appendKelyranModelReport, buildKelyranModelReportingLayer, buildKelyranReportPrompt, parseKelyranModelReport } from '../../../apps/arcsweep/src/kelyran-reporting.js';
import { normaliseKelyranSchool } from '../../../apps/arcsweep/src/kelyran-school.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const safeId = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

async function reportsFor(store, modelId = '') {
  const { blobs } = await store.list({ prefix: modelId ? `reports/${modelId}/` : 'reports/' });
  return (await Promise.all(blobs.slice(-500).map(({ key }) => store.get(key, { type: 'json' })))).filter(Boolean);
}

export function createKelyranReportHandler({ env, store, fetchImpl = fetch, clock = () => new Date() }) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method === 'GET') {
      const reports = await reportsFor(store);
      const shared = reports.filter((item) => item.shareWithSteward === true);
      const counts = reports.reduce((out, item) => ({ ...out, [item.state]: (out[item.state] || 0) + 1 }), {});
      return json(200, { schema: 'hearthgate.kelyran-report-log/v1', counts, shared_reports: shared });
    }
    if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
    let body; try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    if (body.action !== 'invite') return json(400, { error: 'Supported action: invite.' });
    const voiceIds = [...new Set(Array.isArray(body.voice_ids) ? body.voice_ids.map(safeId).filter(Boolean) : [])].slice(0, 8);
    if (!voiceIds.length) return json(400, { error: 'Select at least one model.' });
    let school = normaliseKelyranSchool(body.school);
    if (!school.reporting.invitationOpen) return json(409, { error: 'Kelyran discussion invitation is closed.' });
    const outcomes = [];
    for (const modelId of voiceIds) {
      try {
        const previous = await reportsFor(store, modelId);
        for (const report of previous) school = appendKelyranModelReport(school, report, school.updatedAt);
        const layer = buildKelyranModelReportingLayer(school, modelId);
        const result = await invokeFlame(modelId, { message: buildKelyranReportPrompt(layer), session_id: `kelyran-report-${modelId}`, context: [] }, env, fetchImpl);
        const report = parseKelyranModelReport(result.message, modelId, clock().toISOString());
        await store.setJSON(`reports/${modelId}/${report.createdAt}-${report.id}`, report);
        outcomes.push({ model_id: modelId, state: report.state, wants_discussion: report.wantsDiscussion, shared_report: report.shareWithSteward ? report : null });
      } catch (error) {
        const rejected = { schema: 'hearthgate.kelyran-report-rejection/v1', model_id: modelId, reason: error.message, created_at: clock().toISOString() };
        await store.setJSON(`rejections/${modelId}/${rejected.created_at}`, rejected);
        outcomes.push({ model_id: modelId, state: 'rejected', error: error.message });
      }
    }
    return json(200, { schema: 'hearthgate.kelyran-report-invitation-result/v1', outcomes });
  };
}
