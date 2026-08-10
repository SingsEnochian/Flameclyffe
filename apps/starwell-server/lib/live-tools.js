'use strict';

// Live data tool implementations for Hearthfire agent recipes.
// Each export matches a tool ID in tool-capabilities.registry.yaml.

async function fetchJson(url, { timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'HearthfireAgent/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, { timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'HearthfireAgent/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function noaaSolarWind() {
  const data = await fetchJson('https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json');
  const rows = Array.isArray(data) ? data : [];
  const latest = rows[rows.length - 1] || {};
  return {
    source: 'NOAA DSCOVR',
    epistemicStatus: 'established-science',
    timestamp: latest.time_tag,
    bz_gsm: latest.bz_gsm,
    bt: latest.bt,
    speed: latest.speed,
    density: latest.density,
    recent: rows.slice(-5).map(r => ({ time_tag: r.time_tag, bz_gsm: r.bz_gsm, bt: r.bt })),
  };
}

async function noaaKp() {
  const data = await fetchJson('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
  const rows = Array.isArray(data) ? data.slice(1) : [];
  const latest = rows[rows.length - 1] || [];
  const kp = parseFloat(latest[1] ?? 0);
  return {
    source: 'NOAA',
    epistemicStatus: 'established-science',
    timestamp: latest[0],
    kp,
    status: kp >= 5 ? 'storm' : kp >= 4 ? 'active' : 'quiet',
    recent: rows.slice(-8).map(r => ({ time: r[0], kp: parseFloat(r[1]) })),
  };
}

async function noaaSunspots() {
  const data = await fetchJson('https://services.swpc.noaa.gov/json/sunspot_report.json');
  return { source: 'NOAA', epistemicStatus: 'established-science', data };
}

async function usgsSeismic() {
  const data = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson');
  const events = (data?.features || []).map(f => ({
    id: f.id,
    magnitude: f.properties?.mag,
    place: f.properties?.place,
    time: new Date(f.properties?.time || 0).toISOString(),
    depth_km: f.geometry?.coordinates?.[2],
  }));
  return { source: 'USGS', epistemicStatus: 'established-science', count: events.length, events: events.slice(0, 20) };
}

async function gwoscCatalog() {
  const data = await fetchJson('https://gwosc.org/eventapi/json/GWTC/');
  const events = Object.entries(data?.events || {}).map(([name, ev]) => ({
    name,
    commonName: ev['commonName'],
    GPS: ev.GPS,
    catalog: ev['catalog.shortName'],
  }));
  return { source: 'GWOSC/GWTC', epistemicStatus: 'established-science', count: events.length, recent: events.slice(-10) };
}

// Meeus (1998) lunar ephemeris — computed locally, no network call.
function meeusLunar(isoDate) {
  const date = isoDate ? new Date(isoDate) : new Date();
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  const dr = Math.PI / 180;
  const D = ((297.85036 + 445267.111480 * T - 0.0019142 * T * T) % 360 + 360) % 360;
  const elongation = D;
  const illumination = (1 - Math.cos(elongation * dr)) / 2;
  const waxing = elongation < 180;
  const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  const phaseIndex = Math.round(elongation / 45) % 8;
  return {
    source: 'Meeus (1998) computed',
    epistemicStatus: 'established-science',
    date: date.toISOString(),
    julianDay: Math.round(jd * 10000) / 10000,
    elongationDeg: Math.round(elongation * 100) / 100,
    illuminationPercent: Math.round(illumination * 1000) / 10,
    phaseName: names[phaseIndex],
    waxing,
  };
}

async function arxivSearch({ query, max_results = 5 }) {
  if (!query) return { source: 'arXiv', error: 'query-required', results: [] };
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${Math.min(max_results, 10)}`;
  const xml = await fetchText(url);
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1];
    const get = (tag) => ((e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)) || [])[1] || '').replace(/\s+/g, ' ').trim();
    return {
      id: get('id').split('/').pop(),
      title: get('title'),
      summary: get('summary').slice(0, 400),
      published: get('published'),
    };
  });
  return { source: 'arXiv', epistemicStatus: 'established-science', query, results: entries };
}

// Observer environment — aggregates all Earth signal channels.
// Used by starwell-observer-environment tool.
async function observerEnvironment() {
  const [solar, kp, seismic, lunar] = await Promise.allSettled([
    noaaSolarWind(), noaaKp(), usgsSeismic(), Promise.resolve(meeusLunar()),
  ]);
  return {
    schema: 'hearthfire.environment/v1',
    generatedAt: new Date().toISOString(),
    channels: {
      solarWind: solar.status === 'fulfilled' ? solar.value : { error: solar.reason?.message },
      geomagneticKp: kp.status === 'fulfilled' ? kp.value : { error: kp.reason?.message },
      seismic: seismic.status === 'fulfilled' ? seismic.value : { error: seismic.reason?.message },
      lunar: lunar.status === 'fulfilled' ? lunar.value : { error: lunar.reason?.message },
    },
  };
}

module.exports = { noaaSolarWind, noaaKp, noaaSunspots, usgsSeismic, gwoscCatalog, meeusLunar, arxivSearch, observerEnvironment };
