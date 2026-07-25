'use strict';

/*
  Elara 2027 Temporal Adapter v0.1
  Extends the shared Möbius temporal renderer without rewriting canonical 2025.
  2027 is the compounded Second Spiral Return: 1.15 × 1.15 = 1.3225.
*/
(function () {
  const PROFILE = Object.freeze({
    id: 'second-spiral-return-2027',
    label: 'Second Spiral Return 2027 · ×1.3225',
    year: 2027,
    multiplier: 1.3225,
    basis: 'Compounded temporal projection: canonical frequency × 1.15²'
  });

  function install() {
    const projection = window.MobiusTemporalProjection;
    if (!projection?.profiles || projection.profiles[PROFILE.id]) return Boolean(projection?.profiles?.[PROFILE.id]);

    projection.profiles[PROFILE.id] = PROFILE;

    document.querySelectorAll('[data-temporal-profile]').forEach((select) => {
      if (select.querySelector(`option[value="${PROFILE.id}"]`)) return;
      const option = document.createElement('option');
      option.value = PROFILE.id;
      option.textContent = PROFILE.label;
      select.appendChild(option);
    });

    window.dispatchEvent(new CustomEvent('elara:temporal-2027-ready', {
      detail: {
        profile: PROFILE,
        law: 'f_2027 = f_2025 × 1.15² = f_2025 × 1.3225'
      }
    }));
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (install() || attempts > 400) window.clearInterval(timer);
  }, 50);

  window.ElaraTemporal2027 = {
    version: '0.1.0',
    profile: PROFILE,
    install
  };
})();
