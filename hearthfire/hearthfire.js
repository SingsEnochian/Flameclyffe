const shell = document.querySelector('.hf-shell');
const motionToggle = document.querySelector('#hf-motion-toggle');
const clock = document.querySelector('#hf-clock');

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
}

function setMotion(mode) {
  shell.dataset.motion = mode;
  motionToggle.textContent = mode === 'calm' ? 'Wake motion' : 'Calm motion';
  motionToggle.setAttribute('aria-pressed', String(mode === 'calm'));
  if (window.hearthfireVisualState) {
    window.hearthfireVisualState.motion_allowed = mode !== 'calm';
  }
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setMotion(prefersReduced ? 'calm' : 'awake');
updateClock();
setInterval(updateClock, 1000);

motionToggle.addEventListener('click', () => {
  setMotion(shell.dataset.motion === 'calm' ? 'awake' : 'calm');
});

window.hearthfireVisualState = {
  surface_id: 'hearthfire-landing',
  effect_id: 'central-orbit-and-signal-jewels',
  truth_kind: 'authorization_gate',
  state_source: 'docs/hearthfire/README.md',
  supporting_sources: [
    'contracts/hearthfire_contract_v0_3.json',
    'docs/hearthfire/04-surface-census-pass-01.md',
    'PROJECT_MAP.md'
  ],
  state_value: 'targeted_pilot_allowed',
  confidence: 'observed',
  motion_allowed: shell.dataset.motion !== 'calm',
  sound_allowed: false,
  haptics_allowed: false,
  reduced_motion_fallback: 'static halo and still signal jewels',
  low_stim_fallback: 'calm motion mode',
  glow_receipt: {
    plain_language_reading: 'This page reads the Hearthfire governance gate and pilot-surface status.',
    plain_language_reason: 'The ember glows to show the read-only governance pilot is active, not that general rebuild is approved.',
    last_checked: new Date().toISOString()
  }
};
