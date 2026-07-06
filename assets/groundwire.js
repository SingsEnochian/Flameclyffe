'use strict';

/*
  STARWELL Groundwire v0.1
  Honest browser/device telemetry only. No invented metrics, no simulated physics.
  Permission-gated signals wait for explicit user action.
*/

const state = {
  location: { status: 'not requested' },
  network: {},
  hardware: {},
  microphone: { status: 'stopped' },
  battery: {}
};

const $ = (selector) => document.querySelector(selector);
const root = $('[data-groundwire-lab]');
const statusEl = $('#groundwire-status');
const stateEl = $('#groundwire-state');
const micMeter = $('#mic-meter');

let micStream = null;
let micContext = null;
let micAnalyser = null;
let micFrame = null;

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function confidenceClass(confidence) {
  if (confidence === 'verified') return 'verified';
  if (confidence === 'observed') return 'observed';
  return 'unknown';
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
  if (!target) return;
  target.replaceChildren(...rows);
}

function updateState() {
  if (stateEl) stateEl.textContent = JSON.stringify(state, null, 2);
}

function renderNetwork() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) {
    state.network = { status: 'unsupported', note: 'Network Information API unavailable in this browser.' };
    renderList('#network-fields', [row('Network API', 'unsupported', 'unknown')]);
    updateState();
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
  updateState();
}

function renderHardware() {
  const nav = navigator;
  const screenData = window.screen ? `${screen.width} × ${screen.height}, ${screen.colorDepth || '?'} bit` : 'not reported';
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
  updateState();
}

async function renderBattery() {
  if (typeof navigator.getBattery !== 'function') {
    state.battery = { status: 'unsupported', note: 'Battery Status API unavailable or restricted.' };
    renderList('#battery-fields', [row('Battery API', 'unsupported or restricted', 'unknown')]);
    updateState();
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
      updateState();
    };
    battery.addEventListener('chargingchange', draw);
    battery.addEventListener('levelchange', draw);
    battery.addEventListener('chargingtimechange', draw);
    battery.addEventListener('dischargingtimechange', draw);
    draw();
  } catch (error) {
    state.battery = { status: 'error', message: error?.message || String(error) };
    renderList('#battery-fields', [row('Battery API', state.battery.message, 'unknown')]);
    updateState();
  }
}

function requestLocation() {
  if (!navigator.geolocation) {
    state.location = { status: 'unsupported', note: 'Geolocation unavailable in this browser.' };
    renderList('#location-fields', [row('Location', 'unsupported', 'unknown')]);
    setStatus('Location is unsupported in this browser.');
    updateState();
    return;
  }

  setStatus('Requesting location permission...');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = position.coords;
      state.location = {
        status: 'verified',
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyM: coords.accuracy,
        altitudeM: coords.altitude,
        altitudeAccuracyM: coords.altitudeAccuracy,
        heading: coords.heading,
        speedMps: coords.speed,
        timestamp: new Date(position.timestamp).toISOString()
      };
      renderList('#location-fields', [
        row('Latitude', coords.latitude.toFixed(6), 'verified'),
        row('Longitude', coords.longitude.toFixed(6), 'verified'),
        row('Accuracy', `${Math.round(coords.accuracy)} m`, 'verified'),
        row('Altitude', coords.altitude == null ? 'not reported' : `${coords.altitude.toFixed(1)} m`, coords.altitude == null ? 'unknown' : 'verified'),
        row('Timestamp', state.location.timestamp, 'verified')
      ]);
      setStatus('Location read completed.');
      updateState();
    },
    (error) => {
      state.location = { status: 'denied-or-error', code: error.code, message: error.message };
      renderList('#location-fields', [row('Location', error.message || 'permission denied', 'unknown')]);
      setStatus('Location was not granted or could not be read.');
      updateState();
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
  );
}

async function startMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    state.microphone = { status: 'unsupported', note: 'MediaDevices.getUserMedia unavailable.' };
    renderList('#mic-fields', [row('Microphone', 'unsupported', 'unknown')]);
    updateState();
    return;
  }

  try {
    setStatus('Requesting microphone permission...');
    stopMic(false);
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = micContext.createMediaStreamSource(micStream);
    micAnalyser = micContext.createAnalyser();
    micAnalyser.fftSize = 2048;
    source.connect(micAnalyser);
    const data = new Float32Array(micAnalyser.fftSize);

    state.microphone = { status: 'active', rms: 0, peak: 0 };
    renderList('#mic-fields', [row('Microphone', 'active', 'verified'), row('RMS', '0.0000', 'observed')]);
    setStatus('Microphone meter is active.');

    const tick = () => {
      micAnalyser.getFloatTimeDomainData(data);
      let sum = 0;
      let peak = 0;
      for (const sample of data) {
        sum += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      const rms = Math.sqrt(sum / data.length);
      state.microphone = { status: 'active', rms: Number(rms.toFixed(6)), peak: Number(peak.toFixed(6)) };
      if (micMeter) micMeter.style.width = `${Math.min(100, Math.round(rms * 520))}%`;
      renderList('#mic-fields', [
        row('Microphone', 'active', 'verified'),
        row('RMS', rms.toFixed(6), 'observed'),
        row('Peak', peak.toFixed(6), 'observed')
      ]);
      updateState();
      micFrame = requestAnimationFrame(tick);
    };
    tick();
  } catch (error) {
    state.microphone = { status: 'denied-or-error', message: error?.message || String(error) };
    renderList('#mic-fields', [row('Microphone', state.microphone.message, 'unknown')]);
    setStatus('Microphone was not granted or could not be read.');
    updateState();
  }
}

function stopMic(announce = true) {
  if (micFrame) cancelAnimationFrame(micFrame);
  micFrame = null;
  if (micStream) micStream.getTracks().forEach((track) => track.stop());
  micStream = null;
  if (micContext) micContext.close().catch(() => {});
  micContext = null;
  micAnalyser = null;
  if (micMeter) micMeter.style.width = '0%';
  state.microphone = { status: 'stopped' };
  renderList('#mic-fields', [row('Microphone', 'stopped', 'observed')]);
  updateState();
  if (announce) setStatus('Microphone meter stopped.');
}

function init() {
  renderNetwork();
  renderHardware();
  renderBattery();
  renderList('#location-fields', [row('Location', 'not requested', 'unknown')]);
  renderList('#mic-fields', [row('Microphone', 'stopped', 'observed')]);
  updateState();
}

root?.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'request-location') requestLocation();
  if (action === 'start-mic') startMic();
  if (action === 'stop-mic') stopMic(true);
});

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('pagehide', () => stopMic(false));
