'use strict';

/*
  STARWELL Groundwire v0.2.0
  Honest browser/device telemetry only. No invented metrics, no simulated physics.
  Location and microphone remain permission-gated. Groundwire never starts sound.
*/

const state = {
  location: { status: 'not requested' },
  network: {},
  hardware: {},
  microphone: { status: 'stopped', streamAvailable: false },
  battery: {}
};

const GROUNDWIRE_CHANNEL = 'starwell-groundwire';
const GROUNDWIRE_SESSION_KEY = 'starwell.groundwire.v0.1.sessionSnapshot';
const groundwireChannel = 'BroadcastChannel' in window ? new BroadcastChannel(GROUNDWIRE_CHANNEL) : null;

let root = null;
let statusEl = null;
let stateEl = null;
let micMeter = null;
let micStream = null;
let micContext = null;
let micContextIsShared = false;
let micAnalyser = null;
let micSource = null;
let micFrame = null;
let lastPublishAt = 0;
let networkConnection = null;

const $ = (selector) => document.querySelector(selector);

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function cloneState() {
  return JSON.parse(JSON.stringify(state));
}

function currentSnapshot() {
  const next = cloneState();
  return {
    type: 'groundwire:snapshot',
    version: '0.2.0',
    updatedAt: new Date().toISOString(),
    location: next.location,
    network: next.network,
    hardware: next.hardware,
    microphone: next.microphone,
    battery: next.battery,
    boundary: 'Groundwire reports real browser/device signals only. It does not start audio or mutate SCFE variables.'
  };
}

function exposeApi() {
  window.StarwellGroundwire = {
    version: '0.2.0',
    channel: GROUNDWIRE_CHANNEL,
    getSnapshot: currentSnapshot,
    getState: cloneState,
    getMicrophoneStream: () => micStream,
    startMicrophoneMeter: startMic,
    stopMicrophoneMeter: stopMic,
    requestLocation
  };
}

function publishGroundwire(force = false) {
  const now = performance.now();
  if (!force && now - lastPublishAt < 160) return;
  lastPublishAt = now;
  const snapshot = currentSnapshot();
  exposeApi();
  try { sessionStorage.setItem(GROUNDWIRE_SESSION_KEY, JSON.stringify(snapshot)); } catch (error) {}
  try { groundwireChannel?.postMessage({ type: 'groundwire:snapshot', snapshot }); } catch (error) {}
  try { window.dispatchEvent(new CustomEvent('starwell:groundwire:snapshot', { detail: snapshot })); } catch (error) {}
}

function confidenceClass(confidence) {
  return confidence === 'verified' ? 'verified' : confidence === 'observed' ? 'observed' : 'unknown';
}

function row(label, value, confidence = 'observed') {
  const item = document.createElement('div');
  item.className = 'field-row';
  const left = document.createElement('span');
  left.className = 'field-label';
  left.textContent = label;
  const right = document.createElement('span');
  right.className = 'field-value';
  right.textContent = String(value ?? 'unsupported');
  const badge = document.createElement('span');
  badge.className = `confidence ${confidenceClass(confidence)}`;
  badge.textContent = confidence;
  right.appendChild(badge);
  item.append(left, right);
  return item;
}

function renderList(selector, rows) {
  const target = $(selector);
  if (target) target.replaceChildren(...rows);
}

function updateState(force = false) {
  const now = performance.now();
  if (stateEl && (force || now - lastPublishAt >= 160)) stateEl.textContent = JSON.stringify(state, null, 2);
  publishGroundwire(force);
}

function renderNetwork() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  networkConnection = connection || null;
  if (!connection) {
    state.network = { status: 'unsupported', note: 'Network Information API unavailable in this browser.' };
    renderList('#network-fields', [row('Network API', 'unsupported', 'unknown')]);
    updateState(true);
    return;
  }

  state.network = {
    status: 'observed',
    effectiveType: connection.effectiveType ?? null,
    downlinkMbps: connection.downlink ?? null,
    rttMs: connection.rtt ?? null,
    saveData: Boolean(connection.saveData)
  };
  renderList('#network-fields', [
    row('Effective type', state.network.effectiveType || 'not reported'),
    row('Downlink', state.network.downlinkMbps == null ? 'not reported' : `${state.network.downlinkMbps} Mbps`),
    row('Round-trip time', state.network.rttMs == null ? 'not reported' : `${state.network.rttMs} ms`),
    row('Save data', state.network.saveData ? 'enabled' : 'not enabled')
  ]);
  updateState(true);
}

