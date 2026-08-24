function field(label, control) {
  const wrapper = document.createElement('label');
  wrapper.append(document.createTextNode(label));
  wrapper.append(control);
  return wrapper;
}

function textInput(name, placeholder = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.qualiaFacet = name;
  input.placeholder = placeholder;
  return input;
}

function numberInput(name, minimum, maximum, step, placeholder = '') {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(minimum);
  input.max = String(maximum);
  input.step = String(step);
  input.dataset.qualiaFacet = name;
  input.placeholder = placeholder;
  return input;
}

function enhanceFieldQualia(form) {
  if (!form || form.dataset.qualiaReportEditor === 'v1') return;
  const legacy = form.querySelector('[name="qualia"]');
  if (!legacy) return;

  const editor = document.createElement('section');
  editor.className = 'stack qualia-report-editor';
  editor.dataset.qualiaReportEditor = 'v1';

  const heading = document.createElement('div');
  heading.innerHTML = '<h3>Firsthand Qualia · Q</h3><p class="muted">Q records whether a firsthand report exists. It is not a magnitude and software may not infer it. Describe what the state is like from within.</p>';

  const report = document.createElement('textarea');
  report.rows = 5;
  report.maxLength = 4000;
  report.required = true;
  report.dataset.qualiaFacet = 'text';
  report.placeholder = 'What is this state like from within — sensory texture, feeling, attention, embodiment, temporality, relation?';

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Optional Qualia descriptors';
  const facets = document.createElement('div');
  facets.className = 'stack';
  facets.append(
    field('Texture', textInput('texture', 'e.g. diffuse, bright-edged, heavy, spacious')),
    field('Bodily', textInput('bodily', 'e.g. still, buzzing, warm, distant')),
    field('Affective', textInput('affective', 'felt tone, if useful')),
    field('Cognitive', textInput('cognitive', 'attention/thought quality, if useful')),
    field('Temporal', textInput('temporal', 'how time seems from within, if salient')),
    field('Relational', textInput('relational', 'felt relation to world/others, if salient')),
    field('Intensity · optional descriptor (0–1)', numberInput('intensity', 0, 1, 0.01)),
    field('Valence · optional descriptor (−1 to 1)', numberInput('valence', -1, 1, 0.01)),
  );
  details.append(summary, facets);

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.name = 'qualia';
  hidden.dataset.qualiaPayload = 'v1';

  editor.append(heading, field('What is it like?', report), details, hidden);
  const legacyLabel = legacy.closest('label');
  if (legacyLabel) legacyLabel.replaceWith(editor);
  else legacy.replaceWith(editor);
  form.dataset.qualiaReportEditor = 'v1';
}

function serialiseQualia(form) {
  const payload = form.querySelector('[data-qualia-payload="v1"]');
  if (!payload) return;
  const report = {};
  for (const control of form.querySelectorAll('[data-qualia-facet]')) {
    const key = control.dataset.qualiaFacet;
    const raw = String(control.value ?? '').trim();
    if (!raw) continue;
    report[key] = ['intensity', 'valence'].includes(key) ? Number(raw) : raw;
  }
  payload.value = JSON.stringify(report);
}

function enhanceQualiaReadout(root) {
  for (const row of root.querySelectorAll?.('.deep-spine-row') || []) {
    const axis = row.querySelector('.deep-letter')?.textContent?.trim();
    if (axis !== 'Q') continue;
    const status = row.querySelector('.deep-formula')?.textContent?.trim();
    const value = row.querySelector('.deep-spine-val');
    if (!value) continue;
    if (status === 'firsthand-reported') value.textContent = 'reported';
    else if (status === 'legacy-scalar-unresolved') value.textContent = 'legacy · unresolved';
    else if (status === 'unreported') value.textContent = 'unreported';
  }
}

function enhanceHeartfield(root) {
  const scalar = root.querySelector?.('[data-heartfield-qualia]');
  if (scalar && scalar.dataset.qualiaScalarRetired !== 'v1') {
    scalar.value = '';
    scalar.dataset.qualiaScalarRetired = 'v1';
    const label = scalar.closest('label');
    if (label) label.hidden = true;
  }
  const text = root.querySelector?.('[data-heartfield-qualia-text]');
  if (text && text.dataset.qualiaReportEditor !== 'v1') {
    text.dataset.qualiaReportEditor = 'v1';
    text.placeholder = 'Optional firsthand report: what is the Heartfield session like from within?';
    const label = text.closest('label');
    if (label) {
      const first = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (first) first.textContent = 'Firsthand Qualia report · optional';
    }
  }
}

function enhance(root = document) {
  for (const form of root.querySelectorAll?.('#field-feedback-form') || []) enhanceFieldQualia(form);
  enhanceQualiaReadout(root);
  enhanceHeartfield(root);
}

document.addEventListener('submit', (event) => {
  if (event.target?.id === 'field-feedback-form') serialiseQualia(event.target);
}, true);

const target = document.querySelector('#app') || document.body || document.documentElement;
if (target) {
  enhance(target);
  new MutationObserver(() => enhance(target)).observe(target, { childList: true, subtree: true });
}
