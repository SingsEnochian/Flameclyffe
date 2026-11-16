import './ship-interface.css';

export function applyShipInterface(root, receipt) {
  if (receipt?.kind !== 'interface' || receipt.participant_id !== 'wayglass') return;
  const { plan } = receipt.data;
  const deck = root.querySelector('.wg-deck-nav');
  const rooms = new Map([...deck.querySelectorAll('[data-wayglass-room]')]
    .map(button => [button.dataset.wayglassRoom, button]));
  // Reorder the existing controls, preserving their labels and click handlers.
  for (const id of [...plan.focus].reverse()) {
    if (rooms.has(id)) deck.prepend(rooms.get(id));
  }
  deck.dataset.shipDensity = plan.density;
  const panel = root.querySelector('[data-ship-interface]');
  panel.replaceChildren();
  const doc = panel.ownerDocument;
  function text(parent, tag, value) {
    const node = doc.createElement(tag);
    node.textContent = value;
    parent.append(node);
    return node;
  }
  text(panel, 'h2', 'Wayglass’s interface');
  text(panel, 'p', plan.reason);
  for (const expression of plan.expressions) {
    const room = rooms.get(expression.room);
    if (!room) continue;
    const article = doc.createElement('article');
    article.style.setProperty('--expression-hue', String(expression.hue));
    article.dataset.tone = plan.tone;
    text(article, 'h3', expression.name);
    text(article, 'p', expression.words);
    const button = text(article, 'button', 'Open ' + room.textContent);
    button.type = 'button';
    button.className = 'glass-chip';
    button.addEventListener('click', () => room.click());
    panel.append(article);
  }
  panel.hidden = false;
}