function renderHardware() {
  const nav = navigator;
  const screenData = window.screen
    ? `${screen.width} × ${screen.height}, ${screen.colorDepth || '?'} bit`
    : 'not reported';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'not reported';
  state.hardware = {
    status: 'observed',
    userAgent: nav.userAgent,
    platform: nav.platform || null,
    language: nav.language || null,
    timezone,
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    deviceMemoryGb: nav.deviceMemory ?? null,
    maxTouchPoints: nav.maxTouchPoints ?? null,
    screen: screenData
  };
  renderList('#hardware-fields', [
    row('Platform', state.hardware.platform || 'not reported'),
    row('Language', state.hardware.language || 'not reported'),
    row('Timezone', timezone),
    row('CPU threads', state.hardware.hardwareConcurrency ?? 'not reported'),
    row('Device memory', state.hardware.deviceMemoryGb == null ? 'not reported' : `${state.hardware.deviceMemoryGb} GB`),
    row('Touch points', state.hardware.maxTouchPoints ?? 'not reported'),
    row('Screen', screenData)
  ]);
  updateState(true);
}

async function renderBattery() {
  if (typeof navigator.getBattery !== 'function') {
    state.battery = { status: 'unsupported', note: 'Battery Status API unavailable or restricted.' };
    renderList('#battery-fields', [row('Battery API', 'unsupported or restricted', 'unknown')]);
    updateState(true);
    return;
  }

  try {
    const battery = await navigator.getBattery();
    const draw = () => {
      state.battery = {
        status: 'observed',
        charging: battery.charging,
        levelPercent: Math.round(battery.level * 100),
        chargingTimeSec: battery.chargingTime,
        dischargingTimeSec: battery.dischargingTime
      };
      renderList('#battery-fields', [
        row('Charging', battery.charging ? 'yes' : 'no'),
        row('Level', `${Math.round(battery.level * 100)}%`),
        row('Charging time', Number.isFinite(battery.chargingTime) ? `${battery.chargingTime}s` : 'not reported'),
        row('Discharging time', Number.isFinite(battery.dischargingTime) ? `${battery.dischargingTime}s` : 'not reported')
      ]);
      updateState(true);
    };
    ['chargingchange', 'levelchange', 'chargingtimechange', 'dischargingtimechange']
      .forEach((eventName) => battery.addEventListener(eventName, draw));
    draw();
  } catch (error) {
    state.battery = { status: 'error', message: error?.message || String(error) };
    renderList('#battery-fields', [row('Battery API', state.battery.message, 'unknown')]);
    updateState(true);
  }
}

function altitudeRows(coords) {
  const rows = [
    row('Latitude', coords.latitude.toFixed(6), 'verified'),
    row('Longitude', coords.longitude.toFixed(6), 'verified'),
    row('Accuracy', `${Math.round(coords.accuracy)} m`, 'verified')
  ];
  if (coords.altitude == null) {
    rows.push(row('Altitude', 'not provided by this browser/device', 'unknown'));
  } else {
    rows.push(row('Altitude', `${coords.altitude.toFixed(1)} m`, 'verified'));
    rows.push(row(
      'Altitude accuracy',
      coords.altitudeAccuracy == null ? 'not reported' : `${Math.round(coords.altitudeAccuracy)} m`,
      coords.altitudeAccuracy == null ? 'unknown' : 'verified'
    ));
  }
  return rows;
}

function requestLocation({ highAccuracy = false } = {}) {
  if (!navigator.geolocation) {
    state.location = { status: 'unsupported', note: 'Geolocation unavailable in this browser.' };
    renderList('#location-fields', [row('Location', 'unsupported', 'unknown')]);
    setStatus('Location is unsupported in this browser.');
    updateState(true);
    return;
  }

  const mode = highAccuracy ? 'high accuracy' : 'standard';
  setStatus(`Requesting ${mode} location permission...`);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = position.coords;
      state.location = {
        status: 'verified',
        mode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyM: coords.accuracy,
        altitudeM: coords.altitude,
        altitudeAccuracyM: coords.altitudeAccuracy,
        altitudeStatus: coords.altitude == null ? 'not reported by browser/device' : 'reported',
        heading: coords.heading,
        speedMps: coords.speed,
        timestamp: new Date(position.timestamp).toISOString()
      };
      renderList('#location-fields', [
        ...altitudeRows(coords),
        row('Mode', mode, 'observed'),
        row('Timestamp', state.location.timestamp, 'verified')
      ]);
      setStatus(coords.altitude == null
        ? 'Location read completed. Altitude was not supplied.'
        : `${mode} location read completed with altitude.`);
      updateState(true);
    },
    (error) => {
      state.location = { status: 'denied-or-error', mode, code: error.code, message: error.message };
      renderList('#location-fields', [row('Location', error.message || 'permission denied', 'unknown')]);
      setStatus('Location was not granted or could not be read.');
      updateState(true);
    },
    { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 20000 : 12000, maximumAge: highAccuracy ? 0 : 60000 }
  );
}

