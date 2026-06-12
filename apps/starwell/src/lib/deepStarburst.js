import { clampNumber, normaliseDeepState, numberOr } from './deepState.js';

export function normaliseStarburstDeep(rawDeep = {}) {
  return normaliseDeepState(rawDeep);
}

export function buildStarburstVars(rawDeep = {}, options = {}) {
  const deep = normaliseStarburstDeep(rawDeep);
  const moon = deep.moonIllum / 100;
  const bzTemp = clampNumber((deep.bz + 20) / 40, 0, 1);
  const baseSize = numberOr(options.baseSize, 132);
  const baseRotation = numberOr(options.rotation, 0);

  const spikes = Math.round(8 + deep.P * 16 + moon * 8);
  const size = Math.round(baseSize + deep.charge * 34 + deep.kp * 2.8);
  const sharpness = Math.round(18 + deep.C * 42);
  const hue = Math.round(210 - bzTemp * 156);
  const alpha = clampNumber(0.18 + deep.charge * 0.34 + deep.kp / 9 * 0.16, 0.12, 0.82);
  const jitter = clampNumber(deep.E * (1 + deep.kp / 9), 0, 1.8);
  const rotation = baseRotation + deep.dphi * 40 + deep.E * 11;

  return {
    '--n': String(spikes),
    '--w': `${size}px`,
    '--m': `${sharpness}%`,
    '--flare-hue': String(hue),
    '--flare-alpha': alpha.toFixed(3),
    '--flare-jitter': `${jitter.toFixed(3)}px`,
    '--flare-rot': `${rotation.toFixed(2)}deg`,
  };
}

export function buildSensorStarburstVars(rawDeep = {}, sensor) {
  const deep = normaliseStarburstDeep(rawDeep);
  const vars = buildStarburstVars(sensor.proxy(deep), {
    baseSize: sensor.baseSize,
    rotation: sensor.rotation + deep.E * 12 + deep.kp,
  });

  return {
    '--sensor-n': vars['--n'],
    '--sensor-w': vars['--w'],
    '--sensor-m': vars['--m'],
    '--sensor-hue': vars['--flare-hue'],
    '--sensor-alpha': vars['--flare-alpha'],
    '--sensor-jitter': vars['--flare-jitter'],
    '--sensor-rot': vars['--flare-rot'],
  };
}

export function buildSensorStarbursts(rawDeep = {}) {
  const deep = normaliseStarburstDeep(rawDeep);
  const labels = [
    { key: 'presence', angle: 0, size: 96, weight: deep.P },
    { key: 'clarity', angle: 60, size: 78, weight: deep.C },
    { key: 'entropy', angle: 120, size: 86, weight: deep.E },
    { key: 'moon', angle: 180, size: 92, weight: deep.moonIllum / 100 },
    { key: 'geomagnetic', angle: 240, size: 82, weight: deep.kp / 9 },
    { key: 'charge', angle: 300, size: 102, weight: deep.charge },
  ];

  return labels.map((sensor) => ({
    ...sensor,
    vars: buildStarburstVars(deep, {
      baseSize: sensor.size + sensor.weight * 42,
      rotation: sensor.angle,
    }),
  }));
}
