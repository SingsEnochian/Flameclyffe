import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_LAT = Number(process.env.DEEP_OBSERVER_LAT || '30.04');
const DEFAULT_LON = Number(process.env.DEEP_OBSERVER_LON || '-81.40');
const DEFAULT_LABEL = process.env.DEEP_OBSERVER_LABEL || 'NE Florida approximate';
const OUT_PATH = 'data/deep-current.json';
const FETCH_TIMEOUT_MS = Number(process.env.DEEP_OBSERVER_FETCH_TIMEOUT_MS || '15000');
const MAX_FALLBACK_AGE_MS = 6 * 60 * 60 * 1000;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const latest = (rows) => Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function jsonWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        const error = new Error(`${res.status} ${res.statusText} for ${url}`);
        error.status = res.status;
        throw error;
      }
      return res.json();
    } catch (err) {
      if (err.status >= 400 && err.status < 500 && err.status !== 429) throw err;
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms for ${url}...`);
      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }
}

async function readPreviousState() {
  try {
    return JSON.parse(await readFile(OUT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function moonInfo(date = new Date()) {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - knownNewMoon) / 86400000;
  const age = ((days % synodic) + synodic) % synodic;
  const illumination = (1 - Math.cos(Math.PI * 2 * age / synodic)) / 2;
  let name = 'New Moon';
  if (age < 1.845) name = 'New Moon';
  else if (age < 5.536) name = 'Waxing Crescent';
  else if (age < 9.228) name = 'First Quarter';
  else if (age < 12.919) name = 'Waxing Gibbous';
  else if (age < 16.611) name = 'Full Moon';
  else if (age < 20.302) name = 'Waning Gibbous';
  else if (age < 23.994) name = 'Last Quarter';
  else if (age < 27.684) name = 'Waning Crescent';
  return { age_days: Number(age.toFixed(2)), illumination: Number((illumination * 100).toFixed(1)), name };
}

function weatherCodeToSky(code, isDay) {
  if ([95, 96, 99].includes(code)) return 'Storm';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if (isDay === 0) return 'Night';
  return 'Day';
}

export function buildState({ weather, kpRows, magRows, plasmaRows }, now = new Date()) {
  const current = weather?.current || {};
  const latestKp = latest(kpRows) || {};
  const mag = latest(magRows) || [];
  const plasma = latest(plasmaRows) || [];
  const bz = Number(mag.bz_gsm ?? mag[3] ?? 0);
  const bt = Number(mag.bt ?? mag[6] ?? mag[2] ?? 0);
  const densityInput = plasma.proton_density ?? plasma[1];
  const density = densityInput == null ? null : Number(densityInput);
  const speed = Number(plasma.proton_speed ?? plasma[2] ?? 0);
  const kp = Number(latestKp.Kp ?? 0);
  const cloud = Number(current.cloud_cover ?? 0);
  const precip = Number(current.precipitation ?? 0);
  const humidity = Number(current.relative_humidity_2m ?? 0);
  const wind = Number(current.wind_speed_10m ?? 0);
  const weatherCode = Number(current.weather_code ?? 0);
  const sky = weatherCodeToSky(weatherCode, Number(current.is_day ?? 0));
  const moon = moonInfo(now);

  const P = clamp(0.48 + (Number(current.pressure_msl ?? 1013) - 1013) / 90 + (Number(current.is_day ?? 0) ? 0.04 : -0.02));
  const C = clamp(0.66 - cloud / 210 - precip / 10 + (kp < 3 ? 0.07 : -0.04));
  const R = clamp(0.32 + wind / 60 + speed / 1200 + Math.abs(bz) / 50);
  const E = clamp(0.24 + precip / 8 + humidity / 260 + kp / 14 + (bz < 0 ? Math.abs(bz) / 40 : 0));
  const M = clamp(moon.illumination / 100);
  const A = clamp(0.42 + (Number(current.is_day ?? 0) ? 0.18 : -0.04) + (100 - cloud) / 260);
  const H = clamp(C * 0.25 + E * 0.20 + R * 0.18 + A * 0.14 + kp / 18 + Math.abs(bz) / 80);
  const T = clamp(P * 0.12 + C * 0.16 + R * 0.12 + (1 - E) * 0.12 + M * 0.08 + A * 0.12 + H * 0.13 + 0.15);

  return {
    version: 'deep-observer-backend-v1',
    generated_at: now.toISOString(),
    source: {
      weather: 'Open-Meteo Forecast API',
      space_weather: 'NOAA SWPC JSON products',
      location_mode: 'approximate static cache; browser sync can override locally'
    },
    location: { lat: DEFAULT_LAT, lon: DEFAULT_LON, label: DEFAULT_LABEL, public_precision: 'coarse' },
    weather: {
      time: current.time || null,
      sky,
      current
    },
    space_weather: {
      kp: { value: kp, time_tag: latestKp.time_tag || null, a_running: latestKp.a_running ?? null },
      solar_wind: { time_tag: mag.time_tag || plasma.time_tag || mag[0] || plasma[0] || null, bz, bt, density, speed }
    },
    moon,
    field: { P, C, R, E, M, A, T, H, dpdt: R },
    observer_note: 'Observed and rendered. Not proof. Backend cache for STARWELL / DEEP Observer.'
  };
}

export async function fetchCurrentInputs() {
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', String(DEFAULT_LAT));
  weatherUrl.searchParams.set('longitude', String(DEFAULT_LON));
  weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m');
  weatherUrl.searchParams.set('temperature_unit', 'fahrenheit');
  weatherUrl.searchParams.set('wind_speed_unit', 'mph');
  weatherUrl.searchParams.set('precipitation_unit', 'inch');
  weatherUrl.searchParams.set('timezone', 'auto');

  const [weather, kpRows, magRows, plasmaRows] = await Promise.all([
    jsonWithRetry(weatherUrl.toString()),
    jsonWithRetry('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),
    jsonWithRetry('https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json'),
    jsonWithRetry('https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json')
  ]);

  return { weather, kpRows, magRows, plasmaRows };
}

export function cacheIsFresh(state, now = Date.now()) {
  const generatedAt = Date.parse(state?.generated_at || '');
  return Number.isFinite(generatedAt) && Number(now) - generatedAt <= MAX_FALLBACK_AGE_MS;
}

export async function main() {
  try {
    const inputs = await fetchCurrentInputs();
    await mkdir('data', { recursive: true });
    await writeFile(OUT_PATH, JSON.stringify(buildState(inputs), null, 2) + '\n');
    console.log(`Wrote ${OUT_PATH}`);
  } catch (err) {
    const previous = await readPreviousState();
    if (!previous || !cacheIsFresh(previous)) {
      throw new Error(`DEEP Observer refresh failed and the fallback cache is older than six hours: ${err.message}`, { cause: err });
    }

    console.warn('DEEP Observer source fetch failed. Keeping previous cache instead of failing workflow.');
    console.warn(err);
    console.log(`${OUT_PATH} remains at ${previous.generated_at || 'unknown generated_at'}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
