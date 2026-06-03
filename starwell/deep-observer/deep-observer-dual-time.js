/* DEEP Observer Dual Time Overlay v0.2 */
'use strict';

(() => {
  const TA_OFFSET_HOURS = 18;
  const TA_RULE_LABEL = 'Terra Aeterna Observatory rule: Waking World +18:00';

  const pad = value => String(value).padStart(2, '0');

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function setHTML(el, value) {
    if (el && el.innerHTML !== value) el.innerHTML = value;
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
    if (document.getElementById('dualTimeStrip')) return;
    const glyphId = document.getElementById('glyphId');
    if (!glyphId) return;

    const wrap = document.createElement('div');
    wrap.id = 'dualTimeStrip';
    wrap.className = 'dual-time-strip';
    wrap.innerHTML = `
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
    `;
    const rule = document.createElement('p');
    rule.id = 'dualTimeRule';
    rule.className = 'dual-time-rule';
    rule.textContent = TA_RULE_LABEL;

    glyphId.insertAdjacentElement('afterend', wrap);
    wrap.insertAdjacentElement('afterend', rule);
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

    setText(path, 'Time → split pulse → Waking World clock + Terra Aeterna realm clock');
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

  function handleTimeSelection() {
    updateDualTime();
    window.requestAnimationFrame(() => {
      patchTimeReadingCopy();
      pulseDualTime();
    });
  }

  document.addEventListener('click', event => {
    const reading = event.target.closest?.('[data-reading="time"]');
    const meter = event.target.closest?.('[data-meter="time"]');
    if (reading || meter) handleTimeSelection();
  }, { passive: true });

  document.addEventListener('keydown', event => {
    const active = document.activeElement;
    if ((event.key === 'Enter' || event.key === ' ') && active?.matches?.('[data-reading="time"], [data-meter="time"]')) {
      handleTimeSelection();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateDualTime();
    window.setInterval(updateDualTime, 1000);
  });
})();