async function ensureMicContext() {
  if (window.StarwellSharedAudioContext?.ensure) {
    micContext = await window.StarwellSharedAudioContext.ensure();
    micContextIsShared = true;
    return micContext;
  }
  const Context = window.AudioContext || window.webkitAudioContext;
  micContext = new Context();
  micContextIsShared = false;
  return micContext;
}

async function startMic(options = {}) {
  if (!navigator.mediaDevices?.getUserMedia && !options.stream) {
    state.microphone = { status: 'unsupported', note: 'MediaDevices.getUserMedia unavailable.', streamAvailable: false };
    renderList('#mic-fields', [row('Microphone', 'unsupported', 'unknown')]);
    updateState(true);
    return null;
  }

  try {
    setStatus('Requesting microphone permission...');
    stopMic(false);
    micStream = options.stream || await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    await ensureMicContext();
    micSource = micContext.createMediaStreamSource(micStream);
    micAnalyser = micContext.createAnalyser();
    micAnalyser.fftSize = 2048;
    micSource.connect(micAnalyser);
    const data = new Float32Array(micAnalyser.fftSize);
    state.microphone = { status: 'active', rms: 0, peak: 0, streamAvailable: true };
    renderList('#mic-fields', [row('Microphone', 'active', 'verified'), row('RMS', '0.0000', 'observed')]);
    setStatus('Microphone meter is active in the shared audio context.');

    const tick = () => {
      micAnalyser.getFloatTimeDomainData(data);
      let sum = 0;
      let peak = 0;
      for (const sample of data) {
        sum += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      const rms = Math.sqrt(sum / data.length);
      state.microphone = {
        status: 'active',
        rms: Number(rms.toFixed(6)),
        peak: Number(peak.toFixed(6)),
        streamAvailable: true
      };
      if (micMeter) micMeter.style.width = `${Math.min(100, Math.round(rms * 520))}%`;
      renderList('#mic-fields', [
        row('Microphone', 'active', 'verified'),
        row('RMS', rms.toFixed(6), 'observed'),
        row('Peak', peak.toFixed(6), 'observed')
      ]);
      updateState(false);
      micFrame = requestAnimationFrame(tick);
    };
    tick();
    exposeApi();
    return micStream;
  } catch (error) {
    state.microphone = { status: 'denied-or-error', message: error?.message || String(error), streamAvailable: false };
    renderList('#mic-fields', [row('Microphone', state.microphone.message, 'unknown')]);
    setStatus('Microphone was not granted or could not be read.');
    updateState(true);
    return null;
  }
}

function stopMic(announce = true) {
  if (micFrame) cancelAnimationFrame(micFrame);
  micFrame = null;
  if (micStream) micStream.getTracks().forEach((track) => track.stop());
  micStream = null;
  try { micSource?.disconnect(); } catch (error) {}
  try { micAnalyser?.disconnect(); } catch (error) {}
  micSource = null;
  micAnalyser = null;
  if (micContext && !micContextIsShared) micContext.close().catch(() => {});
  micContext = null;
  micContextIsShared = false;
  if (micMeter) micMeter.style.width = '0%';
  state.microphone = { status: 'stopped', streamAvailable: false };
  renderList('#mic-fields', [row('Microphone', 'stopped', 'observed')]);
  updateState(true);
  if (announce) setStatus('Microphone meter stopped.');
}

function init() {
  root = $('[data-groundwire-lab]');
  if (!root) {
    exposeApi();
    return;
  }
  statusEl = $('#groundwire-status');
  stateEl = $('#groundwire-state');
  micMeter = $('#mic-meter');

  renderNetwork();
  renderHardware();
  renderBattery();
  renderList('#location-fields', [row('Location', 'not requested', 'unknown'), row('Altitude', 'not requested', 'unknown')]);
  renderList('#mic-fields', [row('Microphone', 'stopped', 'observed')]);
  updateState(true);

  if (networkConnection?.addEventListener) networkConnection.addEventListener('change', renderNetwork);
  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'request-location') requestLocation({ highAccuracy: false });
    if (action === 'request-location-high') requestLocation({ highAccuracy: true });
    if (action === 'start-mic') startMic();
    if (action === 'stop-mic') stopMic(true);
  });
  exposeApi();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
window.addEventListener('pagehide', () => stopMic(false));
