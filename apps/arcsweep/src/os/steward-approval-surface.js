function text(value) {
  return String(value == null ? '' : value);
}

function listMarkup(label, values = []) {
  if (!values.length) return '';
  return `<div class="detail"><strong>${label}</strong><ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></div>`;
}

function escapeHtml(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function installStewardApprovalSurface({ approvals, resolveTrusted, bus = null } = {}) {
  if (!approvals?.list || typeof resolveTrusted !== 'function' || typeof document === 'undefined') return null;

  const host = document.createElement('div');
  host.id = 'arcsweep-steward-approval-surface';
  host.setAttribute('data-arcsweep-os-surface', 'steward-approval');
  const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  document.body.appendChild(host);

  root.innerHTML = `
    <style>
      :host { position: fixed; right: 18px; bottom: 18px; z-index: 2147483000; font: 14px/1.4 system-ui, sans-serif; }
      .shell { width: min(390px, calc(100vw - 28px)); max-height: min(72vh, 640px); overflow: auto; border: 1px solid rgba(180,150,100,.55); border-radius: 16px; background: rgba(18,17,22,.96); color: #f5efe4; box-shadow: 0 18px 54px rgba(0,0,0,.34); }
      header { display:flex; justify-content:space-between; gap:12px; align-items:center; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.09); position:sticky; top:0; background:inherit; }
      header strong { letter-spacing:.04em; }
      .count { min-width:1.7em; text-align:center; border-radius:999px; padding:2px 7px; background:rgba(255,255,255,.1); }
      .empty { padding:14px; opacity:.72; }
      article { padding:14px; border-bottom:1px solid rgba(255,255,255,.08); }
      article:last-child { border-bottom:0; }
      .meta { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
      .chip { border:1px solid rgba(255,255,255,.16); border-radius:999px; padding:2px 7px; font-size:12px; }
      h3 { font-size:14px; margin:0 0 6px; }
      p { margin:6px 0; }
      .detail { margin-top:8px; font-size:12px; }
      ul { margin:4px 0 0 18px; padding:0; }
      .actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
      button { border:1px solid rgba(255,255,255,.18); border-radius:10px; padding:7px 11px; background:rgba(255,255,255,.07); color:inherit; cursor:pointer; }
      button[data-decision="approve"] { border-color:rgba(220,180,95,.65); }
      button:disabled { opacity:.5; cursor:default; }
      .notice { padding:8px 14px; font-size:12px; opacity:.8; border-top:1px solid rgba(255,255,255,.08); }
    </style>
    <section class="shell" aria-label="ArcSweep Steward approvals">
      <header><strong>Steward Gate</strong><span class="count">0</span></header>
      <div class="requests"></div>
      <div class="notice">Privileged authority is minted only from a trusted human action. Models never receive the lease token.</div>
    </section>`;

  const countNode = root.querySelector('.count');
  const requestsNode = root.querySelector('.requests');

  function render() {
    const pending = approvals.list({ status: 'pending' });
    countNode.textContent = String(pending.length);
    if (!pending.length) {
      requestsNode.innerHTML = '<div class="empty">No privileged actions awaiting review.</div>';
      host.hidden = true;
      return;
    }
    host.hidden = false;
    requestsNode.innerHTML = pending.map((record) => `
      <article data-request-id="${escapeHtml(record.request_id)}">
        <div class="meta"><span class="chip">${escapeHtml(record.authority)}</span><span class="chip">${escapeHtml(record.actor_id)}</span></div>
        <h3>${escapeHtml(record.capability_id)}</h3>
        <p>${escapeHtml(record.summary)}</p>
        ${listMarkup('Security flags', record.security_flags)}
        ${listMarkup('Evidence', record.evidence_refs)}
        ${listMarkup('Dissent', record.dissent)}
        ${record.rollback_plan_summary ? `<div class="detail"><strong>Rollback</strong><p>${escapeHtml(record.rollback_plan_summary)}</p></div>` : ''}
        <div class="actions">
          <button type="button" data-decision="reject">Reject</button>
          <button type="button" data-decision="approve">Approve once</button>
        </div>
      </article>`).join('');
  }

  root.addEventListener('click', async (event) => {
    const button = event.target?.closest?.('button[data-decision]');
    if (!button) return;
    if (event.isTrusted !== true) return;
    const article = button.closest('article[data-request-id]');
    const requestId = article?.getAttribute('data-request-id');
    const decision = button.dataset.decision;
    const record = approvals.get(requestId);
    if (!record || record.status !== 'pending') return;
    if (decision === 'approve') {
      const prompt = `${record.authority.toUpperCase()} ${record.capability_id}\n\n${record.summary}\n\nApprove this one capability invocation?`;
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(prompt) !== true) return;
    }
    article.querySelectorAll('button').forEach((item) => { item.disabled = true; });
    try {
      await resolveTrusted({ request_id: requestId, decision, trusted: event.isTrusted === true });
    } finally {
      render();
    }
  });

  const subscriptions = [];
  if (bus?.subscribe) {
    subscriptions.push(['arcsweep:steward-approval-requested', bus.subscribe('arcsweep:steward-approval-requested', render, { id: 'steward-approval-ui-requested' })]);
    subscriptions.push(['arcsweep:steward-approval-resolved', bus.subscribe('arcsweep:steward-approval-resolved', render, { id: 'steward-approval-ui-resolved' })]);
  }

  render();
  return Object.freeze({
    host,
    render,
    destroy() {
      for (const [eventName, subscriptionId] of subscriptions) bus?.unsubscribe?.(eventName, subscriptionId);
      host.remove();
    },
  });
}
