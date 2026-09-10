import { TEMPORAL_RELATION_TYPES } from './temporal-witness-service.js';

const TYPE_META = Object.freeze({
  'real-world-event': ['🌍', 'World event'],
  'personal-event': ['🫀', 'Personal event'],
  dream: ['🌙', 'Dream'],
  synchronicity: ['✨', 'Synchronicity'],
  'prediction-intuition': ['🔮', 'Prediction / intuition'],
  'memory-divergence': ['🪞', 'Memory divergence'],
  'social-climate': ['📡', 'Social climate'],
  'system-note': ['⚙️', 'System note'],
});

const RELATION_LABELS = Object.freeze({
  related: 'Related',
  'independent-convergence': 'Independent convergence',
  corroborates: 'Corroborates',
  contradicts: 'Contradicts',
  follows: 'Follows',
  precedes: 'Precedes',
  'same-thread': 'Same thread',
  contextual: 'Contextual',
});

function text(value) { return String(value == null ? '' : value); }
function splitList(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }

function formatTime(value) {
  if (!value) return 'time unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value);
  try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date); }
  catch { return date.toLocaleString(); }
}

function localDateTimeValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function percent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${Math.round(number * 100)}%`;
}

function weatherCopy(value) {
  if (value === 'dense') return 'Dense braid. Many anchors are landing close together.';
  if (value === 'braided') return 'Braided. Several threads are crossing today.';
  if (value === 'stirring') return 'Stirring. A few fresh anchors are in motion.';
  return 'Quiet water. The ledger is listening.';
}

function make(tag, className = null, value = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = text(value);
  return node;
}

function relationPayload(form) {
  const ids = splitList(form.elements.related_records?.value);
  const relationType = form.elements.relation_type?.value || 'related';
  return ids.map((record_id) => ({ record_id, relation_type: relationType }));
}

export function installTemporalWitnessSurface({ os } = {}) {
  if (!os?.capabilities?.invoke || typeof document === 'undefined' || !document.body) return null;
  if (document.querySelector('[data-temporal-witness-surface]')) return null;

  const shell = document.querySelector('[data-arcsweep-os-shell]');
  if (!shell) return null;
  const actions = shell.querySelector('.os-actions');
  const guide = shell.querySelector('.os-guide');
  if (!actions || !guide) return null;

  const style = document.createElement('style');
  style.textContent = `
    [data-temporal-witness-surface]{border-top:1px solid rgba(255,255,255,.08);padding:11px 13px;max-height:62vh;overflow:auto}
    [data-temporal-witness-surface][hidden]{display:none}.tw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.tw-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6}.tw-weather{font-size:14px;font-weight:650;margin-top:2px}.tw-copy{font-size:12px;opacity:.72;margin-top:2px}
    .tw-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}.tw-stat{padding:7px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.035)}.tw-stat b{display:block;font-size:15px}.tw-stat span{font-size:10px;opacity:.65}
    .tw-convergence{border:1px solid rgba(220,180,95,.35);border-radius:12px;padding:8px 9px;margin:8px 0;background:rgba(220,180,95,.07)}.tw-convergence[hidden]{display:none}.tw-convergence strong{display:block}.tw-convergence-list{display:grid;gap:3px;margin-top:4px;font-size:11px;opacity:.82}
    .tw-threads{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0 10px}.tw-chip{border-radius:999px;border:1px solid rgba(220,180,95,.3);padding:3px 7px;font-size:11px;background:rgba(220,180,95,.06)}
    .tw-form{display:grid;gap:7px;padding:9px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.025)}.tw-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.tw-form input,.tw-form select,.tw-form textarea{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.055);color:inherit;padding:7px 8px;font:inherit}.tw-form textarea{min-height:66px;resize:vertical}.tw-form button,.tw-close{border:1px solid rgba(220,180,95,.4);border-radius:8px;background:rgba(220,180,95,.08);color:inherit;padding:6px 9px;font:inherit}.tw-note{font-size:10px;opacity:.58}.tw-message{font-size:11px;min-height:15px;opacity:.78}
    .tw-lens{border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:6px 8px;background:rgba(255,255,255,.02)}.tw-lens summary{cursor:pointer;font-weight:650;font-size:12px}.tw-lens-copy{font-size:10px;opacity:.62;margin:4px 0 7px}.tw-lens-grid{display:grid;gap:6px}
    .tw-recent{display:grid;gap:6px;margin-top:10px}.tw-card{border-left:2px solid rgba(220,180,95,.5);padding:5px 8px;background:rgba(255,255,255,.025);border-radius:0 8px 8px 0}.tw-card-head{display:flex;justify-content:space-between;gap:8px;font-size:11px}.tw-card-title{font-weight:650}.tw-card-time{opacity:.55;white-space:nowrap}.tw-card-body{font-size:11px;opacity:.72;margin-top:2px;white-space:pre-wrap;overflow-wrap:anywhere}.tw-card-meta{font-size:10px;opacity:.55;margin-top:3px}.tw-empty{font-size:11px;opacity:.6;padding:6px 0}
    @media(max-width:520px){.tw-grid{grid-template-columns:1fr 1fr}.tw-row{grid-template-columns:1fr}}
  `;
  shell.appendChild(style);

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.dataset.osWitness = 'open';
  openButton.textContent = 'Chronicle';
  actions.appendChild(openButton);

  const panel = document.createElement('section');
  panel.dataset.temporalWitnessSurface = 'v0.2';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Temporal Witness Chronicle');
  panel.innerHTML = `
    <div class="tw-head">
      <div><div class="tw-kicker">Temporal Weather</div><div class="tw-weather" data-tw-weather>Quiet</div><div class="tw-copy" data-tw-weather-copy></div></div>
      <button type="button" class="tw-close" data-tw-close>Close</button>
    </div>
    <div class="tw-grid">
      <div class="tw-stat"><b data-tw-total>0</b><span>anchors</span></div>
      <div class="tw-stat"><b data-tw-day>0</b><span>last 24h</span></div>
      <div class="tw-stat"><b data-tw-source>0%</b><span>source-linked</span></div>
      <div class="tw-stat"><b data-tw-method>0%</b><span>Witness Lens</span></div>
    </div>
    <div class="tw-convergence" data-tw-convergence hidden><strong>✨ Convergence detected</strong><div class="tw-convergence-list" data-tw-convergence-list></div></div>
    <div class="tw-threads" data-tw-threads></div>
    <form class="tw-form" data-tw-form>
      <div class="tw-row"><select name="record_type" aria-label="Record type"></select><input name="occurred_at" type="datetime-local" aria-label="When it happened"></div>
      <input name="title" maxlength="180" placeholder="What happened?">
      <textarea name="description" maxlength="12000" placeholder="Details, texture, what you noticed…"></textarea>
      <div class="tw-row"><input name="tags" placeholder="tags, comma separated"><input name="sources" placeholder="source refs, comma separated"></div>
      <div class="tw-row"><input name="witnesses" placeholder="witnesses / archives"><input name="observers" placeholder="independent observers / logs"></div>
      <div class="tw-row"><input name="related_records" placeholder="related anchor IDs"><select name="relation_type" aria-label="Relation type"></select></div>
      <div class="tw-row"><select name="epistemic_status" aria-label="Record mode"><option value="">Auto mode</option><option value="observed">Observed</option><option value="reported">Reported</option><option value="remembered">Remembered</option><option value="dreamed">Dreamed</option><option value="inferred">Inferred</option><option value="speculative">Speculative</option></select><input name="confidence" type="number" min="0" max="1" step="0.05" placeholder="confidence 0–1"></div>
      <details class="tw-lens"><summary>🔎 Witness Lens · sharpen the record</summary><div class="tw-lens-copy">Observer methodology in four questions. Fill any that help. The prose stays local with the anchor.</div><div class="tw-lens-grid">
        <textarea name="direct_observation" maxlength="4000" placeholder="What did you directly observe or receive?"></textarea>
        <textarea name="change_noted" maxlength="4000" placeholder="What changed from the previous state?"></textarea>
        <textarea name="why_noteworthy" maxlength="4000" placeholder="Why is this worth preserving?"></textarea>
        <input name="method_note" maxlength="2000" placeholder="Method note: how was this noticed, measured, or compared?">
      </div></details>
      <button type="submit">Anchor it</button>
      <div class="tw-note">Stored locally. Full text and Witness Lens prose stay out of the OS event stream; Observer receives only a bounded anchor header.</div>
      <div class="tw-message" data-tw-message aria-live="polite"></div>
    </form>
    <div class="tw-recent" data-tw-recent></div>`;
  guide.parentNode.insertBefore(panel, guide);

  const typeSelect = panel.querySelector('select[name="record_type"]');
  for (const [value, [icon, label]] of Object.entries(TYPE_META)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${icon} ${label}`;
    typeSelect.appendChild(option);
  }

  const relationSelect = panel.querySelector('select[name="relation_type"]');
  for (const value of TEMPORAL_RELATION_TYPES) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = RELATION_LABELS[value] || value;
    relationSelect.appendChild(option);
  }
  panel.querySelector('input[name="occurred_at"]').value = localDateTimeValue();

  async function invoke(capabilityId, input = {}) {
    const humanLocal = capabilityId === 'witness.record' || capabilityId === 'witness.list-local';
    return os.capabilities.invoke(capabilityId, input, {
      actor_id: 'human-ui',
      source: 'temporal-witness-surface',
      authority: humanLocal ? 'operate' : 'read',
      expected_authority: humanLocal ? 'operate' : 'read',
      confirmed: humanLocal,
    });
  }

  async function render() {
    const [summaryReceipt, recordsReceipt] = await Promise.all([
      invoke('witness.summary'),
      invoke('witness.list-local', { limit: 8 }),
    ]);
    if (summaryReceipt.status !== 'applied') return;
    const summary = summaryReceipt.output || {};
    panel.querySelector('[data-tw-weather]').textContent = text(summary.temporal_weather || 'quiet').replace(/^./, (c) => c.toUpperCase());
    panel.querySelector('[data-tw-weather-copy]').textContent = weatherCopy(summary.temporal_weather);
    panel.querySelector('[data-tw-total]').textContent = text(summary.total_records || 0);
    panel.querySelector('[data-tw-day]').textContent = text(summary.last_24h || 0);
    panel.querySelector('[data-tw-source]').textContent = percent(summary.source_density);
    panel.querySelector('[data-tw-method]').textContent = percent(summary.methodology_density);

    const convergence = panel.querySelector('[data-tw-convergence]');
    const convergenceList = panel.querySelector('[data-tw-convergence-list]');
    convergenceList.replaceChildren();
    const candidates = summary.convergences || [];
    convergence.hidden = !summary.convergence_detected;
    if (summary.convergence_detected) {
      if (candidates.length) {
        for (const item of candidates.slice(0, 4)) {
          convergenceList.appendChild(make('div', null, `#${item.thread}: ${item.record_count} anchors · ${item.observer_count} independent observers${item.explicit_relation_count ? ` · ${item.explicit_relation_count} explicit link${item.explicit_relation_count === 1 ? '' : 's'}` : ''}`));
        }
      } else {
        convergenceList.appendChild(make('div', null, `${summary.explicit_convergence_links || 0} explicit independent-convergence link${summary.explicit_convergence_links === 1 ? '' : 's'} recorded.`));
      }
    }

    const threads = panel.querySelector('[data-tw-threads]');
    threads.replaceChildren();
    if (summary.threads?.length) {
      for (const item of summary.threads) threads.appendChild(make('span', 'tw-chip', `#${item.tag} ×${item.count}`));
    } else {
      threads.appendChild(make('span', 'tw-empty', 'No recurring threads yet. The first anchors get to name the weather.'));
    }

    const recent = panel.querySelector('[data-tw-recent]');
    recent.replaceChildren();
    const records = recordsReceipt.status === 'applied' ? recordsReceipt.output?.records || [] : [];
    if (!records.length) {
      recent.appendChild(make('div', 'tw-empty', 'No anchors yet. Drop the first breadcrumb.'));
      return;
    }
    for (const record of [...records].reverse()) {
      const card = make('article', 'tw-card');
      const head = make('div', 'tw-card-head');
      const meta = TYPE_META[record.record_type] || ['•', record.record_type || 'record'];
      head.appendChild(make('span', 'tw-card-title', `${meta[0]} ${record.title || meta[1]}`));
      head.appendChild(make('span', 'tw-card-time', formatTime(record.occurred_at)));
      card.appendChild(head);
      if (record.description) card.appendChild(make('div', 'tw-card-body', record.description.slice(0, 320)));
      const bits = [];
      if (record.source_refs?.length) bits.push(`${record.source_refs.length} source${record.source_refs.length === 1 ? '' : 's'}`);
      if (record.observer_refs?.length) bits.push(`${record.observer_refs.length} observer${record.observer_refs.length === 1 ? '' : 's'}`);
      if (record.relations?.length) bits.push(`${record.relations.length} relation${record.relations.length === 1 ? '' : 's'}`);
      const lensCount = ['direct_observation','change_noted','why_noteworthy','method_note'].filter((key) => record.methodology?.[key]).length;
      if (lensCount) bits.push(`Lens ${lensCount}/4`);
      if (bits.length) card.appendChild(make('div', 'tw-card-meta', bits.join(' · ')));
      recent.appendChild(card);
    }
  }

  function setOpen(open) {
    panel.hidden = !open;
    openButton.setAttribute('aria-pressed', String(open));
    if (open) void render();
  }

  openButton.addEventListener('click', () => setOpen(panel.hidden));
  panel.querySelector('[data-tw-close]').addEventListener('click', () => setOpen(false));
  panel.querySelector('[data-tw-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = panel.querySelector('[data-tw-message]');
    const occurred = form.elements.occurred_at.value ? new Date(form.elements.occurred_at.value).toISOString() : null;
    const confidence = form.elements.confidence.value === '' ? undefined : Number(form.elements.confidence.value);
    message.textContent = 'Setting anchor…';
    const receipt = await invoke('witness.record', {
      record_type: form.elements.record_type.value,
      occurred_at: occurred,
      title: form.elements.title.value,
      description: form.elements.description.value,
      tags: splitList(form.elements.tags.value),
      source_refs: splitList(form.elements.sources.value),
      witness_refs: splitList(form.elements.witnesses.value),
      observer_refs: splitList(form.elements.observers.value),
      relations: relationPayload(form),
      epistemic_status: form.elements.epistemic_status.value || undefined,
      confidence,
      methodology: {
        direct_observation: form.elements.direct_observation.value,
        change_noted: form.elements.change_noted.value,
        why_noteworthy: form.elements.why_noteworthy.value,
        method_note: form.elements.method_note.value,
      },
    });
    if (receipt.status === 'applied') {
      const explicitConvergence = receipt.output?.relations?.some((item) => item.relation_type === 'independent-convergence');
      message.textContent = explicitConvergence ? 'Anchor set. Convergence link recorded. ✨' : 'Anchor set. Chronicle updated.';
      for (const name of ['title','description','tags','sources','witnesses','observers','related_records','confidence','direct_observation','change_noted','why_noteworthy','method_note']) form.elements[name].value = '';
      form.elements.relation_type.value = 'related';
      form.elements.epistemic_status.value = '';
      form.elements.occurred_at.value = localDateTimeValue();
      await render();
    } else {
      message.textContent = `Anchor refused: ${receipt.reason || receipt.error || receipt.status}`;
    }
  });

  const refresh = () => { if (!panel.hidden) void render(); };
  globalThis.addEventListener?.('arcsweep:temporal-witness-updated', refresh);

  return Object.freeze({
    panel,
    render,
    open: () => setOpen(true),
    close: () => setOpen(false),
    destroy() {
      globalThis.removeEventListener?.('arcsweep:temporal-witness-updated', refresh);
      openButton.remove();
      panel.remove();
      style.remove();
    },
  });
}
