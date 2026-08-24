const LAT = 30.04;
const LON = -81.40;
const LABEL = 'NE Florida approximate';
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const latest = (rows) => Array.isArray(rows) && rows.length ? rows.at(-1) : null;

const response = (statusCode, body) => ({ statusCode, headers: {
  'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store, max-age=0',
}, body: JSON.stringify(body) });

async function readJson(fetchImpl, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const result = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: controller.signal });
    if (!result.ok) throw new Error(`${result.status} from source`);
    return await result.json();
  } finally { clearTimeout(timeout); }
}

export function moonInfo(date = new Date()) {
  const synodic = 29.530588853;
  const age = ((((date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % synodic) + synodic) % synodic;
  const illumination = (1 - Math.cos(Math.PI * 2 * age / synodic)) / 2;
  let name = 'New Moon';
  if (age >= 1.845 && age < 5.536) name = 'Waxing Crescent';
  else if (age < 9.228 && age >= 5.536) name = 'First Quarter';
  else if (age < 12.919 && age >= 9.228) name = 'Waxing Gibbous';
  else if (age < 16.611 && age >= 12.919) name = 'Full Moon';
  else if (age < 20.302 && age >= 16.611) name = 'Waning Gibbous';
  else if (age < 23.994 && age >= 20.302) name = 'Last Quarter';
  else if (age < 27.684 && age >= 23.994) name = 'Waning Crescent';
  return { age_days: Number(age.toFixed(2)), illumination: Number((illumination * 100).toFixed(1)), name };
}

function skyFor(code, isDay) {
  if ([95, 96, 99].includes(code)) return 'Storm';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  return isDay === 0 ? 'Night' : 'Day';
}

export function buildObservation({ weather, kpRows, magRows, plasmaRows }, now = new Date()) {
  const current = weather.current || {};
  const kpRow = latest(kpRows) || {};
  const mag = latest(magRows) || [];
  const plasma = latest(plasmaRows) || [];
  const bz = Number(mag.bz_gsm ?? mag[3] ?? 0), bt = Number(mag.bt ?? mag[6] ?? mag[2] ?? 0);
  const densityValue = plasma.proton_density ?? plasma[1];
  const density = densityValue == null ? null : Number(densityValue);
  const speed = Number(plasma.proton_speed ?? plasma[2] ?? 0), kp = Number(kpRow.Kp ?? 0);
  const cloud = Number(current.cloud_cover ?? 0), precip = Number(current.precipitation ?? 0);
  const humidity = Number(current.relative_humidity_2m ?? 0), wind = Number(current.wind_speed_10m ?? 0);
  const isDay = Number(current.is_day ?? 0), moon = moonInfo(now);
  const P = clamp(.48 + (Number(current.pressure_msl ?? 1013) - 1013) / 90 + (isDay ? .04 : -.02));
  const C = clamp(.66 - cloud / 210 - precip / 10 + (kp < 3 ? .07 : -.04));
  const R = clamp(.32 + wind / 60 + speed / 1200 + Math.abs(bz) / 50);
  const E = clamp(.24 + precip / 8 + humidity / 260 + kp / 14 + (bz < 0 ? Math.abs(bz) / 40 : 0));
  const M = clamp(moon.illumination / 100);
  const A = clamp(.42 + (isDay ? .18 : -.04) + (100 - cloud) / 260);
  return {
    version: 'deep-observer-live-v1', generated_at: now.toISOString(),
    source: { weather: 'Open-Meteo Forecast API', space_weather: 'NOAA SWPC JSON products', transport: 'live Netlify function' },
    location: { lat: LAT, lon: LON, label: LABEL, public_precision: 'coarse' },
    weather: { time: current.time || null, sky: skyFor(Number(current.weather_code ?? 0), isDay), current },
    space_weather: { kp: { value: kp, time_tag: kpRow.time_tag || null, a_running: kpRow.a_running ?? null }, solar_wind: { time_tag: mag.time_tag || plasma.time_tag || mag[0] || plasma[0] || null, bz, bt, density, speed } },
    moon, field: { P, C, R, E, M, A },
    observer_note: 'Live source evidence and source projection. Not an accepted PREMAQC packet.',
  };
}

export function createHandler({ fetchImpl = fetch, now = () => new Date() } = {}) {
  return async function handler(event) {
    if (event.httpMethod === 'OPTIONS') return response(204, {});
    if (event.httpMethod !== 'GET') return response(405, { error: 'GET required.' });
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', String(LAT)); weatherUrl.searchParams.set('longitude', String(LON));
    weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m');
    weatherUrl.searchParams.set('temperature_unit', 'fahrenheit'); weatherUrl.searchParams.set('wind_speed_unit', 'mph');
    weatherUrl.searchParams.set('precipitation_unit', 'inch'); weatherUrl.searchParams.set('timezone', 'auto');
    try {
      const [weather, kpRows, magRows, plasmaRows] = await Promise.all([
        readJson(fetchImpl, weatherUrl), readJson(fetchImpl, 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),
        readJson(fetchImpl, 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json'), readJson(fetchImpl, 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json'),
      ]);
      return response(200, buildObservation({ weather, kpRows, magRows, plasmaRows }, now()));
    } catch (error) { return response(502, { error: 'Live field sources unavailable.', detail: error.message }); }
  };
}

export const handler = createHandler();
