/* A Wayglass-owned listbox: the browser never paints a native light <option> popup. */
export function normaliseRouteOptions(routes = []) {
  return (Array.isArray(routes) ? routes : []).filter(route => route && typeof route.route_id === 'string')
    .map(route => ({
      value: route.route_id,
      label: String(route.label || route.route_id),
      detail: String(route.model || route.provider || ''),
      disabled: route.configured === false,
      hint: route.configured === false ? String(route.unavailable_reason || 'Credentials missing') : 'Available route',
    }));
}

export function nextEnabledIndex(options, from, direction = 1) {
  if (!options.length || !options.some(option => !option.disabled)) return -1;
  for (let step = 1; step <= options.length; step++) {
    const index = (from + direction * step + options.length * 2) % options.length;
    if (!options[index].disabled) return index;
  }
  return -1;
}

export function mountWayglassRoutePicker(host, { onChange = () => {} } = {}) {
  if (!host) throw new Error('Wayglass route picker host is required.');
  const doc = host.ownerDocument;
  const id = 'wg-route-list-' + Math.random().toString(36).slice(2, 9);
  host.classList.add('wg-route-picker');
  host.innerHTML = '<button type="button" class="wg-route-trigger" aria-label="Wayglass route" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '" aria-keyshortcuts="Alt+R"><span class="wg-route-current">Choose a route</span><span class="wg-route-chevron" aria-hidden="true">⌄</span></button><div id="' + id + '" class="wg-route-menu" role="listbox" aria-label="Available Wayglass routes" hidden></div>';
  const trigger = host.querySelector('.wg-route-trigger');
  const menu = host.querySelector('.wg-route-menu');
  const current = host.querySelector('.wg-route-current');
  let options = [];
  let value = '';
  let activeIndex = -1;
  let open = false;
  let disposed = false;
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function focusActive() {
    const node = menu.querySelector('[data-index="' + activeIndex + '"]');
    node?.focus();
  }
  function close({ restoreFocus = false } = {}) {
    if (!open) return;
    open = false;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    host.classList.remove('is-open');
    if (restoreFocus) trigger.focus();
  }
  function show(focus = false) {
    if (disposed || open || !options.length) return;
    open = true;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    host.classList.add('is-open');
    const chosen = options.findIndex(option => option.value === value && !option.disabled);
    activeIndex = chosen !== -1 ? chosen : nextEnabledIndex(options, -1);
    if (focus) focusActive();
  }
  function render() {
    const selected = options.find(option => option.value === value);
    current.textContent = selected?.label || 'No route selected';
    trigger.disabled = !options.some(option => !option.disabled);
    menu.innerHTML = options.length ? options.map((option, index) =>
      '<div id="' + id + '-option-' + index + '" role="option" tabindex="' + (option.disabled ? '-1' : '0') + '" data-index="' + index + '" aria-selected="' + (option.value === value) + '" aria-disabled="' + option.disabled + '" class="wg-route-option' + (option.value === value ? ' selected' : '') + (option.disabled ? ' disabled' : '') + '">' +
      '<span class="wg-route-symbol" aria-hidden="true">◇</span><span class="wg-route-option-copy"><strong>' + esc(option.label) + '</strong><small>' + esc(option.disabled ? option.hint : option.detail || option.hint) + '</small></span>' +
      (option.value === value ? '<span class="wg-route-check" aria-hidden="true">✓</span>' : '') + '</div>'
    ).join('') : '<p class="tiny wg-route-unavailable">No routes available</p>';
  }
  function choose(index) {
    const option = options[index];
    if (!option || option.disabled) return;
    const changed = value !== option.value;
    value = option.value;
    render();
    close({ restoreFocus: true });
    if (changed) onChange(value);
  }
  function onTriggerKey(event) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      show(true);
      if (event.key === 'End') {
        activeIndex = nextEnabledIndex(options, 0, -1);
        focusActive();
      }
    } else if (event.key === 'Escape') close();
  }
  function onMenuKey(event) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') activeIndex = nextEnabledIndex(options, -1);
      else if (event.key === 'End') activeIndex = nextEnabledIndex(options, 0, -1);
      else activeIndex = nextEnabledIndex(options, activeIndex, event.key === 'ArrowDown' ? 1 : -1);
      focusActive();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(Number(doc.activeElement?.dataset?.index ?? activeIndex));
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      close({ restoreFocus: event.key === 'Escape' });
      if (event.key === 'Escape') event.preventDefault();
    }
  }
  function onOutsidePointer(event) {
    if (!host.contains(event.target)) close();
  }
  trigger.addEventListener('click', () => open ? close() : show(false));
  trigger.addEventListener('keydown', onTriggerKey);
  menu.addEventListener('keydown', onMenuKey);
  menu.addEventListener('click', event => {
    const option = event.target.closest('[data-index]');
    if (option) choose(Number(option.dataset.index));
  });
  menu.addEventListener('focusin', event => {
    const index = Number(event.target.closest('[data-index]')?.dataset.index);
    if (Number.isInteger(index)) activeIndex = index;
  });
  doc.addEventListener('pointerdown', onOutsidePointer);
  return Object.freeze({
    get value() { return value; },
    setRoutes(routes, preferred = value) {
      options = normaliseRouteOptions(routes);
      value = options.some(option => option.value === preferred && !option.disabled)
        ? preferred : (options.find(option => !option.disabled)?.value || '');
      close();
      render();
      return value;
    },
    focus() { trigger.focus(); },
    destroy() { disposed = true; close(); doc.removeEventListener('pointerdown', onOutsidePointer); host.replaceChildren(); },
  });
}
