const ROOT_CLASS = 'feedback-chamber-v2';
const MOUNTED = 'feedbackChamberV2Mounted';
let scheduled = false;

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findChamberHeading(root = document) {
  return [...root.querySelectorAll('h1,h2')].find((node) => text(node) === 'Relational Feedback Chamber') || null;
}

function chamberRoot(heading) {
  return heading?.closest('main.content, main, [role="main"], .content') || null;
}

function stripSmartQuotes(value = '') {
  return String(value).replace(/^[“”]+|[“”]+$/g, '');
}

function repairSmartQuoteAttributes(root) {
  for (const node of root.querySelectorAll('*')) {
    const className = node.getAttribute('class');
    if (className?.includes('”') || className?.includes('“')) {
      node.setAttribute('class', className.split(/\s+/).map(stripSmartQuotes).filter(Boolean).join(' '));
    }
    const status = node.getAttribute('data-status');
    if (status?.includes('”') || status?.includes('“')) node.setAttribute('data-status', stripSmartQuotes(status));
    for (const name of node.getAttributeNames()) {
      if (!/[“”]$/.test(name) || name === 'class' || name === 'data-status') continue;
      const recovered = stripSmartQuotes(name);
      if (recovered && /^[a-z][a-z0-9_-]*$/i.test(recovered)) node.classList.add(recovered);
      node.removeAttribute(name);
    }
  }
}

function directChildContaining(form, selector) {
  return [...form.children].find((node) => node.matches?.(selector) || node.querySelector?.(selector)) || null;
}

function mark(node, className) {
  if (node) node.classList.add(className);
  return node;
}

function buildActionRail(form) {
  let rail = form.querySelector(':scope > .feedback-chamber-v2__action-rail');
  if (rail) return rail;
  rail = document.createElement('aside');
  rail.className = 'feedback-chamber-v2__action-rail panel';
  rail.setAttribute('aria-label', 'Feedback cycle controls');

  const controls = [
    directChildContaining(form, 'input[name="invokeModels"]'),
    directChildContaining(form, 'textarea[name="response"]'),
    directChildContaining(form, 'input[name="syncLive"]'),
    [...form.children].find((node) => node.matches?.('p.callout') && /House Runtime/i.test(text(node))),
    [...form.children].find((node) => node.matches?.('button[type="submit"]')),
  ].filter(Boolean);
  controls.forEach((node) => rail.appendChild(node));
  form.appendChild(rail);
  return rail;
}

function buildBottom(root, layout) {
  let bottom = root.querySelector(':scope > .feedback-chamber-v2__bottom');
  if (bottom) return bottom;
  const observation = root.querySelector(':scope > .runtime-observation-read');
  const review = root.querySelector(':scope > .feedback-queue');
  if (!observation && !review) return null;
  bottom = document.createElement('section');
  bottom.className = 'feedback-chamber-v2__bottom';
  layout.insertAdjacentElement('afterend', bottom);
  if (observation) bottom.appendChild(observation);
  if (review) bottom.appendChild(review);
  return bottom;
}

function mount() {
  const heading = findChamberHeading();
  const root = chamberRoot(heading);
  if (!root || root.dataset[MOUNTED] === 'true') return false;

  repairSmartQuoteAttributes(root);
  const layout = root.querySelector(':scope > .feedback-layout');
  const form = layout?.querySelector('#feedback-form');
  if (!layout || !form) return false;

  root.dataset[MOUNTED] = 'true';
  root.classList.add(ROOT_CLASS);
  heading.closest('.section-heading')?.classList.add('feedback-chamber-v2__header');
  layout.classList.add('feedback-chamber-v2__layout');

  const formShell = form.closest('article.panel');
  formShell?.classList.add('feedback-chamber-v2__form-shell');
  form.classList.add('feedback-chamber-v2__form');

  mark(form.querySelector(':scope > .feedback-state'), 'feedback-chamber-v2__premaqc');
  mark(directChildContaining(form, 'select[name="mode"]'), 'feedback-chamber-v2__practice');
  mark(directChildContaining(form, 'input[name="voiceIds"]'), 'feedback-chamber-v2__voices');
  mark(directChildContaining(form, 'input[name="canonRefs"]') || [...form.children].find((node) => /Canon context/i.test(text(node))), 'feedback-chamber-v2__canon');
  mark(directChildContaining(form, 'textarea[name="work"]'), 'feedback-chamber-v2__turn');
  mark(form.querySelector(':scope > [data-story-soundscape]'), 'feedback-chamber-v2__sound');

  const ledger = layout.querySelector('.feedback-ledger') || [...layout.children].find((node) => /Receipts & replay/i.test(text(node)));
  if (ledger) {
    ledger.classList.add('feedback-chamber-v2__receipts');
    form.appendChild(ledger);
  }

  buildActionRail(form);
  buildBottom(root, layout);
  return true;
}

function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    mount();
  });
}

scheduleMount();
const observer = new MutationObserver(scheduleMount);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('arcsweep:core-ready', scheduleMount);
window.addEventListener('arcsweep:sidecars-ready', scheduleMount);
