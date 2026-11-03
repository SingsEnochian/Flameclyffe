// Eightfold observer: a visualization of visible Wayglass turns, never a claim of AI consciousness.
const NS = 'http://www.w3.org/2000/svg';
function element(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}
export function observerGeometry(turnCount = 0) {
  const count = Math.max(0, Math.min(64, Math.floor(Number(turnCount) || 0)));
  const points = Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4 - Math.PI / 2;
    const radius = 31 + Math.min(12, count * 1.5);
    return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius];
  });
  return { count, points, connections: Math.min(8, count) };
}
export function installEightfoldObserver({ root = document.querySelector('#app') } = {}) {
  if (!root || typeof document === 'undefined') return null;
  const instrument = document.createElement('aside');
  instrument.className = 'wg-eightfold';
  instrument.setAttribute('aria-label', 'Eightfold observation instrument');
  const label = document.createElement('span');
  label.className = 'wg-eightfold-label';
  const svg = element('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
  instrument.append(svg, label);
  root.before(instrument);
  let lastCount = -1;
  function refresh() {
    const count = root.querySelectorAll('.turn-card').length;
    if (count === lastCount) return;
    lastCount = count;
    const { points, connections } = observerGeometry(count);
    svg.replaceChildren();
    svg.append(element('polygon', { points: points.map(p => p.join(',')).join(' '), class: 'wg-eightfold-ring' }));
    for (let i = 0; i < 8; i++) {
      const [x, y] = points[i];
      svg.append(element('line', { x1: 50, y1: 50, x2: x, y2: y, class: i < connections ? 'wg-eightfold-ray active' : 'wg-eightfold-ray' }));
    }
    svg.append(element('circle', { cx: 50, cy: 50, r: 5, class: 'wg-eightfold-core' }));
    label.textContent = count ? count + ' visible turn' + (count === 1 ? '' : 's') : 'Awaiting visible turns';
  }
  const observer = new MutationObserver(refresh);
  observer.observe(root, { childList: true, subtree: true });
  refresh();
  return Object.freeze({ refresh, destroy() { observer.disconnect(); instrument.remove(); } });
}
