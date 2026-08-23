const ROOT_CLASS = 'feedback-chamber-v2';

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findChamberHeading(root = document) {
  return [...root.querySelectorAll('h1,h2')].find((node) => text(node) === 'Relational Feedback Chamber') || null;
}

function findChamberRoot(heading) {
  return heading?.closest('main, [role="main"], .workspace, .content, #app > *') || heading?.parentElement || null;
}

function annotate(root) {
  if (!root || root.classList.contains(ROOT_CLASS)) return false;
  root.classList.add(ROOT_CLASS);

  const direct = [...root.children].filter((node) => node.nodeType === 1);
  const substantial = direct.filter((node) => !['SCRIPT', 'STYLE'].includes(node.tagName));
  if (substantial.length > 2) {
    const header = substantial[0];
    if (header) header.classList.add('feedback-chamber-v2__header');

    const candidates = substantial.slice(1);
    const layout = document.createElement('div');
    layout.className = 'feedback-chamber-v2__layout';
    root.insertBefore(layout, candidates[0] || null);

    for (const node of candidates) layout.appendChild(node);

    const cards = [...layout.children];
    cards.forEach((node) => node.classList.add('feedback-chamber-v2__card'));

    if (cards.length >= 3) {
      const rail = document.createElement('div');
      rail.className = 'feedback-chamber-v2__rail';
      const railCards = cards.slice(-Math.min(3, Math.max(1, Math.floor(cards.length / 4))));
      layout.appendChild(rail);
      railCards.forEach((node) => rail.appendChild(node));
    }
  }
  return true;
}

function mount() {
  const heading = findChamberHeading();
  if (!heading) return false;
  return annotate(findChamberRoot(heading));
}

if (!mount()) {
  const observer = new MutationObserver(() => {
    if (mount()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
}
