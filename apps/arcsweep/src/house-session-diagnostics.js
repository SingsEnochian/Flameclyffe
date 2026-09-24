import { getKelyranSupabase } from './kelyran-supabase.js';

export const HOUSE_SESSION_AUDIT_SCHEMA = 'arcsweep.house-session-audit/v1';

const nowIso = () => new Date().toISOString();

function leg(status = 'awaiting', detail = null, extra = {}) {
  return { status, detail, ...extra };
}

async function jsonBody(response) {
  return response.json().catch(() => ({}));
}

function newestEntry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return [...entries]
    .filter((entry) => entry && entry.created_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
}

export async function runHouseSessionAudit({ fetchImpl = fetch } = {}) {
  const report = {
    schema: HOUSE_SESSION_AUDIT_SCHEMA,
    started_at: nowIso(),
    supabase_steward: leg(),
    existing_house_session: leg(),
    session_exchange: leg('not-run'),
    sealed_house_session: leg(),
    commons_get: leg(),
    ledger_snapshot: {
      row_count: null,
      newest_receipt: null,
      schema: null,
    },
  };

  let accessToken = '';
  try {
    const client = await getKelyranSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const session = data?.session || null;
    accessToken = String(session?.access_token || '').trim();
    report.supabase_steward = accessToken
      ? leg('passed', 'Signed-in Supabase session is available.', { expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null })
      : leg('failed', 'No signed-in Supabase session is available.');
  } catch (error) {
    report.supabase_steward = leg('error', error?.message || String(error));
  }

  try {
    const response = await fetchImpl('/api/v1/house/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const data = await jsonBody(response);
    report.existing_house_session = response.ok
      ? leg('passed', 'Existing House session accepted.', { http_status: response.status, mode: data?.mode || null })
      : leg('absent', 'No valid House session cookie is currently accepted.', { http_status: response.status });
  } catch (error) {
    report.existing_house_session = leg('error', error?.message || String(error));
  }

  if (report.existing_house_session.status !== 'passed' && accessToken) {
    try {
      const response = await fetchImpl('/api/v1/house/session', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ supabase_access_token: accessToken }),
      });
      const data = await jsonBody(response);
      report.session_exchange = response.ok
        ? leg('passed', 'Supabase Steward session was exchanged for a sealed House session.', {
          http_status: response.status,
          mode: data?.mode || null,
          expires_at: data?.expires_at || null,
        })
        : leg('failed', data?.error || 'House session exchange was rejected.', { http_status: response.status });
    } catch (error) {
      report.session_exchange = leg('error', error?.message || String(error));
    }
  } else if (report.existing_house_session.status === 'passed') {
    report.session_exchange = leg('skipped', 'Existing House session already valid.');
  } else if (!accessToken) {
    report.session_exchange = leg('blocked', 'Cannot exchange House session without a signed-in Supabase session.');
  }

  try {
    const response = await fetchImpl('/api/v1/house/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const data = await jsonBody(response);
    report.sealed_house_session = response.ok
      ? leg('passed', 'House session seal is accepted by the server.', { http_status: response.status, mode: data?.mode || null })
      : leg('failed', 'House session seal is still not accepted.', { http_status: response.status });
  } catch (error) {
    report.sealed_house_session = leg('error', error?.message || String(error));
  }

  if (report.sealed_house_session.status === 'passed') {
    try {
      const response = await fetchImpl('/api/v1/house/commons', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const data = await jsonBody(response);
      if (!response.ok) {
        report.commons_get = leg('failed', data?.error || 'House Commons request failed.', { http_status: response.status });
      } else {
        const entries = Array.isArray(data?.entries) ? data.entries : null;
        report.commons_get = entries
          ? leg('passed', 'House Commons returned its durable snapshot.', { http_status: response.status, transport_schema: data?.schema || null })
          : leg('malformed', 'House Commons response did not contain an entries array.', { http_status: response.status });
        if (entries) {
          const newest = newestEntry(entries);
          report.ledger_snapshot = {
            row_count: entries.length,
            newest_receipt: newest?.created_at || null,
            schema: data?.schema || null,
          };
        }
      }
    } catch (error) {
      report.commons_get = leg('error', error?.message || String(error));
    }
  } else {
    report.commons_get = leg('blocked', 'Commons read skipped because the House session seal is not valid.');
  }

  report.completed_at = nowIso();
  return Object.freeze(report);
}

function colourFor(status) {
  if (status === 'passed' || status === 'skipped') return '#ffb852';
  if (status === 'awaiting' || status === 'not-run') return '#8c7f70';
  return '#e39a78';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderHouseSessionAudit(report, root = document.body) {
  const old = document.querySelector('[data-house-session-audit]');
  old?.remove();
  const panel = document.createElement('aside');
  panel.dataset.houseSessionAudit = 'v1';
  panel.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;width:min(520px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:#0d0b07;color:#f5f2eb;border:1px solid #3c3224;padding:14px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 18px 60px rgba(0,0,0,.45)';
  const legs = [
    ['SUPABASE', report.supabase_steward],
    ['COOKIE PRECHECK', report.existing_house_session],
    ['SESSION EXCHANGE', report.session_exchange],
    ['COOKIE VERIFY', report.sealed_house_session],
    ['COMMONS GET', report.commons_get],
  ];
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px">
      <strong style="color:#ffb852;letter-spacing:.1em">HOUSE COMMONS AUTH AUDIT</strong>
      <button type="button" data-house-audit-close style="background:transparent;color:#d9a05b;border:1px solid #3c3224;padding:3px 7px;cursor:pointer">close</button>
    </div>
    ${legs.map(([name, item]) => `<div style="border-top:1px solid #3c3224;padding:7px 0"><b>${escapeHtml(name)}</b> <span style="color:${colourFor(item.status)}">${escapeHtml(String(item.status).toUpperCase())}</span><br><span style="color:#8c7f70">${escapeHtml(item.detail || '')}${item.http_status ? ` · HTTP ${escapeHtml(item.http_status)}` : ''}</span></div>`).join('')}
    <div style="border-top:1px solid #3c3224;padding-top:8px">LEDGER <span style="color:#ffb852">${escapeHtml(report.ledger_snapshot.row_count ?? '—')} rows</span><br><span style="color:#8c7f70">newest: ${escapeHtml(report.ledger_snapshot.newest_receipt || '—')}</span></div>
  `;
  panel.querySelector('[data-house-audit-close]')?.addEventListener('click', () => panel.remove());
  root.append(panel);
  return panel;
}

export async function runAndRenderHouseSessionAudit(options = {}) {
  const report = await runHouseSessionAudit(options);
  renderHouseSessionAudit(report);
  console.groupCollapsed('[Arcsweep] House Commons session audit');
  console.table({
    supabase: report.supabase_steward.status,
    existing_cookie: report.existing_house_session.status,
    exchange: report.session_exchange.status,
    sealed_cookie: report.sealed_house_session.status,
    commons: report.commons_get.status,
    rows: report.ledger_snapshot.row_count,
    newest: report.ledger_snapshot.newest_receipt,
  });
  console.groupEnd();
  return report;
}
