/* DEEP Observer Dual Time Overlay v0.1 */
'use strict';

(() => {
  const TA_OFFSET_HOURS = 18;
  const TA_RULE_LABEL = 'Terra Aeterna Observatory rule: Waking World +18:00';

  const pad = value => String(value).padStart(2, '0');

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
    if (hour === '24') hour = '00';
    return {
      hour: Number(hour),
      minute: Number(parts.find(p => p.type === 'minute')?.value || 0),
      second: Number(parts.find(p => p.type === 'second')?.value || 0),
      zone: parts.find(p => p.type === 'timeZoneName')?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
      display: `${hour}:${parts.find(p => p.type === 'minute')?.value || '00'}:${parts.find(p => p.type === 'second')?.value || '00'}`
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
    const panel = document.querySelector('.panel');
    const glyphId = document.getElementById('glyphId');
    if (!panel || !glyphId) return;

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

    const wakingValue = document.getElementById('wakingTimeValue');
    const wakingNote = document.getElementById('wakingTimeNote');
    const wakingCycle = document.getElementById('wakingTimeCycle');
    const terraValue = document.getElementById('terraTimeValue');
    const terraCycle = document.getElementById('terraTimeCycle');

    if (wakingValue) wakingValue.textContent = user.display;
    if (wakingNote) wakingNote.textContent = `${user.zone} · user browser local time`;
    if (wakingCycle) wakingCycle.textContent = cycleFor(user.hour);
    if (terraValue) terraValue.textContent = terra.display;
    if (terraCycle) terraCycle.textContent = cycleFor(terra.hour);

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
    const isTime = title.textContent.trim().toLowerCase() === 'time';
    if (!isTime) return;
    const dual = window.STARWELL_DUAL_TIME;
    if (!dual) return;

    path.textContent = 'Time → split pulse → Waking World clock + Terra Aeterna realm clock';
    text.textContent = `Time is a direct reading with two visible contexts. Waking World time is read from the user’s browser (${dual.waking.zone}). Terra Aeterna local time is derived by the Observatory rule (${TA_RULE_LABEL}). The Waking World clock timestamps the observation; the Terra Aeterna clock places it inside the realm cycle.`;

    const source = document.getElementById('directSource');
    const affects = document.getElementById('directAffects');
    const boundary = document.getElementById('directBoundary');
    const tiny = document.getElementById('directTiny');
    if (source) source.innerHTML = '<b>Source:</b> Waking World browser time + derived Terra Aeterna realm rule';
    if (affects) affects.innerHTML = '<b>Affects:</b> observation timestamp, Waking World clock, Terra Aeterna clock, realm cycle, ambient phase';
    if (boundary) boundary.innerHTML = '<b>Boundary:</b> Waking World time is directly read; Terra Aeterna time is derived by a visible rule, not secretly detected.';
    if (tiny) tiny.innerHTML = '<b>Label:</b> one reading, two clocks.';
  }

  function pulseDualTime() {
    document.body.classList.remove('dual-time-pulse-on');
    void document.body.offsetWidth;
    document.body.classList.add('dual-time-pulse-on');
    window.setTimeout(() => document.body.classList.remove('dual-time-pulse-on'), 2700);
  }

  document.addEventListener('click', event => {
    const reading = event.target.closest?.('[data-reading="time"]');
    const meter = event.target.closest?.('[data-meter="time"]');
    if (reading || meter) {
      updateDualTime();
      window.setTimeout(() => {
        patchTimeReadingCopy();
        pulseDualTime();
      }, 20);
    }
  });

  const observer = new MutationObserver(() => patchTimeReadingCopy());
  document.addEventListener('DOMContentLoaded', () => {
    updateDualTime();
    window.setInterval(updateDualTime, 1000);
    const card = document.getElementById('directCard');
    if (card) observer.observe(card, { childList: true, subtree: true, characterData: true });
  });
})();
