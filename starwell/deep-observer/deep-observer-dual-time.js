/* DEEP Observer Dual Time Hologram v0.5 */
'use strict';

(() => {
  const TA_OFFSET_HOURS = 18;
  const TA_RULE_LABEL = 'Terra Aeterna Observatory rule: Waking World +18:00';
  const POSITION_KEY = 'deep_observer_dual_time_position_v1';
  const PIN_KEY = 'deep_observer_dual_time_pinned_v1';
  const MIN_KEY = 'deep_observer_dual_time_minimised_v1';
  const TIME_SELECTOR = '[data-reading="time"], [data-meter="time"]';

  const state = {
    dragging: false,
    moved: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    pinned: false,
    minimised: false,
    lastTimeTrigger: 0
  };

  const pad = value => String(value).padStart(2, '0');

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function setHTML(el, value) {
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }

  function loadState() {
    try { state.pinned = localStorage.getItem(PIN_KEY) === '1'; } catch (e) {}
    try { state.minimised = localStorage.getItem(MIN_KEY) === '1'; } catch (e) {}
  }

  function savePosition(x, y) {
    try { localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y })); } catch (e) {}
  }

  function loadPosition() {
    try { return JSON.parse(localStorage.getItem(POSITION_KEY) || 'null'); } catch (e) { return null; }
  }

  function savePanelState() {
    try { localStorage.setItem(PIN_KEY, state.pinned ? '1' : '0'); } catch (e) {}
    try { localStorage.setItem(MIN_KEY, state.minimised ? '1' : '0'); } catch (e) {}
  }

  function panelSize(panel) {
    const rect = panel.getBoundingClientRect();
    return { width: rect.width || 340, height: rect.height || 160 };
  }

  function clampPanelPosition(x, y, panel) {
    if (window.DEEP_OBSERVER_HUD?.clampElement) return window.DEEP_OBSERVER_HUD.clampElement(panel, x, y, 10);
    const size = panelSize(panel);
    const minX = 10;
    const minY = 10;
    return {
      x: Math.max(minX, Math.min(window.innerWidth - size.width - 10, Number(x) || minX)),
      y: Math.max(minY, Math.min(window.innerHeight - size.height - 10, Number(y) || minY))
    };
  }

  function defaultPanelPosition(panel) {
    const size = panelSize(panel);
    if (window.DEEP_OBSERVER_HUD?.defaultPanelPosition) return window.DEEP_OBSERVER_HUD.defaultPanelPosition(size.width, size.height, 'right');
    return clampPanelPosition(window.innerWidth - size.width - 16, 84, panel);
  }

  function setPanelPosition(x, y, persist = true) {
    const panel = document.getElementById('dualTimeHologram');
    if (!panel) return;
    const p = clampPanelPosition(x, y, panel);
    panel.style.left = `${p.x}px`;
    panel.style.top = `${p.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    if (persist) savePosition(p.x, p.y);
  }

  function snapPanel(persist = true) {
    const panel = document.getElementById('dualTimeHologram');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    let p = null;
    if (window.DEEP_OBSERVER_HUD?.snapElement) p = window.DEEP_OBSERVER_HUD.snapElement(panel, rect.left, rect.top, 10);
    else p = clampPanelPosition(rect.left, rect.top, panel);
    panel.style.left = `${p.x}px`;
    panel.style.top = `${p.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    if (p.zone) panel.dataset.snapZone = p.zone;
    if (persist) savePosition(p.x, p.y);
  }

  function applyInitialPosition() {
    const panel = document.getElementById('dualTimeHologram');
    if (!panel) return;
    const saved = loadPosition();
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPanelPosition(saved.x, saved.y, false);
    else {
      const p = defaultPanelPosition(panel);
      setPanelPosition(p.x, p.y, false);
    }
  }

  function getUserTimeParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(date);
    let hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const second = parts.find(p => p.type === 'second')?.value || '00';
    if (hour === '24') hour = '00';
    return {
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
      zone: parts.find(p => p.type === 'timeZoneName')?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
      display: `${hour}:${minute}:${second}`
    };
  }

  function addHoursClock(parts, hours) {
    const totalSeconds = ((parts.hour + hours) * 3600 + parts.minute * 60 + parts.second) % 86400;
    const safe = totalSeconds < 0 ? totalSeconds + 86400 : totalSeconds;
    const hour = Math.floor(safe / 3600);
    const minute = Math.floor((safe % 3600) / 60);
    const second = safe % 60;
    return { hour, minute, second, display: `${pad(hour)}:${pad(minute)}:${pad(second)}` };
  }

  function cycleFor(hour) {
    if (hour >= 5 && hour < 8) return 'Dawn Watch';
    if (hour >= 8 && hour < 17) return 'Day Lantern';
    if (hour >= 17 && hour < 20) return 'Copper Dusk';
    return 'Night Watch';
  }

  function ensureDualTimeUI() {
    if (document.getElementById('dualTimeHologram')) return;

    const hologram = document.createElement('aside');
    hologram.id = 'dualTimeHologram';
    hologram.className = 'dual-time-hologram floating-hud-panel';
    hologram.setAttribute('aria-live', 'polite');
    hologram.setAttribute('aria-label', 'Live dual-time readout: Waking World and Terra Aeterna');
    hologram.innerHTML = `
      <div class="dual-time-head" id="dualTimeDragHandle">
        <span>Live Dual Time</span>
        <div class="dual-time-actions">
          <button id="dualTimePin" type="button" aria-pressed="false" aria-label="Pin dual-time panel">pin</button>
          <button id="dualTimeMinimise" type="button" aria-label="Minimise dual-time panel">min</button>
        </div>
      </div>
      <div class="dual-time-body">
        <div class="dual-time-strip" id="dualTimeStrip">
          <article class="time-card waking" id="wakingTimeCard">
            <strong>Waking World Time</strong>
            <span class="time-value" id="wakingTimeValue">--:--:--</span>
            <span class="time-note" id="wakingTimeNote">user browser local time</span>
            <span class="time-cycle" id="wakingTimeCycle">local</span>
          </article>
          <article class="time-card terra" id="terraTimeCard">
            <strong>Terra Aeterna Local Time</strong>
            <span class="time-value" id="terraTimeValue">--:--:--</span>
            <span class="time-note">derived realm clock</span>
            <span class="time-cycle" id="terraTimeCycle">realm</span>
          </article>
        </div>
        <p class="dual-time-rule" id="dualTimeRule">${TA_RULE_LABEL}</p>
      </div>
    `;

    document.body.appendChild(hologram);
    bindPanelControls(hologram);
    window.requestAnimationFrame(() => {
      syncPanelState();
      applyInitialPosition();
    });
  }

  function syncPanelState() {
    const panel = document.getElementById('dualTimeHologram');
    const pin = document.getElementById('dualTimePin');
    if (!panel) return;
    panel.classList.toggle('pinned', state.pinned);
    panel.classList.toggle('minimised', state.minimised);
    if (pin) {
      pin.textContent = state.pinned ? 'pinned' : 'pin';
      pin.setAttribute('aria-pressed', String(state.pinned));
    }
    savePanelState();
  }

  function bindPanelControls(panel) {
    document.getElementById('dualTimePin')?.addEventListener('click', event => {
      event.stopPropagation();
      state.pinned = !state.pinned;
      syncPanelState();
    });
    document.getElementById('dualTimeMinimise')?.addEventListener('click', event => {
      event.stopPropagation();
      state.minimised = !state.minimised;
      syncPanelState();
      snapPanel(true);
    });
    bindPanelDrag(panel);
  }

  function bindPanelDrag(panel) {
    let lastX = 0;
    let lastY = 0;

    const isDragTarget = target => target.closest?.('#dualTimeDragHandle') || panel.classList.contains('minimised');

    panel.addEventListener('pointerdown', event => {
      if (!isDragTarget(event.target)) return;
      if (event.target.closest?.('button') && !panel.classList.contains('minimised')) return;
      const rect = panel.getBoundingClientRect();
      state.dragging = true;
      state.moved = false;
      state.dragOffsetX = event.clientX - rect.left;
      state.dragOffsetY = event.clientY - rect.top;
      lastX = event.clientX;
      lastY = event.clientY;
      panel.classList.add('dragging');
      panel.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    panel.addEventListener('pointermove', event => {
      if (!state.dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.hypot(dx, dy) > 2) state.moved = true;
      setPanelPosition(event.clientX - state.dragOffsetX, event.clientY - state.dragOffsetY, true);
      lastX = event.clientX;
      lastY = event.clientY;
    });

    function endDrag(event) {
      if (!state.dragging) return;
      state.dragging = false;
      panel.classList.remove('dragging');
      try { if (event?.pointerId !== undefined) panel.releasePointerCapture?.(event.pointerId); } catch (e) {}
      if (state.moved) snapPanel(true);
    }

    panel.addEventListener('pointerup', event => {
      const wasMoved = state.moved;
      endDrag(event);
      if (!wasMoved && panel.classList.contains('minimised')) {
        state.minimised = false;
        syncPanelState();
        snapPanel(true);
      }
    });
    panel.addEventListener('pointercancel', endDrag);
  }

  function updateDualTime() {
    ensureDualTimeUI();
    const user = getUserTimeParts();
    const terra = addHoursClock(user, TA_OFFSET_HOURS);

    setText(document.getElementById('wakingTimeValue'), user.display);
    setText(document.getElementById('wakingTimeNote'), `${user.zone} · user browser local time`);
    setText(document.getElementById('wakingTimeCycle'), cycleFor(user.hour));
    setText(document.getElementById('terraTimeValue'), terra.display);
    setText(document.getElementById('terraTimeCycle'), cycleFor(terra.hour));

    window.STARWELL_DUAL_TIME = {
      waking: { ...user, cycle: cycleFor(user.hour), source: 'browser local time' },
      terra: { ...terra, cycle: cycleFor(terra.hour), source: TA_RULE_LABEL, offsetHours: TA_OFFSET_HOURS }
    };
  }

  function patchTimeReadingCopy() {
    const path = document.getElementById('directPath');
    const title = document.getElementById('directTitle');
    const text = document.getElementById('directText');
    if (!path || !title || !text) return;
    if (title.textContent.trim().toLowerCase() !== 'time') return;

    updateDualTime();
    const dual = window.STARWELL_DUAL_TIME;
    if (!dual) return;

    setText(path, 'Time → side hologram → Waking World clock + Terra Aeterna realm clock');
    setText(text, `Time is a direct reading with two visible contexts. Waking World time is read from the user’s browser (${dual.waking.zone}). Terra Aeterna local time is derived by the Observatory rule (${TA_RULE_LABEL}). The Waking World clock timestamps the observation; the Terra Aeterna clock places it inside the realm cycle.`);
    setHTML(document.getElementById('directSource'), '<b>Source:</b> Waking World browser time + derived Terra Aeterna realm rule');
    setHTML(document.getElementById('directAffects'), '<b>Affects:</b> observation timestamp, Waking World clock, Terra Aeterna clock, realm cycle, ambient phase');
    setHTML(document.getElementById('directBoundary'), '<b>Boundary:</b> Waking World time is directly read; Terra Aeterna time is derived by a visible rule, not secretly detected.');
    setHTML(document.getElementById('directTiny'), '<b>Label:</b> one reading, two clocks.');
  }

  function pulseDualTime() {
    document.body.classList.remove('dual-time-pulse-on');
    void document.body.offsetWidth;
    document.body.classList.add('dual-time-pulse-on');
    window.setTimeout(() => document.body.classList.remove('dual-time-pulse-on'), 2700);
  }

  function showDualTime() {
    updateDualTime();
    state.minimised = false;
    syncPanelState();
    document.body.classList.add('time-hologram-active');
    window.requestAnimationFrame(() => {
      applyInitialPosition();
      patchTimeReadingCopy();
      pulseDualTime();
    });
  }

  function hideDualTime() {
    if (state.pinned) return;
    document.body.classList.remove('time-hologram-active', 'dual-time-pulse-on');
  }

  function findClosestTarget(start, selector) {
    if (start?.closest) return start.closest(selector);
    return null;
  }

  function findEventTarget(event, selector) {
    const direct = findClosestTarget(event?.target, selector);
    if (direct) return direct;

    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (node?.matches?.(selector)) return node;
      const closest = findClosestTarget(node, selector);
      if (closest) return closest;
    }

    if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
      const underPoint = document.elementFromPoint(event.clientX, event.clientY);
      return findClosestTarget(underPoint, selector);
    }

    return null;
  }

  function isTimeSelectionTarget(target) {
    return Boolean(findClosestTarget(target, TIME_SELECTOR));
  }

  function triggerDualTime(event, reason = 'unknown') {
    if (event?.button !== undefined && event.button !== 0) return false;
    if (!findEventTarget(event, TIME_SELECTOR)) return false;

    const now = performance.now();
    if (now - state.lastTimeTrigger < 260) return true;
    state.lastTimeTrigger = now;

    showDualTime();
    window.dispatchEvent(new CustomEvent('deep-observer:dual-time-trigger', {
      detail: { reason, timestamp: Date.now() }
    }));
    return true;
  }

  function isDismissTarget(target) {
    if (!target) return false;
    if (isTimeSelectionTarget(target)) return false;
    if (target.closest?.('#dualTimeHologram')) return false;
    return Boolean(target.closest?.('[data-reading], [data-meter], [data-filter], .action, #themeBtn, #toyBtn, #stimBtn, canvas, .interface-cloak-toggle'));
  }

  function reclampPanel() {
    const panel = document.getElementById('dualTimeHologram');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    setPanelPosition(rect.left, rect.top, true);
  }

  document.addEventListener('pointerup', event => {
    triggerDualTime(event, 'pointerup');
  }, { capture: true, passive: true });

  document.addEventListener('click', event => {
    if (triggerDualTime(event, 'click')) return;
    if (isDismissTarget(event.target)) hideDualTime();
  }, { passive: true });

  document.addEventListener('keydown', event => {
    const active = document.activeElement;
    if ((event.key === 'Enter' || event.key === ' ') && isTimeSelectionTarget(active)) {
      showDualTime();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && isDismissTarget(active)) hideDualTime();
    if (event.key === 'Escape' && !state.pinned) hideDualTime();
  });

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateDualTime();
    window.setInterval(updateDualTime, 1000);
    window.addEventListener('resize', reclampPanel, { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(reclampPanel, 180), { passive: true });
    window.addEventListener('deep-observer:hud-bounds', reclampPanel, { passive: true });
  });
})();
