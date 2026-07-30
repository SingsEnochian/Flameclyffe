const STORAGE_KEY = 'hearthgate.observer.premaq.v1';
const MESSAGE_TYPE = 'hearthgate.observer.premaq';
const REMOTE_FIELD_PATH = 'https://singsenochian.github.io/Flameclyffe/data/deep-current.json';

const nativeFetch = window.fetch.bind(window);
let latestSnapshot = readSnapshot();

function finite(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min = 0, max = 1) {
  const number = finite(value, min);
  return Math.max(min, Math.min(max, number));
}

function readSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  latestSnapshot = snapshot;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // The bridge still works for the current page through memory and postMessage.
  }
}

function observerField(snapshot) {
  const raw = snapshot?.raw || {};
  const field = snapshot?.field || raw.field || raw.deep || raw.DEEP || raw.state || raw.observer || raw;

  const P = clamp(field.P, 0, 1);
  const C = clamp(field.C, 0, 1);
  const R = clamp(field.R, 0, 1);
  const E = clamp(field.E, 0, 1);
  const M = clamp(field.M, 0, 1);
  const A = clamp(field.A, 0, 1);
  const Q = clamp(field.Q ?? field.charge ?? snapshot?.charge ?? raw.charge, 0, 1);
  const H = clamp(field.H ?? (C * 0.28 + (1 - E) * 0.20 + R * 0.16 + A * 0.14 + Q * 0.07), 0, 1);
  const T = clamp(field.T ?? (P * 0.12 + C * 0.16 + R * 0.12 + (1 - E) * 0.12 + M * 0.08 + A * 0.12 + H * 0.13 + 0.15), 0, 1);

  return { P, C, R, E, M, A, H, T, Q, charge: Q, dpdt: finite(field.dpdt, R) };
}

function toDeepPayload(snapshot) {
  const raw = snapshot?.raw || {};
  const direct = snapshot?.direct || raw.direct || {};
  const field = observerField(snapshot);
  const moonIllumination = finite(
    direct.moonIllum
      ?? direct.moon_illumination
      ?? raw.moonIllum
      ?? raw.moon?.illumination
      ?? raw.moon?.illumination_percent,
    null,
  );
  const kp = finite(direct.kp ?? raw.kp ?? raw.space_weather?.kp?.value, null);
  const bz = finite(direct.bz ?? raw.bz ?? raw.space_weather?.solar_wind?.bz, null);
  const bt = finite(direct.bt ?? raw.bt ?? raw.space_weather?.solar_wind?.bt, null);
  const speed = finite(direct.solarWind ?? direct.speed ?? raw.space_weather?.solar_wind?.speed, null);
  const weather = raw.weather || {};

  return {
    schema: 'hearthgate.deep-current/v1',
    generated_at: snapshot?.generated_at || snapshot?.generatedAt || new Date().toISOString(),
    location: {
      label: snapshot?.location?.label || raw.location?.label || 'Observer shared field',
    },
    field,
    weather: {
      ...weather,
      sky: direct.sky ?? raw.sky ?? weather.sky ?? '',
      current: weather.current || raw.current || {},
    },
    space_weather: {
      ...(raw.space_weather || {}),
      kp: { ...(raw.space_weather?.kp || {}), value: kp },
      solar_wind: {
        ...(raw.space_weather?.solar_wind || {}),
        bz,
        bt,
        speed,
      },
    },
    moon: {
      ...(raw.moon || {}),
      name: direct.moonName ?? raw.moon?.name ?? '',
      illumination: moonIllumination,
      age_days: finite(direct.moonAge ?? raw.moon?.age_days, null),
    },
    provenance: {
      source: 'DEEP Observer shared PREMAQ spine',
      transport: snapshot?.transport || 'same-origin observer bridge',
      schema: snapshot?.schema || 'hearthgate.observer.premaq/v1',
    },
  };
}

function isDeepFieldRequest(input) {
  const value = typeof input === 'string' ? input : input?.url;
  if (!value) return false;
  try {
    const url = new URL(value, window.location.href);
    return url.href === REMOTE_FIELD_PATH || url.pathname.endsWith('/data/deep-current.json');
  } catch {
    return value.includes('deep-current.json');
  }
}

window.fetch = async (input, init) => {
  if (isDeepFieldRequest(input)) {
    const snapshot = latestSnapshot || readSnapshot();
    if (snapshot) {
      return new Response(JSON.stringify(toDeepPayload(snapshot)), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Hearthgate-Source': 'observer-bridge',
        },
      });
    }
  }
  return nativeFetch(input, init);
};

function requestFieldRefresh() {
  window.setTimeout(() => {
    const button = document.querySelector('[data-action="refresh-deep"]');
    if (button && !button.disabled) button.click();
  }, 0);
}

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  const message = event.data;
  if (!message || message.type !== MESSAGE_TYPE) return;
  writeSnapshot(message.payload);
  requestFieldRefresh();
});

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    latestSnapshot = JSON.parse(event.newValue);
    requestFieldRefresh();
  } catch {
    // Ignore malformed external storage writes.
  }
});

window.__arcsweepObserverBridge = Object.freeze({
  schema: 'hearthgate.observer.premaq/v1',
  storageKey: STORAGE_KEY,
  connected: Boolean(latestSnapshot),
});

if (window.parent !== window) {
  window.parent.postMessage({ type: 'hearthgate.arcsweep.ready' }, '*');
}
