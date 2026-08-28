import { wrapHouseSemanticSelection } from './house-chat-rich-text.js';

const LENS_KEY = 'arcsweep.formatted-text-semantic-lens/v1';
const SEMANTICS = Object.freeze([
  ['action', 'Action'],
  ['dialogue', 'Dialogue'],
  ['narration', 'Narration'],
  ['ooc', 'OOC'],
  ['observation', 'Observation'],
  ['hypothesis', 'Hypothesis'],
  ['interpretation', 'Interpretation'],
  ['sourceCitation', 'Citation'],
  ['evidenceClaim', 'Evidence claim'],
  ['worldTerm', 'World term'],
  ['ritualCall', 'Ritual call'],
]);

let installed = false;
let observer = null;
const savedRanges = new WeakMap();

function lensEnabled() {
  try { return localStorage.getItem(LENS_KEY) !== 'off'; } catch { return true; }
}

function setLens(enabled) {
  try { localStorage.setItem(LENS_KEY, enabled ? 'on' : 'off'); } catch {}
  document.documentElement.classList.toggle('ft-semantic-lens-off', !enabled);
  document.querySelectorAll('[data-ft-lens-toggle]').forEach((button) => {
    button.textContent = enabled ? 'Lens: on' : 'Lens: off';
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  });
}

function saveEditorRange(editor) {
  const selection = document.getSelection?.();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (editor.contains(range.commonAncestorContainer)) savedRanges.set(editor, range.cloneRange());
}

function restoreEditorRange(editor) {
  const range = savedRanges.get(editor);
  const selection = document.getSelection?.();
  if (!range || !selection) return false;
  try {
    selection.removeAllRanges(); selection.addRange(range); return true;
  } catch { return false; }
}

function decorateSemanticNodes(root = document) {
  root.querySelectorAll?.('[data-ft-entity]').forEach((node) => {
    if (!node.title) {
      const label = SEMANTICS.find(([type]) => type === node.getAttribute('data-ft-entity'))?.[1];
      if (label) node.title = label;
    }
  });
}

function enhanceComposer(shell) {
  if (!shell || shell.dataset.formattedTextVestments === 'v1') return;
  const toolbar = shell.querySelector('[data-commons-toolbar]');
  const editor = shell.querySelector('[data-commons-native-editor]');
  if (!toolbar || !editor) return;
  shell.dataset.formattedTextVestments = 'v1';

  const select = document.createElement('select');
  select.className = 'quiet mini ft-meaning-select';
  select.dataset.ftMeaning = 'true';
  select.setAttribute('aria-label', 'Mark selected text with semantic meaning');
  select.innerHTML = `<option value="">Meaning…</option>${SEMANTICS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}`;

  const lens = document.createElement('button');
  lens.type = 'button'; lens.className = 'quiet mini'; lens.dataset.ftLensToggle = 'true';

  const capture = () => saveEditorRange(editor);
  editor.addEventListener('keyup', capture);
  editor.addEventListener('mouseup', capture);
  editor.addEventListener('focus', capture);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === editor || editor.contains(document.getSelection?.()?.anchorNode)) capture();
  });

  select.addEventListener('pointerdown', capture);
  select.addEventListener('change', () => {
    const type = select.value;
    select.value = '';
    if (!type) return;
    restoreEditorRange(editor);
    if (wrapHouseSemanticSelection(editor, type)) {
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
      saveEditorRange(editor);
    }
  });
  lens.addEventListener('click', () => setLens(!lensEnabled()));
  toolbar.append(select, lens);
  setLens(lensEnabled());
}

function scan(root = document) {
  root.querySelectorAll?.('[data-commons-native-composer]').forEach(enhanceComposer);
  decorateSemanticNodes(root);
}

function styles() {
  if (document.getElementById('formatted-text-vestments-v1')) return;
  const style = document.createElement('style');
  style.id = 'formatted-text-vestments-v1';
  style.textContent = `
    [data-ft-entity]{transition:background .15s ease,border-color .15s ease,opacity .15s ease}
    [data-ft-entity="action"]{font-style:italic}
    [data-ft-entity="dialogue"]{quotes:"“" "”"}
    [data-ft-entity="dialogue"]:before{content:open-quote}[data-ft-entity="dialogue"]:after{content:close-quote}
    [data-ft-entity="narration"]{letter-spacing:.005em}
    [data-ft-entity="ooc"]{padding:.05rem .22rem;border:1px dashed color-mix(in srgb,var(--muted) 55%,transparent);border-radius:.35rem;background:color-mix(in srgb,var(--muted) 8%,transparent)}
    [data-ft-entity="observation"]{text-decoration:underline;text-decoration-style:solid;text-decoration-thickness:.08em;text-underline-offset:.18em;text-decoration-color:color-mix(in srgb,var(--green) 70%,transparent)}
    [data-ft-entity="hypothesis"]{text-decoration:underline;text-decoration-style:dotted;text-underline-offset:.2em;text-decoration-color:color-mix(in srgb,var(--gold) 85%,transparent)}
    [data-ft-entity="interpretation"]{text-decoration:underline;text-decoration-style:wavy;text-underline-offset:.2em;text-decoration-color:color-mix(in srgb,var(--gold) 50%,var(--green))}
    [data-ft-entity="sourceCitation"]{padding:.02rem .18rem;border-bottom:1px dashed var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent)}
    [data-ft-entity="evidenceClaim"]{box-shadow:inset 0 -.35em color-mix(in srgb,var(--green) 12%,transparent)}
    [data-ft-entity="worldTerm"]{font-variant:small-caps;letter-spacing:.035em}
    [data-ft-entity="ritualCall"]{font-variant:small-caps;letter-spacing:.06em}
    .ft-meaning-select{max-width:9.5rem}
    .ft-semantic-lens-off [data-ft-entity]{background:none!important;border-color:transparent!important;box-shadow:none!important;text-decoration:none!important;font-variant:inherit!important;letter-spacing:inherit!important}
    .ft-semantic-lens-off [data-ft-entity="action"]{font-style:inherit}
    .ft-semantic-lens-off [data-ft-entity="dialogue"]:before,.ft-semantic-lens-off [data-ft-entity="dialogue"]:after{content:none}
    @media(prefers-reduced-motion:reduce){[data-ft-entity]{transition:none}}
  `;
  document.head.append(style);
}

export function installFormattedTextVestments() {
  if (installed || typeof document === 'undefined') return;
  installed = true; styles(); setLens(lensEnabled()); scan();
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) for (const node of mutation.addedNodes) if (node?.nodeType === 1) scan(node.matches?.('[data-commons-native-composer],[data-ft-entity]') ? node.parentElement || node : node);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

installFormattedTextVestments();
