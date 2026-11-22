import vesselPlanSource from '../../../../lib/wyrdrune/wayglass-vessel-plan.wtl?raw';
import storyScoreSource from '../../../../lib/wyrdrune/story-soundscape.wtl?raw';
import fullSpectrumSource from '../../../../lib/wyrdrune/full-spectrum.wtl?raw';
import resonanceAtlasSource from '../../../../lib/wyrdrune/resonance-atlas.wtl?raw';
import './program-workbench.css';
import { runWyrdruneProgram, listWyrdrunePrograms, saveWyrdruneProgram, saveWyrdruneRun } from '../wyrdrune-workbench.js';

const PROGRAMS = Object.freeze([
  { id: 'vessel-plan', slug: 'wayglass-vessel-plan', label: 'Wayglass · Whole Vessel Plan', source: vesselPlanSource },
  { id: 'story-soundscape', slug: 'story-soundscape', label: 'StorySoundscape · Double Möbius', source: storyScoreSource },
  { id: 'full-spectrum', slug: 'full-spectrum', label: 'Full Spectrum · Wyrdrune', source: fullSpectrumSource },
  { id: 'resonance-atlas', slug: 'resonance-atlas', label: 'Resonance Atlas · Four Scales', source: resonanceAtlasSource },
]);

const escapeHtml = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

function wizardProgram({ intention, destination, effect }) {
  const quote = value => JSON.stringify(String(value || '').trim());
  return `// Authored with the Wayglass Spell Wizard · native Wyrdrune
mobius {
  perceive {
    let intention = ${quote(intention)};
    let destination = ${quote(destination)};
    let effect = ${quote(effect)};
  }
  compress {
    let focus = 1;
    let expression = intention + " · " + effect;
  }
  release {
    let target = destination;
  }
  verify {
    emit { intention: intention, destination: target, effect: effect };
  }
  integrate {
    withness {
      participants: [
        { id: "rowan", role: "owner-and-author", presence: "declared", agency: "free" },
        { id: "wayglass", role: "vessel-and-language", presence: "runtime", agency: "free" }
      ],
      field: "wyrdrune-spell-wizard",
      agreement: "Compose and explore the authored intention",
      commitment: "Preserve source, choice, return and provenance"
    };
  }
  choose {
    emit expression;
  }
  return {
    emit "Return anchor: " + target;
  }
  transcend {
    emit "Next possibility: " + intention;
  }
}`;
}

