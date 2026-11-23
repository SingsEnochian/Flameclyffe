import {translateSemantic} from '../../../../lib/wyrdrune/skyrunor-bridge.mjs';
import {FICTION_EXAMPLE,fictionToWtl,verifyFictionExecution} from '../../../../lib/wyrdrune/fiction-mobius.mjs';
import {sha256Hex} from '../../../../lib/wyrdrune/browser-canonical.mjs';
import {publishWatercolorActivity} from '../watercolor-bridge.js';
import {EXAMPLE_CHANGE} from '../../../../lib/wyrdrune/skyrunor-change.mjs';
import {astToWtl,englishToDeclaration} from '../../../../lib/wyrdrune/skyrunor.mjs';
import vesselPlanSource from '../../../../lib/wyrdrune/wayglass-vessel-plan.wtl?raw';
import storyScoreSource from '../../../../scores/wyrdrune/story-soundscape-v0.1.wtl?raw';
import fullSpectrumSource from '../../../../lib/wyrdrune/full-spectrum.wtl?raw';
import resonanceAtlasSource from '../../../../lib/wyrdrune/resonance-atlas.wtl?raw';
import { createWyrdruneRuntime } from '../../../../lib/wyrdrune/runtime.mjs';
import { glossProgram } from '../../../../lib/wyrdrune/gloss.mjs';
import { wtlToEnglish, englishToWtl, wtlToGlyphTransport, glyphTransportToWtl } from '../../../../lib/wyrdrune/bidirectional.mjs';
import './program-workbench.css';
import { runWyrdruneProgram, listWyrdrunePrograms, saveWyrdruneProgram, saveWyrdruneRun } from '../wyrdrune-workbench.js';
import { previewSomaNovaMorphogenesis } from '../soma-nova-client.js';

