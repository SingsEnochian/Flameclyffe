export function installSelfAuthoringSurface({ os, agent, document = globalThis.document } = {}) {
  const shell = document?.querySelector('[data-arcsweep-os-shell]');
  if (!shell || shell.querySelector('[data-self-authoring]')) return;
  const host = shell.querySelector('[data-os-panel]') || shell;
  host.style.maxHeight = '85vh'; host.style.overflowY = 'auto';
  const make = (tag, text) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
  const panel = make('details'); panel.dataset.selfAuthoring = 'v1';
  panel.style.cssText = 'padding:12px;border-top:1px solid #546466;max-height:65vh;overflow:auto;';
  panel.append(make('summary', 'Self-authoring agent · sandbox'));
  panel.append(make('p', 'Let the agent learn, write its own guidance, and continue across a compacted handoff. Each run makes five model calls.'));
  function field(label, value, max = 4000) {
    const wrap = make('label', label); wrap.style.display = 'block';
    const input = make('textarea'); input.value = value; input.maxLength = max;
    input.rows = 3; input.style.cssText = 'display:block;width:100%;box-sizing:border-box;background:#152124;color:#eee;margin:6px 0 12px;padding:8px;';
    wrap.append(input); panel.append(wrap); return input;
  }
  const task = field('Learning task', 'Write a short field note about a lantern found beside an unfamiliar doorway.');
  const feedback = field('Your observation or feedback (optional)', '');
  const probe = field('Probe answered before and after learning', 'Write a short field note about a bell found beside an unfamiliar bridge.');
  const voiceLabel = make('label', 'House voice ID');
  const voice = make('input'); voice.value = 'oxalpha'; voice.setAttribute('aria-label', 'House voice ID'); voiceLabel.append(voice); panel.append(voiceLabel);
  const run = make('button', 'Run experiment'); run.type = 'button';
  const stop = make('button', 'Stop'); stop.type = 'button';
  const exportButton = make('button', 'Export experiment'); exportButton.type = 'button';
  for (const button of [run, stop, exportButton]) button.style.cssText = 'margin:8px 5px 8px 0;padding:7px;border:1px solid #607779;border-radius:6px;background:#213033;color:#eee;';
  panel.append(run, stop, exportButton);
  const status = make('p'); status.setAttribute('role', 'status'); panel.append(status);
  const clearError = make('button', 'Clear stored state');
  clearError.type = 'button'; clearError.style.cssText = 'display:none;margin:0 0 8px;padding:7px;border:1px solid #607779;border-radius:6px;background:#213033;color:#eee;';
  clearError.addEventListener('click', async () => {
    try { await os.capabilities.invoke('sandbox.self-authoring.reset', {}, context); render(); }
    catch (err) { status.textContent = err.message; }
  });
  panel.append(clearError);
  const output = make('div'); panel.append(output);
  let last = '';
  const context = { actor_id: 'human-ui', source: 'self-authoring-surface', authority: 'operate', expected_authority: 'operate' };
  function render() {
    const state = agent.snapshot();
    run.disabled = state.busy || !!state.loadError; stop.disabled = !state.busy;
    clearError.style.display = state.loadError ? 'inline-block' : 'none';
    const attempt = state.lastAttempt || state.runs.at(-1);
    status.textContent = state.loadError ? `Stored state could not be read: ${state.loadError}` : (state.busy ? `Running: ${attempt?.stage || 'starting'}` : `${attempt?.status || 'Ready'} · memory revision ${state.revision} · ${state.persistence}${attempt?.error ? ` · ${attempt.error}` : ''}`);
    const encoded = JSON.stringify({ attempt, playbook: state.playbook });
    if (encoded === last) return;
    last = encoded; output.replaceChildren();
    function block(title, value, expanded = true) {
      const details = make('details'); details.open = expanded; details.append(make('summary', title));
      const pre = make('pre', typeof value === 'string' ? value : JSON.stringify(value, null, 2));
      pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;padding:8px;background:#152124;';
      details.append(pre); output.append(details);
    }
    block('Current agent-authored guidance', state.playbook);
    if (attempt) {
      for (const stage of ['baseline', 'experience', 'reflection', 'compaction', 'successor']) {
        const step = attempt.steps.find((item) => item.stage === stage);
        if (step) block(`${stage} · ${step.model}`, step.output, stage !== 'experience');
      }
      if (attempt.changes) block('Memory changes and reasons', attempt.changes, false);
      if (attempt.comparison) block('Comparison', attempt.comparison);
    }
  }
  run.addEventListener('click', async () => {
    run.disabled = true;
    try {
      const result = await os.capabilities.invoke('sandbox.self-authoring.run', { task: task.value, probe: probe.value, feedback: feedback.value, voiceId: voice.value.trim() }, context);
      render();
      if (result.status !== 'applied') status.textContent = result.error || result.reason || (result.status === 'rejected' ? 'Capability rejected: \'operate\' authority required.' : `Experiment ${result.status}`);
    } catch (error) { status.textContent = error.message; run.disabled = false; }
  });
  stop.addEventListener('click', () => { void os.capabilities.invoke('sandbox.self-authoring.stop', {}, { authority: 'read' }); });
  exportButton.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(agent.snapshot(), null, 2)], { type: 'application/json' }));
    const a = make('a'); a.href = url; a.download = 'arcsweep-self-authoring-experiment.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  host.append(panel); render();
  // Rendering is event driven; the OS owns the service lifetime.
  return { render };
}
