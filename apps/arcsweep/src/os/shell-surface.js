import { submitCognitiveFeedback } from './cognitive-runtime.js';
import { fetchOntologyReviewQueue, submitOntologyReview } from './ontology-runtime.js';

function text(value) { return String(value == null ? '' : value); }

export function installArcSweepOSShell({ os } = {}) {
  if (!os || typeof document === 'undefined' || !document.body) return null;
  if (document.querySelector('[data-arcsweep-os-shell]')) return null;

  const host = document.createElement('section');
  host.dataset.arcsweepOsShell = 'v0.4';
  host.setAttribute('aria-label', 'ArcSweep OS');
  host.innerHTML = `
    <style>
      [data-arcsweep-os-shell]{position:fixed;left:16px;bottom:16px;z-index:2147482500;font:13px/1.35 system-ui,sans-serif;color:#f4eddf}
      [data-arcsweep-os-shell] button,[data-arcsweep-os-shell] input{font:inherit}
      [data-os-launch]{border:1px solid rgba(220,180,95,.55);border-radius:999px;background:rgba(18,17,22,.94);color:inherit;padding:8px 12px;box-shadow:0 8px 28px rgba(0,0,0,.28)}
      [data-os-panel]{width:min(500px,calc(100vw - 28px));margin-top:8px;border:1px solid rgba(220,180,95,.45);border-radius:16px;background:rgba(18,17,22,.97);box-shadow:0 18px 54px rgba(0,0,0,.36);overflow:hidden}
      [data-os-panel][hidden],[data-os-learning][hidden],[data-os-ontology][hidden]{display:none}
      .os-head,.os-actions,.os-guide,.os-learning{display:flex;gap:8px;align-items:center}.os-head{justify-content:space-between;padding:11px 13px;border-bottom:1px solid rgba(255,255,255,.08)}
      .os-state{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;padding:11px 13px}.os-state dt{opacity:.62}.os-state dd{margin:0;overflow-wrap:anywhere}
      .os-actions,.os-guide,.os-learning{padding:10px 13px;border-top:1px solid rgba(255,255,255,.08)}.os-actions{flex-wrap:wrap}.os-guide input,.os-learning input,.os-ontology input{min-width:0;flex:1;border:1px solid rgba(255,255,255,.18);border-radius:9px;background:rgba(255,255,255,.06);color:inherit;padding:7px 9px}.os-actions button,.os-guide button,.os-learning button,.os-head button,.os-ontology button{border:1px solid rgba(255,255,255,.18);border-radius:9px;background:rgba(255,255,255,.06);color:inherit;padding:6px 9px}
      .os-guide-thread{max-height:240px;overflow:auto;display:flex;flex-direction:column;gap:7px;padding:10px 13px;border-top:1px solid rgba(255,255,255,.08);scrollbar-gutter:stable}
      .os-guide-message{max-width:88%;padding:7px 9px;border:1px solid rgba(255,255,255,.12);border-radius:10px;white-space:pre-wrap;overflow-wrap:anywhere}.os-guide-message[data-role="user"]{align-self:flex-end;background:rgba(255,255,255,.07)}.os-guide-message[data-role="assistant"]{align-self:flex-start;background:rgba(220,180,95,.08)}.os-guide-message[data-role="system"]{align-self:center;opacity:.65;border-style:dashed;font-size:12px}.os-guide-speaker{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.58;margin-bottom:2px}
      .os-guide-runtime{padding:0 13px 9px;font-size:11px;opacity:.66;overflow-wrap:anywhere}
      .os-learning{flex-wrap:wrap}.os-learning input{flex-basis:100%}.os-learning small{opacity:.7;flex:1 1 100%}
      .os-ontology{padding:11px 13px;border-top:1px solid rgba(255,255,255,.1);background:rgba(43,64,73,.15)}.os-ontology-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.os-ontology-status{display:block;margin:7px 0;opacity:.72}.os-ontology-summary{white-space:pre-wrap;overflow-wrap:anywhere;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.035);font-size:12px}.os-ontology-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:8px}.os-ontology-metrics label{display:grid;gap:3px;font-size:10px;letter-spacing:.05em}.os-ontology-metrics input{width:100%;box-sizing:border-box}.os-ontology-note{width:100%;box-sizing:border-box;margin-top:8px}.os-ontology-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    </style>
    <button type="button" data-os-launch aria-expanded="false">OS</button>
    <div data-os-panel hidden>
      <div class="os-head"><strong>ArcSweep OS</strong><button type="button" data-os-close>Close</button></div>
      <dl class="os-state"><dt>Boot</dt><dd data-os-boot></dd><dt>Room</dt><dd data-os-room></dd><dt>World</dt><dd data-os-world></dd><dt>Feather</dt><dd data-os-feather></dd><dt>Steward</dt><dd data-os-steward></dd></dl>
      <div class="os-actions"><button type="button" data-os-inspect>Inspect</button><button type="button" data-os-feather>Feather</button><button type="button" data-os-resume>Resume</button><button type="button" data-os-guide-clear>Clear chat</button><button type="button" data-os-ontology-toggle>Ontology</button></div>
      <div class="os-guide-thread" data-os-guide-thread role="log" aria-live="polite" aria-label="ArcSweep Guide conversation"></div>
      <div class="os-guide-runtime" data-os-guide-runtime>Guide conversation ready.</div>
      <form class="os-guide" data-os-guide><input name="utterance" autocomplete="off" aria-label="Talk to ArcSweep Guide" placeholder="Talk to the Guide…"><button>Send</button></form>
      <div class="os-learning" data-os-learning hidden>
        <input data-os-learning-lesson aria-label="Teach ArcSweep from this turn" placeholder="Correction or lesson, if needed…">
        <button type="button" data-os-learn-keep>Keep</button>
        <button type="button" data-os-learn-correct>Correct</button>
        <button type="button" data-os-learn-forget>Forget</button>
        <small data-os-learning-status>This turn is observed, not learned yet.</small>
      </div>
      <section class="os-ontology" data-os-ontology hidden aria-label="Ontology transformation review">
        <div class="os-ontology-head"><strong>Ontology review</strong><button type="button" data-os-ontology-refresh>Refresh</button></div>
        <small class="os-ontology-status" data-os-ontology-status>No transformation loaded.</small>
        <div class="os-ontology-summary" data-os-ontology-summary>Raw survives. Derivations append. Merges never erase.</div>
        <div class="os-ontology-metrics">
          <label>D<input data-os-ontology-metric="distinction_retained" type="number" min="0" max="1" step="0.05" inputmode="decimal" aria-label="Distinction retained"></label>
          <label>P<input data-os-ontology-metric="provenance_retained" type="number" min="0" max="1" step="0.05" inputmode="decimal" aria-label="Provenance retained"></label>
          <label>R<input data-os-ontology-metric="relation_fidelity" type="number" min="0" max="1" step="0.05" inputmode="decimal" aria-label="Relation fidelity"></label>
          <label>U<input data-os-ontology-metric="uncertainty_preserved" type="number" min="0" max="1" step="0.05" inputmode="decimal" aria-label="Uncertainty preserved"></label>
          <label>V<input data-os-ontology-metric="reversibility" type="number" min="0" max="1" step="0.05" inputmode="decimal" aria-label="Reversibility"></label>
        </div>
        <input class="os-ontology-note" data-os-ontology-note aria-label="Ontology Steward note" placeholder="Steward note…">
        <div class="os-ontology-actions">
          <button type="button" data-os-ontology-approve>Approve</button>
          <button type="button" data-os-ontology-flag>Flag loss</button>
          <button type="button" data-os-ontology-unresolved>Unresolved</button>
        </div>
      </section>
    </div>`;
  document.body.appendChild(host);

  const launch = host.querySelector('[data-os-launch]');
  const panel = host.querySelector('[data-os-panel]');
  const thread = host.querySelector('[data-os-guide-thread]');
  const runtime = host.querySelector('[data-os-guide-runtime]');
  const learning = host.querySelector('[data-os-learning]');
  const lesson = host.querySelector('[data-os-learning-lesson]');
  const learningStatus = host.querySelector('[data-os-learning-status]');
  const ontology = host.querySelector('[data-os-ontology]');
  const ontologyStatus = host.querySelector('[data-os-ontology-status]');
  const ontologySummary = host.querySelector('[data-os-ontology-summary]');
  const ontologyNote = host.querySelector('[data-os-ontology-note]');
  const ontologyMetricInputs = [...host.querySelectorAll('[data-os-ontology-metric]')];
  let lastLearningReceiptId = null;
  let ontologyQueue = [];
  let activeOntologyRecord = null;

  function appendGuideMessage(role, content) {
    const value = text(content).trim();
    if (!value) return null;
    const message = document.createElement('div');
    message.className = 'os-guide-message';
    message.dataset.role = role;
    const speaker = document.createElement('span');
    speaker.className = 'os-guide-speaker';
    speaker.textContent = role === 'user' ? 'Rowan' : role === 'assistant' ? 'Guide' : 'ArcSweep';
    const body = document.createElement('span');
    body.textContent = value;
    message.append(speaker, body);
    thread.append(message);
    while (thread.children.length > 14) thread.firstElementChild?.remove();
    thread.scrollTop = thread.scrollHeight;
    return message;
  }

  function renderRuntimeHistory() {
    const history = os.guideRuntime?.history?.() || [];
    thread.replaceChildren();
    for (const turn of history) appendGuideMessage(turn.role === 'assistant' ? 'assistant' : 'user', turn.content);
    if (!history.length) appendGuideMessage('assistant', 'I’m here. Talk to me normally; I can keep the recent thread while promoted learning stays separately Steward-governed.');
  }

  function render() {
    const snap = os.snapshot();
    host.querySelector('[data-os-boot]').textContent = text(snap.boot?.state || 'unknown');
    host.querySelector('[data-os-room]').textContent = text(snap.session?.active_room || 'portal');
    host.querySelector('[data-os-world]').textContent = text(snap.session?.active_world_id || 'none');
    host.querySelector('[data-os-feather]').textContent = snap.feather_paused ? 'paused' : 'clear';
    host.querySelector('[data-os-steward]').textContent = `${Number(snap.steward_gate?.pending || 0)} pending`;
  }

  function setOpen(open) {
    panel.hidden = !open;
    launch.setAttribute('aria-expanded', String(open));
    if (open) {
      render();
      if (!thread.children.length) renderRuntimeHistory();
    }
  }

  async function applyLearningFeedback(verdict) {
    if (!lastLearningReceiptId) return;
    learningStatus.textContent = 'Writing learning receipt…';
    try {
      const result = await submitCognitiveFeedback({
        id: lastLearningReceiptId,
        verdict,
        lesson: verdict === 'correct' ? lesson.value : '',
      });
      learningStatus.textContent = verdict === 'forget'
        ? 'Turn forgotten.'
        : verdict === 'correct'
          ? 'Correction promoted into future Guide context.'
          : 'Turn promoted as a Steward-approved example.';
      if (verdict !== 'forget') lesson.value = '';
      if (result?.status === 'forgotten' || result?.record?.status === 'promoted' || result?.persistence === 'local') {
        lastLearningReceiptId = verdict === 'forget' ? null : lastLearningReceiptId;
      }
    } catch (error) {
      learningStatus.textContent = error?.message || String(error);
    }
  }

  function ontologyMetrics() {
    return Object.fromEntries(ontologyMetricInputs.map((input) => [input.dataset.osOntologyMetric, input.value]));
  }

  function renderOntologyRecord(record) {
    activeOntologyRecord = record || null;
    if (!record) {
      ontologyStatus.textContent = 'No pending transformation receipts.';
      ontologySummary.textContent = 'Raw survives. Derivations append. Merges never erase.';
      ontologyNote.value = '';
      for (const input of ontologyMetricInputs) input.value = '';
      return;
    }
    const preserved = Array.isArray(record.preserved_distinctions) ? record.preserved_distinctions.join(', ') : 'none declared';
    const discarded = Array.isArray(record.discarded_distinctions) && record.discarded_distinctions.length ? record.discarded_distinctions.join(', ') : 'none declared';
    const uncertainty = Array.isArray(record.uncertainty_notes) && record.uncertainty_notes.length ? record.uncertainty_notes.join(' · ') : 'none declared';
    ontologyStatus.textContent = `${ontologyQueue.length} review item${ontologyQueue.length === 1 ? '' : 's'} · ${record.review_status || 'pending'} · ${record.loss_assessment_status || 'unassessed'}`;
    ontologySummary.textContent = [
      `${record.operation_type || 'transformation'} · ${record.source_turn_id || 'no source turn'}`,
      `Preserved: ${preserved}`,
      `Discarded: ${discarded}`,
      `Uncertainty: ${uncertainty}`,
      record.semantic_loss == null ? 'Semantic loss: unassessed' : `Semantic loss: ${record.semantic_loss}`,
    ].join('\n');
    ontologyNote.value = record.steward_note || '';
    for (const input of ontologyMetricInputs) {
      const value = record[input.dataset.osOntologyMetric];
      input.value = value == null ? '' : String(value);
    }
  }

  async function loadOntologyReview() {
    ontologyStatus.textContent = 'Loading transformation receipts…';
    try {
      const result = await fetchOntologyReviewQueue({ limit: 12 });
      ontologyQueue = Array.isArray(result.records) ? result.records : [];
      renderOntologyRecord(ontologyQueue[0] || null);
    } catch (error) {
      ontologyQueue = [];
      activeOntologyRecord = null;
      ontologyStatus.textContent = error?.message || String(error);
      ontologySummary.textContent = 'Ontology review is available on the signed-in hosted Steward surface.';
    }
  }

  async function applyOntologyReview(verdict) {
    if (!activeOntologyRecord?.id) {
      ontologyStatus.textContent = 'No transformation receipt selected.';
      return;
    }
    ontologyStatus.textContent = 'Writing ontology review…';
    try {
      await submitOntologyReview({
        id: activeOntologyRecord.id,
        verdict,
        metrics: ontologyMetrics(),
        note: ontologyNote.value,
      });
      ontologyStatus.textContent = verdict === 'approve'
        ? 'Transformation approved with explicit semantic-loss metrics.'
        : verdict === 'flag_loss'
          ? 'Transformation flagged for semantic loss.'
          : 'Transformation left unresolved.';
      await loadOntologyReview();
    } catch (error) {
      ontologyStatus.textContent = error?.message || String(error);
    }
  }

  launch.addEventListener('click', () => setOpen(panel.hidden));
  host.querySelector('[data-os-close]').addEventListener('click', () => setOpen(false));
  host.querySelector('[data-os-inspect]').addEventListener('click', async () => { await os.inspect(); render(); });
  host.querySelector('[data-os-feather]').addEventListener('click', () => { os.setFeatherPaused(true); render(); });
  host.querySelector('[data-os-resume]').addEventListener('click', () => { os.setFeatherPaused(false); render(); });
  host.querySelector('[data-os-guide-clear]').addEventListener('click', () => {
    os.guideRuntime?.clearHistory?.();
    lastLearningReceiptId = null;
    learning.hidden = true;
    runtime.textContent = 'Recent conversation cleared. Promoted learning is unchanged.';
    renderRuntimeHistory();
  });
  host.querySelector('[data-os-learn-keep]').addEventListener('click', () => void applyLearningFeedback('keep'));
  host.querySelector('[data-os-learn-correct]').addEventListener('click', () => void applyLearningFeedback('correct'));
  host.querySelector('[data-os-learn-forget]').addEventListener('click', () => void applyLearningFeedback('forget'));
  host.querySelector('[data-os-ontology-toggle]').addEventListener('click', () => {
    ontology.hidden = !ontology.hidden;
    if (!ontology.hidden) void loadOntologyReview();
  });
  host.querySelector('[data-os-ontology-refresh]').addEventListener('click', () => void loadOntologyReview());
  host.querySelector('[data-os-ontology-approve]').addEventListener('click', () => void applyOntologyReview('approve'));
  host.querySelector('[data-os-ontology-flag]').addEventListener('click', () => void applyOntologyReview('flag_loss'));
  host.querySelector('[data-os-ontology-unresolved]').addEventListener('click', () => void applyOntologyReview('unresolved'));
  host.querySelector('[data-os-guide]').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.utterance;
    const utterance = String(input.value || '').trim();
    if (!utterance) return;
    const requestId = `os-shell-guide:${Date.now()}`;
    lastLearningReceiptId = null;
    learning.hidden = true;
    learningStatus.textContent = 'This turn is observed, not learned yet.';
    appendGuideMessage('user', utterance);
    const waiting = appendGuideMessage('system', 'Guide thinking…');
    input.value = '';

    const listener = (responseEvent) => {
      if (responseEvent?.detail?.request_id !== requestId) return;
      globalThis.removeEventListener?.('arcsweep:guide-response', listener);
      waiting?.remove();
      const turn = responseEvent.detail?.turn || {};
      appendGuideMessage('assistant', turn.say || turn.status || 'No Guide response.');
      lastLearningReceiptId = turn.learning_receipt_id || null;
      learning.hidden = !lastLearningReceiptId;
      if (lastLearningReceiptId) {
        learningStatus.textContent = `Observed via ${turn.learning_persistence || 'learning ledger'} · ${Number(turn.memory_count || 0)} promoted memories used.`;
      }
      const provider = text(turn.provider || '').trim();
      const model = text(turn.model || '').trim();
      const path = turn.cognitive_runtime === true ? 'cognitive runtime' : text(turn.execution_path || 'fallback runtime');
      const ontologyReceipt = turn.ontology_transformation_id ? `ontology ${text(turn.ontology_review_status || 'pending')}` : '';
      runtime.textContent = [provider, model, path, ontologyReceipt, `${Number(turn.conversation_messages || 0)} recent messages`].filter(Boolean).join(' · ');
      if (turn.ontology_transformation_id && !ontology.hidden) void loadOntologyReview();
      render();
    };
    globalThis.addEventListener?.('arcsweep:guide-response', listener);
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:guide-query', { detail: { request_id: requestId, utterance } }));
  });

  const refresh = () => { if (!panel.hidden) render(); };
  globalThis.addEventListener?.('arcsweep:os-diagnostics', refresh);
  globalThis.addEventListener?.('arcsweep:os-navigation', refresh);
  renderRuntimeHistory();
  render();

  return Object.freeze({
    host,
    render,
    destroy() {
      globalThis.removeEventListener?.('arcsweep:os-diagnostics', refresh);
      globalThis.removeEventListener?.('arcsweep:os-navigation', refresh);
      host.remove();
    },
  });
}
