export const SVG_NS = 'http://www.w3.org/2000/svg';

export function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    element.setAttribute(key, String(value));
  });

  return element;
}

export function createPath(d, className) {
  const path = createSvgElement('path', { d });
  if (className) path.classList.add(className);
  return path;
}

export function createCircle(radius, className) {
  const circle = createSvgElement('circle', { r: radius });
  if (className) circle.classList.add(className);
  return circle;
}

export function createText(label, y, className) {
  const text = createSvgElement('text', { y });
  if (className) text.classList.add(className);
  text.textContent = label;
  return text;
}

export function replaceChildrenOf(target, children) {
  target.replaceChildren(...children);
}
