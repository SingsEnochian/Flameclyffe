// Compare our last render, not innerHTML: other sidecars may add child controls.
// Unchanged renders must not erase those controls or trigger observer ping-pong.
const renderedMarkup = new WeakMap();

export function updateCodexChatMarkup(element, markup) {
  if (renderedMarkup.get(element) === markup) return false;
  element.innerHTML = markup;
  renderedMarkup.set(element, markup);
  return true;
}
