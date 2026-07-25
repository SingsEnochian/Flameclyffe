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

  let announced = false;

  function install() {
    const projection = window.MobiusTemporalProjection;
    if (!projection?.profiles) return false;

    if (!projection.profiles[PROFILE.id]) projection.profiles[PROFILE.id] = PROFILE;

    const selects = [...document.querySelectorAll('[data-temporal-profile]')];
    selects.forEach((select) => {
      if (select.querySelector(`option[value="${PROFILE.id}"]`)) return;
      const option = document.createElement('option');
      option.value = PROFILE.id;
      option.textContent = PROFILE.label;
      select.appendChild(option);
    });

    if (!announced) {
      announced = true;
      window.dispatchEvent(new CustomEvent('elara:temporal-2027-ready', {
        detail: {
          profile: PROFILE,
          law: 'f_2027 = f_2025 × 1.15² = f_2025 × 1.3225'
        }
      }));
    }

    return selects.length > 0 && selects.every((select) => select.querySelector(`option[value="${PROFILE.id}"]`));
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (install() || attempts > 400) window.clearInterval(timer);
  }, 50);

  window.ElaraTemporal2027 = {
    version: '0.1.1',
    profile: PROFILE,
    install
  };
})();