const PROGRAMS = Object.freeze([
  { id: 'owner-eye-colour', slug: null, label: 'Skýrunor · Owner eye-colour declaration', source: astToWtl(englishToDeclaration('Owner declaration: My eyes are hazel green.')) },
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
  let proposalOnly = false;
  let activeController = null;
  let somaController = null;
  let stagedFiction = null;
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
      <section class="glass-panel wg-soma-nova-folio" aria-labelledby="wg-soma-title">
        <div class="wg-program-panel-head"><span class="eyebrow">SOMA NOVA / MORPHOGENESIS</span><span>Native WTL organ · preview</span></div>
        <h2 id="wg-soma-title">Morphogenesis Folio</h2>
        <p class="tiny">Derive a versioned form while preserving its identity anchor and return lineage. The authenticated host verifies the plan. This first slice is preview-only: it does not persist a form or dispatch a physical, device, network or provider effect.</p>
        <div class="wg-soma-form-grid">
          <label>Base form · JSON
            <textarea data-soma-base rows="10" spellcheck="false" aria-label="Soma Nova base form JSON">{
  "identity_ref": "rowan",
  "form_id": "rowan-base",
  "domains": ["appearance", "structure", "function", "environment"],
  "appearance": {},
  "capabilities": [],
  "sensory_profile": {"accessibility": ["keyboard", "touch", "screen-reader"]},
  "environment_profile": {},
  "return_anchor": "rowan-base"
}</textarea>
          </label>
          <label>Derived form · JSON
            <textarea data-soma-target rows="10" spellcheck="false" aria-label="Soma Nova derived form JSON">{
  "identity_ref": "rowan",
  "form_id": "rowan-form-01",
  "parent_form_id": "rowan-base",
  "domains": ["appearance", "structure", "function", "environment"],
  "appearance": {"profile": "owner-authored"},
  "capabilities": [],
  "sensory_profile": {"accessibility": ["keyboard", "touch", "screen-reader"]},
  "environment_profile": {},
  "return_anchor": "rowan-base"
}</textarea>
          </label>
        </div>
        <div class="wg-program-actions">
          <button type="button" class="glass-chip primary" data-soma-preview>Charge · Verify · Preview</button>
          <button type="button" class="glass-chip" data-soma-reset>Reset example</button>
          <span class="tiny" data-soma-status role="status" aria-live="polite">No MorphPlan charged.</span>
        </div>
        <pre class="wg-soma-receipt" data-soma-receipt aria-live="polite">The Folio is ready. A preview leaves the base form unchanged.</pre>
      </section>
      <div class="wg-program-grid">
        <section class="glass-panel wg-program-editor">
          <div class="wg-program-panel-head"><span class="eyebrow">01 / SOURCE</span><span data-source-count>0 characters</span></div>
          <label class="sr-only" for="wg-wyrdrune-source">Wyrdrune source code</label>
          <textarea id="wg-wyrdrune-source" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Wyrdrune programme source"></textarea>
          <details class="wg-program-fiction" data-fiction-authoring>
            <summary>Living Fiction · prose → Möbius WTL → Return</summary>
            <p class="tiny">Authored prose becomes real Eightfold story events. ::cue and ::change stay proposals, not device/world effects. No model calls. Compose first; Run stays your choice.</p>
            <label for="wg-fiction-world">Fiction world <input id="wg-fiction-world" maxlength="120" value="wayglass:fiction"></label>
            <label for="wg-fiction-text">Authored fiction
              <textarea id="wg-fiction-text" rows="9" spellcheck="true" maxlength="12000">${escapeHtml(FICTION_EXAMPLE)}</textarea>
            </label>
            <button type="button" class="glass-chip" data-fiction-compose>Compose living Möbius WTL</button>
            <pre data-fiction-preview aria-live="polite">No execution or media generation yet.</pre>
          </details>
          <details class="wg-program-language-bridge" data-language-bridge>
            <summary>WTL ⇄ British English ⇄ Skýrunor</summary>
            <p class="tiny">Core Wyrdrune translation. English is a controlled authoring dialect, not unrestricted prose. Semantic Skýrunor v0.1 represents owner-declared eye colour. Rune byte transport separately preserves any exact WTL source. No code executes during translation.</p>
            <label for="wg-sky-declaration">Owner declaration
              <textarea id="wg-sky-declaration" rows="2" spellcheck="false">Owner declaration: My eyes are hazel green.</textarea>
            </label>
            <label for="wg-sky-glyphs">Semantic Skýrunor v0.1
              <textarea id="wg-sky-glyphs" rows="2" spellcheck="false" autocapitalize="off">ᛋᚴ:ᛗ/ᛖ/ᚲ=ᚺᚷ!ᛞ</textarea>
            </label>
            <p class="tiny">ᛗ owner · ᛖ eyes · ᚲ colour · ᛞ owner-declared. Colours: hazel green, hazel, green, blue, brown, grey. Records an assertion, not physical verification or author authentication.</p>
            <div class="wg-program-actions">
              <button type="button" class="glass-chip" data-sky-declaration>Declaration → Skýrunor + WTL</button>
              <button type="button" class="glass-chip" data-sky-decode>Skýrunor → WTL + English</button>
              <button type="button" class="glass-chip" data-sky-encode>WTL → Skýrunor</button>
            </div>
            <div class="wg-program-actions">
              <button type="button" class="glass-chip" data-to-english>WTL → English</button>
              <button type="button" class="glass-chip" data-from-english>English → WTL</button>
              <button type="button" class="glass-chip" data-to-glyphs>WTL → Runes</button>
              <button type="button" class="glass-chip" data-from-glyphs>Runes → WTL</button>
            </div>
            <details><summary>General change proposals</summary>
            <p class="tiny">Values, identity, relationships, state, time, provenance, consent, structure, capabilities, environment and uninterpreted extensions. A typed proposal grants no authority. Domain execution is explicitly unsupported.</p>
            <label for="wg-sky-change">Typed change record (JSON)<textarea id="wg-sky-change" rows="8" spellcheck="false">${escapeHtml(JSON.stringify(EXAMPLE_CHANGE,null,2))}</textarea></label>
            <button type="button" class="glass-chip" data-sky-change>Inspect change → Skýrunor</button>
            </details>
            <label for="wg-wtl-english">Structured British English
              <textarea id="wg-wtl-english" aria-label="Editable structured British English" rows="10" spellcheck="false" placeholder="Circuit 1 (shared):&#10;Perceive:&#10;  Let depth be 1."></textarea>
            </label>
            <label for="wg-wtl-glyphs">Exact rune byte transport (ᛟᛟ)
              <textarea id="wg-wtl-glyphs" aria-label="Reversible Skýrunor rune transport" rows="5" spellcheck="false" placeholder="Versioned runic transport appears here."></textarea>
            </label>
            <p class="tiny" role="status" aria-live="polite" data-language-status>Translate to begin. Compile or run remains a separate owner action.</p>
          </details>
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

  const languageCompiler = createWyrdruneRuntime({hashSource:sha256Hex}).compile;
  const semanticArea = root.querySelector('#wg-sky-glyphs');
  const declarationArea = root.querySelector('#wg-sky-declaration');
  const englishArea = root.querySelector('#wg-wtl-english');
  const glyphArea = root.querySelector('#wg-wtl-glyphs');
  const languageStatus = root.querySelector('[data-language-status]');
  const englishButton = root.querySelector('[data-to-english]');
  const wtlButton = root.querySelector('[data-from-english]');
  const glyphButton = root.querySelector('[data-to-glyphs]');
  const unglyphButton = root.querySelector('[data-from-glyphs]');
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
  const invalidateLanguage = () => {
    stagedFiction=null;proposalOnly=false;runButton.disabled=pending;compileButton.disabled=pending;
    englishArea.value = '';
    glyphArea.value = '';
    semanticArea.value = '';
    languageStatus.textContent = 'Source changed. Translate this revision again.';
  };
  const acceptTranslatedSource = (source, label) => {
    if (pending) throw new Error('Wait until the current programme finishes.');
    stagedFiction=null;proposalOnly=false;runButton.disabled=false;compileButton.disabled=false;
    languageCompiler(source); // Compilation, not execution.
    editor.value = source;
    semanticArea.value = '';
    activeProgram = 'language-draft';
    activeSlug = null;
    updateCount();
    irView.textContent = 'Translated source not executed. Compile to inspect host-verified IR.';
    outputView.textContent = 'Translation only; no effects or external calls.';
    hashView.textContent = 'Source not compiled';
    stateView.textContent = 'Translated';
    languageStatus.textContent = label + ' Compiled locally; no code executed.';
    status.textContent = 'Translated Wyrdrune draft. Inspect before explicitly compiling or running.';
  };
  function showSemantic(format,input) {
    try {
      if(pending)throw new Error('Wait until the current programme finishes.');
      const result=translateSemantic({format,input},{compile:languageCompiler});
      if(!result.source){
        proposalOnly=true;runButton.disabled=true;compileButton.disabled=true;
        semanticArea.value=result.glyphs;englishArea.value=result.english;
        root.querySelector('#wg-sky-change').value=JSON.stringify(result.ast,null,2);
        irView.textContent=JSON.stringify(result.ast,null,2);outputView.textContent=JSON.stringify(result,null,2);
        stateView.textContent='Proposal only';
        languageStatus.textContent='No domain executor. No change applied. Edit or load WTL to enable execution.';
        return;
      }
      acceptTranslatedSource(result.source,'Semantic round trip verified; owner declaration, not physical verification.');
      semanticArea.value=result.glyphs;declarationArea.value=result.declaration||'';
      englishArea.value=result.english;glyphArea.value='';
      irView.textContent=JSON.stringify(result.ast,null,2);
    } catch(error) { languageStatus.textContent='Semantic translation refused: '+String(error?.message||error); }
  }
  root.querySelector('[data-sky-change]').addEventListener('click',()=>{try{showSemantic('change',JSON.parse(root.querySelector('#wg-sky-change').value));}catch(error){languageStatus.textContent='Invalid change record: '+error.message;}});
  root.querySelector('[data-sky-declaration]').addEventListener('click',()=>showSemantic('declaration',declarationArea.value));
  root.querySelector('[data-sky-decode]').addEventListener('click',()=>showSemantic('skyrunor',semanticArea.value));
  root.querySelector('[data-sky-encode]').addEventListener('click',()=>showSemantic('wtl',editor.value));
  englishButton.addEventListener('click', () => {
    try {
      const result = wtlToEnglish(editor.value, {compile:languageCompiler});
      englishArea.value = result.english;
      languageStatus.textContent = 'Reversible structured English ready. No model contacted.';
    } catch (error) {
      try {
        englishArea.value = glossProgram(languageCompiler(editor.value)).text;
        languageStatus.textContent = 'Read-only English gloss. This source uses declarations not yet reversible in the controlled dialect: ' + error.message;
      } catch (compileError) {
        englishArea.value = '';
        languageStatus.textContent = 'Not translated: ' + String(compileError?.message || compileError);
      }
    }
  });
  wtlButton.addEventListener('click', () => {
    try {
      if(englishArea.value.startsWith('Proposed ')){showSemantic('change-en-GB',englishArea.value);return;}
      const result = englishToWtl(englishArea.value, {compile:languageCompiler});
      acceptTranslatedSource(result.source, 'English → WTL translation ready.');
      glyphArea.value = ''; // Existing transport no longer refers to this source.
    } catch (error) { languageStatus.textContent = 'English translation refused: ' + String(error?.message || error); }
  });
  glyphButton.addEventListener('click', () => {
    try {
      languageCompiler(editor.value);
      glyphArea.value = wtlToGlyphTransport(editor.value);
      languageStatus.textContent = 'Lossless rune transport ready for this WTL revision; not a semantic glyph translation.';
    } catch (error) { languageStatus.textContent = 'Rune transport refused: ' + String(error?.message || error); }
  });
  unglyphButton.addEventListener('click', () => {
    try {
      const source = glyphTransportToWtl(glyphArea.value);
      acceptTranslatedSource(source, 'Rune transport decoded.');
      englishArea.value = '';
    } catch (error) { languageStatus.textContent = 'Rune decode refused: ' + String(error?.message || error); }
  });

  const somaBaseArea = root.querySelector('[data-soma-base]');
  const somaTargetArea = root.querySelector('[data-soma-target]');
  const somaStatus = root.querySelector('[data-soma-status]');
  const somaReceipt = root.querySelector('[data-soma-receipt]');
  const somaPreviewButton = root.querySelector('[data-soma-preview]');
  const somaResetButton = root.querySelector('[data-soma-reset]');
  const somaBaseExample = somaBaseArea.value;
  const somaTargetExample = somaTargetArea.value;
  somaResetButton.addEventListener('click', () => {
    somaController?.abort();
    somaBaseArea.value = somaBaseExample;
    somaTargetArea.value = somaTargetExample;
    somaReceipt.textContent = 'Example restored. No MorphPlan charged.';
    somaStatus.textContent = 'Ready for a new preview.';
  });
  somaPreviewButton.addEventListener('click', async () => {
    if (pending) { somaStatus.textContent = 'Finish or Feather the active Wyrdrune execution first.'; return; }
    somaController?.abort();
    const controller = new AbortController();
    somaController = controller;
    somaPreviewButton.disabled = true;
    somaStatus.textContent = 'Charging and verifying the proposed form…';
    try {
      const base = JSON.parse(somaBaseArea.value);
      const target = JSON.parse(somaTargetArea.value);
      const result = await previewSomaNovaMorphogenesis({ base, target, signal: controller.signal });
      if (controller.signal.aborted) throw new DOMException('Feather stopped the preview.', 'AbortError');
      somaReceipt.textContent = JSON.stringify({
        plan: result.plan,
        compatibility: result.report,
        preview: result.preview,
        persistence: result.persistence,
        dispatch: result.dispatch,
        external_effects: result.external_effects,
      }, null, 2);
      somaStatus.textContent = 'MorphPlan verified · ' + result.report.status + ' · preview only · no state committed.';
    } catch (error) {
      somaReceipt.textContent = String(error?.message || error);
      somaStatus.textContent = error?.name === 'AbortError' ? 'Feather stopped the staged preview.' : 'Morphogenesis preview refused.';
    } finally {
      if (somaController === controller) {
        somaController = null;
        somaPreviewButton.disabled = false;
      }
    }
  });

  const storyInput=root.querySelector('#wg-fiction-text');
  const storyWorld=root.querySelector('#wg-fiction-world');
  const storyPreview=root.querySelector('[data-fiction-preview]');
  root.querySelector('[data-fiction-compose]').addEventListener('click',()=>{
    try {
      if(pending)throw new Error('Feather or finish the active execution first.');
      const compiled=fictionToWtl(storyInput.value,{world:storyWorld.value,compile:languageCompiler});
      acceptTranslatedSource(compiled.wtl,'Authored fiction composed into canonical carried WTL.');
      stagedFiction=compiled;
      storyPreview.textContent=JSON.stringify({
        schema:compiled.fiction.schema,fiction_source_hash:compiled.fiction.source_hash,
        crossings:compiled.fiction.nodes.length,
        proposals:compiled.fiction.nodes.filter(node=>node.effect_status==='proposal-only'),
        status:'compiled-not-executed',external_effects:[]
      },null,2);
      status.textContent='Fiction composed. Inspect WTL and explicitly choose Run Wyrdrune.';
    }catch(error){storyPreview.textContent='Fiction refused: '+String(error?.message||error);}
  });
  try {
    const received=globalThis.sessionStorage?.getItem('wayglass:fiction-handoff/v1');
    if(received&&received.length<=12000){storyInput.value=received;
      globalThis.sessionStorage?.removeItem('wayglass:fiction-handoff/v1');
      storyPreview.textContent='Draft received from Writing Room. Review and choose Compose.';}
  }catch{/* Session handoff is optional; never erase the draft. */}
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
    invalidateLanguage();
    irView.textContent = 'Programme loaded. Compile to inspect its typed IR.';
    outputView.textContent = 'No execution for this source revision.';
    hashView.textContent = 'Source not compiled';
    stateView.textContent = 'Loaded';
    status.textContent = selected.label + ' loaded into the native editor.';
  }

  async function run(mode) {
    if (pending || proposalOnly) return;
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
      if(mode==='execute'&&stagedFiction&&editor.value===stagedFiction.wtl&&receipt.execution?.status==='committed'){
        const verified=verifyFictionExecution(stagedFiction,receipt.execution);
        receipt={...receipt,fiction:verified};
        for(const event of verified.events){
          if(event.effect_status!=='text-committed')continue;
          publishWatercolorActivity({kind:'fiction:authored',actor:'wayglass:fiction-author',
            receipt:{schema:verified.schema,receipt_id:verified.wtl_source_hash+':'+event.index},
            intensity:0.42});
        }
        globalThis.dispatchEvent(new CustomEvent('wayglass:fiction:committed',{detail:verified}));
        storyPreview.textContent=JSON.stringify(verified,null,2);
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
        outputView.textContent = JSON.stringify({ execution: receipt.execution, fiction:receipt.fiction, semantic: receipt.semantic, persistence: receipt.persistence }, null, 2);
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
      compileButton.disabled = proposalOnly;
      runButton.disabled = proposalOnly;
      loadButton.disabled = false;
      saveButton.disabled = false;
    }
  }

  const onFeather = () => {
    if (activeController) activeController.abort();
    if (somaController) somaController.abort();
    somaStatus.textContent = 'Feather stopped staged Soma Nova work.';
  };
  globalThis.addEventListener('wayglass:os:feather', onFeather);
  editor.addEventListener('input', () => { updateCount(); invalidateLanguage(); });
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
    invalidateLanguage();
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
    somaController?.abort();
    for (const button of [compileButton, runButton, loadButton]) button.disabled = true;
    if (dialog.open) dialog.close();
    if (saveDialog.open) saveDialog.close();
  };
}