export async function mountWayglassProgramWorkbench(root) {
  const programs = [...PROGRAMS];
  let activeProgram = 'vessel-plan';
  let activeSlug = 'wayglass-vessel-plan';
  let pending = false;
  let activeController = null;
  root.innerHTML = `
    <section class="wg-surface wg-program-workbench" data-surface="wayglass-program-workbench">
      <header class="wg-surface-head glass-panel">
        <div>
          <p class="eyebrow">Wayglass · native Wyrdrune environment</p>
          <h1>Program Workbench</h1>
          <p class="lede">Write, inspect, compile and execute Wyrdrune programmes inside Wayglass. The language is the source; the runtime returns the trace.</p>
        </div>
        <div class="wg-program-vitals"><span><strong>WTL</strong> native language</span><span><strong>2×</strong> Möbius vessel plan</span><span><strong>8</strong> system lanes</span></div>
      </header>
      <nav class="wg-deck-nav glass-panel" aria-label="Wayglass programme rooms">
        <button type="button" class="glass-chip active" aria-current="page">Program Workbench</button>
        <button type="button" class="glass-chip" data-wayglass-room="wayglass:writing-room">Scriptorium</button>
        <button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Ship Systems</button>
        <button type="button" class="glass-chip" data-wayglass-room="wayglass:sound-composition">Sound Studio</button>
        <button type="button" class="glass-chip" data-wayglass-room="wayglass:universal-codex">Universal Codex</button>
      </nav>
      <div class="wg-program-toolbar glass-panel">
        <label class="wg-program-select">Programme
          <select data-program-select aria-label="Load a native Wyrdrune programme">
            ${PROGRAMS.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('')}
          </select>
        </label>
        <div class="wg-program-actions">
          <button type="button" class="glass-chip" data-program-load>Load</button>
          <button type="button" class="glass-chip" data-program-save>Save Programme</button>
          <button type="button" class="glass-chip" data-spell-wizard>Spell Wizard</button>
          <button type="button" class="glass-chip" data-program-compile>Compile</button>
          <button type="button" class="glass-chip primary" data-program-run>Run Wyrdrune</button>
        </div>
      </div>
      <div class="wg-program-grid">
        <section class="glass-panel wg-program-editor">
          <div class="wg-program-panel-head"><span class="eyebrow">01 / SOURCE</span><span data-source-count>0 characters</span></div>
          <label class="sr-only" for="wg-wyrdrune-source">Wyrdrune source code</label>
          <textarea id="wg-wyrdrune-source" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Wyrdrune programme source"></textarea>
          <div class="wg-program-status" role="status" aria-live="polite" data-program-status>Loading native programme…</div>
        </section>
        <section class="glass-panel wg-program-inspector">
          <div class="wg-program-panel-head"><span class="eyebrow">02 / PROGRAM VIEWER</span><span data-program-hash>Source not compiled</span></div>
          <pre data-program-ir aria-label="Compiled Wyrdrune intermediate representation">Compile a programme to inspect its typed intermediate representation.</pre>
        </section>
        <section class="glass-panel wg-program-ledger">
          <div class="wg-program-panel-head"><span class="eyebrow">03 / EXECUTION LEDGER</span><span data-program-state>Idle</span></div>
          <pre data-program-output aria-live="polite">Run a programme to inspect phase receipts, outputs and return continuity.</pre>
        </section>
      </div>
      <dialog class="wg-spell-wizard glass-panel" data-save-dialog aria-labelledby="wg-save-title">
        <form method="dialog" data-save-form>
          <p class="eyebrow">Wayglass · durable programme library</p>
          <h2 id="wg-save-title">Save Wyrdrune Programme</h2>
          <label>Programme title<input name="title" required maxlength="160" value="Wayglass Programme"></label>
          <label>Library slug<input name="slug" required maxlength="80" pattern="[a-z0-9][a-z0-9-]{1,79}" value="wayglass-programme"></label>
          <label>Description<input name="description" maxlength="1200" value="Native Wyrdrune programme"></label>
          <div class="wg-program-actions">
            <button type="button" class="glass-chip" data-save-cancel>Return</button>
            <button type="submit" class="glass-chip primary">Save Revision</button>
          </div>
        </form>
      </dialog>
      <dialog class="wg-spell-wizard glass-panel" data-spell-dialog aria-labelledby="wg-spell-title">
        <form method="dialog" data-spell-form>
          <p class="eyebrow">Wyrdrune · authored programme</p>
          <h2 id="wg-spell-title">Spell Wizard</h2>
          <label>Intention<input name="intention" required maxlength="240" value="Open a new path of understanding"></label>
          <label>Destination or world<input name="destination" required maxlength="180" value="wayglass:universe"></label>
          <label>Desired expression or effect<input name="effect" required maxlength="360" value="Gather, transform and return with the insight"></label>
          <div class="wg-program-actions">
            <button type="button" class="glass-chip" data-spell-cancel>Return</button>
            <button type="submit" class="glass-chip primary">Compose Wyrdrune</button>
          </div>
        </form>
      </dialog>
      <footer class="wg-receipt tiny">Native WTL parser · typed IR · execution trace · source hash · return continuity. Host bridges are individually capability-bound.</footer>
    </section>`;

  const editor = root.querySelector('#wg-wyrdrune-source');
  const status = root.querySelector('[data-program-status]');
  const irView = root.querySelector('[data-program-ir]');
  const outputView = root.querySelector('[data-program-output]');
  const hashView = root.querySelector('[data-program-hash]');
  const stateView = root.querySelector('[data-program-state]');
  const sourceCount = root.querySelector('[data-source-count]');
  const select = root.querySelector('[data-program-select]');
  const compileButton = root.querySelector('[data-program-compile]');
  const runButton = root.querySelector('[data-program-run]');
  const loadButton = root.querySelector('[data-program-load]');
  const dialog = root.querySelector('[data-spell-dialog]');
  const form = root.querySelector('[data-spell-form]');
  const saveDialog = root.querySelector('[data-save-dialog]');
  const saveForm = root.querySelector('[data-save-form]');
  const saveButton = root.querySelector('[data-program-save]');

  const updateCount = () => { sourceCount.textContent = editor.value.length + ' characters'; };
  editor.value = vesselPlanSource;
  updateCount();
  status.textContent = 'Whole Vessel Plan loaded. Compile to inspect the native WTL program.';
  select.value = activeProgram;

  function loadProgram() {
    const selected = programs.find(item => item.id === select.value);
    if (!selected) return;
    activeProgram = selected.id;
    activeSlug = selected.slug || null;
    editor.value = selected.source;
    updateCount();
    irView.textContent = 'Programme loaded. Compile to inspect its typed IR.';
    outputView.textContent = 'No execution for this source revision.';
    hashView.textContent = 'Source not compiled';
    stateView.textContent = 'Loaded';
    status.textContent = selected.label + ' loaded into the native editor.';
  }

  async function run(mode) {
    if (pending) return;
    pending = true;
    activeController = new AbortController();
    compileButton.disabled = true;
    runButton.disabled = true;
    loadButton.disabled = true;
    saveButton.disabled = true;
    status.textContent = mode === 'compile' ? 'Compiling Wyrdrune source…' : 'Executing native Wyrdrune programme…';
    stateView.textContent = mode === 'compile' ? 'Compiling' : 'Executing';
    try {
      const kernel = globalThis.__wayglassOS?.kernel;
      const live = kernel?.inspect?.();
      const context = live ? {
        system_count: live.system_count,
        assembled_systems: live.assembled_systems,
        system_ids: live.systems.filter(item => item.state === 'ASSEMBLED').map(item => item.id),
      } : null;
      const builtin = PROGRAMS.find(item => item.id === activeProgram);
      const unchangedBuiltin = Boolean(builtin && editor.value.trim() === builtin.source.trim());
      let receipt;
      if (mode === 'execute' && unchangedBuiltin && activeProgram === 'story-soundscape') {
        const storyScore = globalThis.__wayglassOS?.storyScore;
        if (typeof storyScore?.run !== 'function') throw new Error('Native StorySoundscape runtime is not mounted.');
        const execution = await storyScore.run({ signal: activeController.signal });
        let persistence = { status: 'unavailable' };
        try {
          const run = await saveWyrdruneRun({
            source: editor.value, status: 'committed', executionReceipt: execution,
            context: { program: activeProgram, source_ref: execution.source_ref },
            programSlug: activeSlug,
          });
          persistence = { status: 'saved', run_id: run.run_id };
        } catch (error) { persistence = { status: 'unavailable', detail: String(error?.message || error) }; }
        receipt = {
          schema: 'wayglass.wyrdrune-workbench/v1', mode, source_hash: execution.sourceHash,
          source_verified: true,
          ir: { schema: 'wyrdrune.native-program-receipt/v1', sourceHash: execution.sourceHash, source_ref: execution.source_ref, phase_receipts: execution.phase_receipts },
          execution: { ...execution, status: 'committed' }, persistence,
        };
      } else if (mode === 'execute' && unchangedBuiltin && ['full-spectrum', 'resonance-atlas'].includes(activeProgram)) {
        const field = globalThis.__wayglassOS?.fullSpectrum;
        if (typeof field?.observe !== 'function') throw new Error('Native Full Spectrum runtime is not mounted.');
        if (!field.status().active) field.observe();
        const previousEventId = field.status().last?.event_id || null;
        try {
          if (!field.capture({ kind: 'system', strength: .72, motion: .3, continuity: .9, intent: .8, source_ref: 'wayglass:program-workbench' })) {
            throw new Error('The spectral field did not accept the programme event.');
          }
          const result = await field.flush();
          if (activeController.signal.aborted) {
            const stopped = new Error('Feather held the spectral programme.');
            stopped.name = 'AbortError';
            throw stopped;
          }
          if (!result.last || result.last.event_id === previousEventId || !result.atlas || result.atlas_error) {
            throw new Error(result.atlas_error || result.error || 'The Wyrdrune spectral programme returned an incomplete Atlas frame.');
          }
          const nativeHash = activeProgram === 'resonance-atlas' ? result.atlas.source_hash : result.last.source_hash;
          const execution = {
            schema: activeProgram === 'resonance-atlas' ? 'wayglass.resonance-atlas-workbench/v1' : 'wayglass.full-spectrum-workbench/v1',
            status: 'committed',
            source_hash: nativeHash,
            spectrum: result.last,
            atlas: result.atlas,
            learning: result.learning,
            learning_error: result.learning_error,
            history: result.history.slice(-4),
          };
          let persistence = { status: 'unavailable' };
          try {
            const run = await saveWyrdruneRun({
              source: editor.value, status: 'committed',
              executionReceipt: execution,
              context: { program: activeProgram, system_count: live?.system_count ?? null, assembled_systems: live?.assembled_systems ?? null },
              programSlug: activeSlug,
            });
            persistence = { status: 'saved', run_id: run.run_id };
          } catch (error) { persistence = { status: 'unavailable', detail: String(error?.message || error) }; }
          receipt = {
            schema: 'wayglass.wyrdrune-workbench/v1', mode, source_hash: nativeHash,
            source_verified: true,
            ir: { schema: 'wyrdrune.native-program-receipt/v1', sourceHash: nativeHash, phase_receipts: activeProgram === 'resonance-atlas' ? result.atlas.phase_receipts : result.last.phase_receipts },
            execution, persistence,
          };
        } finally {
          if (field.status().active) field.pause();
        }
      } else {
        receipt = await runWyrdruneProgram(editor.value, {
          mode, context, programId: activeProgram, programSlug: activeSlug,
          signal: activeController.signal,
        });
      }
      irView.textContent = JSON.stringify(receipt.ir, null, 2);
      hashView.textContent = String(receipt.source_hash || receipt.ir?.sourceHash || 'unhashed').slice(0, 16) + '…';
      if (mode === 'compile') {
        outputView.textContent = 'Compilation complete. No programme was executed.\n\n' + JSON.stringify({
          schema: receipt.schema,
          source_verified: receipt.source_verified,
          units: receipt.ir.units.length,
          dispatch: receipt.dispatch,
          external_effects: receipt.external_effects,
        }, null, 2);
        stateView.textContent = 'Compiled';
        status.textContent = 'WTL compiled and source hash verified.';
      } else {
        outputView.textContent = JSON.stringify({ execution: receipt.execution, persistence: receipt.persistence }, null, 2);
        stateView.textContent = receipt.execution.status === 'committed' ? 'Committed' : 'Rolled back';
        status.textContent = receipt.execution.status === 'committed'
          ? (receipt.persistence?.status === 'saved' ? 'Wyrdrune execution and run receipt saved to the Wayglass library.' : 'Wyrdrune execution returned its phase receipts and continuity record.')
          : 'The programme returned to its last committed point. Inspect the verification verdict.';
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        stateView.textContent = 'Held';
        outputView.textContent = 'Execution halted by Feather. The interrupted scoped cycle did not commit new output.';
        status.textContent = 'Feather held the active Wyrdrune programme.';
      } else {
        stateView.textContent = 'Error';
        outputView.textContent = String(error?.message || error);
        status.textContent = 'Wyrdrune workbench reported an error.';
      }
    } finally {
      activeController = null;
      pending = false;
      compileButton.disabled = false;
      runButton.disabled = false;
      loadButton.disabled = false;
      saveButton.disabled = false;
    }
  }

  const onFeather = () => {
    if (activeController) activeController.abort();
  };
  globalThis.addEventListener('wayglass:os:feather', onFeather);
  editor.addEventListener('input', updateCount);
  loadButton.addEventListener('click', loadProgram);
  select.addEventListener('change', loadProgram);
  compileButton.addEventListener('click', () => void run('compile'));
  runButton.addEventListener('click', () => void run('execute'));
  root.querySelector('[data-spell-wizard]')?.addEventListener('click', () => dialog.showModal());
  saveButton.addEventListener('click', () => {
    const current = programs.find(item => item.id === activeProgram);
    saveForm.elements.title.value = current?.label || 'New Wyrdrune Programme';
    saveForm.elements.slug.value = activeSlug || 'new-wyrdrune-programme';
    saveForm.elements.description.value = 'Native Wyrdrune programme';
    saveDialog.showModal();
  });
  root.querySelector('[data-save-cancel]')?.addEventListener('click', () => saveDialog.close());
  saveForm.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(saveForm).entries());
    saveButton.disabled = true;
    status.textContent = 'Saving programme and immutable source revision to the Wayglass library…';
    try {
      const saved = await saveWyrdruneProgram({
        slug: values.slug,
        title: values.title,
        description: values.description,
        source: editor.value,
      });
      const item = {
        id: saved.program.slug,
        slug: saved.program.slug,
        label: saved.program.title,
        source: editor.value,
        version: saved.program.version,
      };
      const existing = programs.findIndex(program => program.slug === item.slug);
      if (existing >= 0) programs.splice(existing, 1, item);
      else programs.push(item);
      activeProgram = item.id;
      activeSlug = item.slug;
      select.replaceChildren(...programs.map(program => new Option(program.label + (program.version ? ' · v' + program.version : ''), program.id)));
      select.value = item.id;
      stateView.textContent = 'Saved v' + item.version;
      status.textContent = 'Programme and immutable revision saved to the Supabase Wayglass library.';
      saveDialog.close();
    } catch (error) {
      stateView.textContent = 'Save failed';
      outputView.textContent = String(error?.message || error);
      status.textContent = 'Programme save failed. Your source remains in the editor.';
    } finally {
      saveButton.disabled = false;
    }
  });
  root.querySelector('[data-spell-cancel]')?.addEventListener('click', () => dialog.close());
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    editor.value = wizardProgram(values);
    activeProgram = 'spell-wizard:' + Date.now().toString(36);
    activeSlug = null;
    updateCount();
    irView.textContent = 'New Wyrdrune source composed. Compile to inspect the typed program.';
    outputView.textContent = 'Not executed yet.';
    hashView.textContent = 'Source not compiled';
    stateView.textContent = 'Authored';
    status.textContent = 'Spell Wizard composed a native Wyrdrune programme. Edit it freely, then compile or run.';
    dialog.close();
  });
  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });

  async function refreshLibrary() {
    try {
      const stored = await listWyrdrunePrograms();
      for (const record of stored) {
        const item = {
          id: record.slug,
          slug: record.slug,
          label: record.title,
          source: record.source,
          version: record.version,
        };
        const existing = programs.findIndex(program => program.slug === item.slug);
        if (existing >= 0) {
          item.id = programs[existing].id;
          programs.splice(existing, 1, item);
        } else programs.push(item);
      }
      select.replaceChildren(...programs.map(item => new Option(item.label + (item.version ? ' · v' + item.version : ''), item.id)));
      select.value = activeProgram;
      status.textContent = stored.length + ' saved Wyrdrune programme(s) loaded from the Wayglass library.';
    } catch (error) {
      status.textContent = 'Native Wyrdrune editor ready. Library connection: ' + String(error?.message || error);
    }
  }
  void refreshLibrary();

  return () => {
    globalThis.removeEventListener('wayglass:os:feather', onFeather);
    activeController?.abort();
    for (const button of [compileButton, runButton, loadButton]) button.disabled = true;
    if (dialog.open) dialog.close();
    if (saveDialog.open) saveDialog.close();
  };
}
