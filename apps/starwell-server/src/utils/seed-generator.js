const schemaVersion = '0.1.0';

const weatherPool = Object.freeze([
  'Stonewood Mist',
  'Amber Sleet',
  'Deep Ridge Frost',
  'Quiet Canopy Hum',
]);

const densityPool = Object.freeze([
  'Sheltered',
  'Broad',
  'Chambered',
  'Fractured Tree',
]);

const audioAssetByWeather = Object.freeze({
  'Stonewood Mist': '/assets/audio/weather/ambient-stonewood-mist.mp3',
  'Amber Sleet': '/assets/audio/weather/ambient-amber-sleet.mp3',
  'Deep Ridge Frost': '/assets/audio/weather/ambient-deep-ridge-frost.mp3',
  'Quiet Canopy Hum': '/assets/audio/weather/ambient-quiet-canopy-hum.mp3',
});

export function normalizeSeedToken(seedString) {
  return String(seedString ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function hashSeed(seedString) {
  let numericalHash = 0;

  for (let i = 0; i < seedString.length; i += 1) {
    numericalHash = seedString.charCodeAt(i) + ((numericalHash << 5) - numericalHash);
    numericalHash |= 0;
  }

  return numericalHash;
}

function positiveModulo(value, divisor) {
  return Math.abs(value) % divisor;
}

export function generateRoomFromSeed(seedString) {
  const normalizedSeed = normalizeSeedToken(seedString);

  if (!normalizedSeed) {
    throw new Error('A valid seed string token is required.');
  }

  const numericalHash = hashSeed(normalizedSeed);
  const weatherIndex = positiveModulo(numericalHash, weatherPool.length);
  const densityIndex = positiveModulo(numericalHash >> 2, densityPool.length);
  const structuralIntegrity = 70 + positiveModulo(numericalHash >> 4, 31);
  const weatherScene = weatherPool[weatherIndex];

  return {
    schemaVersion,
    source: 'starwell-server/portal-kernel/seed-generator',
    seed: normalizedSeed,
    derivedCoordinates: `YG-${positiveModulo(numericalHash, 1000)}-${positiveModulo(numericalHash >> 3, 1000)}`,
    environment: {
      weatherScene,
      topologyDensity: densityPool[densityIndex],
      structuralStability: `${structuralIntegrity}%`,
    },
    audioProfile: {
      baseFrequency: `${120 + positiveModulo(numericalHash, 80)}Hz`,
      loopAssetPath: audioAssetByWeather[weatherScene],
      playbackMode: 'loop-ready-user-initiated',
      autoplayAllowed: false,
    },
    persistence: {
      activeWorkspaceStorage: 'memory-only',
      volatile: true,
    },
  };
}
