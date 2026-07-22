export const CERTIFIED_TARGET = Object.freeze([-0.25, 0, 0]);

export const CERTIFIED_PREIMAGES = Object.freeze([
  Object.freeze([0, 0, -0.25]),
  Object.freeze([1, -1.5, 6.5]),
  Object.freeze([-1, 1.5, 6.5]),
]);

const EPSILON = 1e-12;
const CERTIFIED_DETERMINANT = -2;
const CERTIFIED_DETERMINANT_TOLERANCE = 1e-10;

export function sheetConvergenceMap([x, y, z]) {
  const u = 1 + x * y;
  return [
    u ** 3 * z + y ** 2 * u * (4 + 3 * x * y),
    y + 3 * x * u ** 2 * z + 3 * x * y ** 2 * (4 + 3 * x * y),
    2 * x - 3 * x ** 2 * y - x ** 3 * z,
  ];
}

export function sheetConvergenceJacobian([x, y, z]) {
  const u = 1 + x * y;
  return [
    [
      y * (3 * x ** 2 * y ** 2 * z + 6 * x * y ** 3 + 6 * x * y * z + 7 * y ** 2 + 3 * z),
      3 * x ** 3 * y ** 2 * z + 12 * x ** 2 * y ** 3 + 6 * x ** 2 * y * z + 21 * x * y ** 2 + 3 * x * z + 8 * y,
      u ** 3,
    ],
    [
      3 * (3 * x ** 2 * y ** 2 * z + 6 * x * y ** 3 + 4 * x * y * z + 4 * y ** 2 + z),
      6 * x ** 3 * y * z + 27 * x ** 2 * y ** 2 + 6 * x ** 2 * z + 24 * x * y + 1,
      3 * x * u ** 2,
    ],
    [-3 * x ** 2 * z - 6 * x * y + 2, -3 * x ** 2, -(x ** 3)],
  ];
}

export function determinant3(matrix) {
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function certifiedDeterminant(value) {
  // This polynomial automorphism has exact determinant -2. Floating-point
  // evaluation may produce a few ulps of drift, which must not leak into the
  // public invariant or downstream equality checks.
  return Math.abs(value - CERTIFIED_DETERMINANT) <= CERTIFIED_DETERMINANT_TOLERANCE
    ? CERTIFIED_DETERMINANT
    : value;
}

function transposeTimesSelf(matrix) {
  return Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) =>
      matrix.reduce((sum, currentRow) => sum + currentRow[row] * currentRow[column], 0),
    ),
  );
}

function symmetricEigenvalues3(matrix) {
  const a = matrix.map((row) => [...row]);

  // The oscillation must be regulated here, else numerical noise masquerades as geometry.
  for (let sweep = 0; sweep < 24; sweep += 1) {
    let p = 0;
    let q = 1;
    let largest = Math.abs(a[p][q]);

    for (const [row, column] of [[0, 2], [1, 2]]) {
      const candidate = Math.abs(a[row][column]);
      if (candidate > largest) {
        largest = candidate;
        p = row;
        q = column;
      }
    }

    if (largest < EPSILON) break;

    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    a[p][p] = cosine ** 2 * app - 2 * sine * cosine * apq + sine ** 2 * aqq;
    a[q][q] = sine ** 2 * app + 2 * sine * cosine * apq + cosine ** 2 * aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let index = 0; index < 3; index += 1) {
      if (index === p || index === q) continue;
      const aip = a[index][p];
      const aiq = a[index][q];
      a[index][p] = cosine * aip - sine * aiq;
      a[p][index] = a[index][p];
      a[index][q] = sine * aip + cosine * aiq;
      a[q][index] = a[index][q];
    }
  }

  return [a[0][0], a[1][1], a[2][2]].sort((left, right) => right - left);
}

export function singularValues3(matrix) {
  return symmetricEigenvalues3(transposeTimesSelf(matrix))
    .map((value) => Math.sqrt(Math.max(0, value)))
    .sort((left, right) => right - left);
}

function distance(left, right) {
  return Math.hypot(...left.map((value, index) => value - right[index]));
}

export function normaliseLocationState({ latitude, longitude, altitudeM = 0, timestamp = new Date() }) {
  const instant = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Number.isNaN(instant.getTime())) {
    throw new TypeError('A finite latitude, longitude, and valid timestamp are required.');
  }

  const dayFraction = (instant.getUTCHours() * 3600 + instant.getUTCMinutes() * 60 + instant.getUTCSeconds()) / 86400;
  return [
    longitude / 180,
    latitude / 90,
    Math.tanh(altitudeM / 10000) + Math.sin(2 * Math.PI * dayFraction),
  ];
}

export function calculateSheetConvergence(state, options = {}) {
  const targetTolerance = options.targetTolerance ?? 0.25;
  const sourceTolerance = options.sourceTolerance ?? 0.75;
  const mapped = sheetConvergenceMap(state);
  const jacobian = sheetConvergenceJacobian(state);
  const determinant = certifiedDeterminant(determinant3(jacobian));
  const singularValues = singularValues3(jacobian);
  const minimumSingularValue = singularValues[singularValues.length - 1];
  const conditionNumber = minimumSingularValue > EPSILON
    ? singularValues[0] / minimumSingularValue
    : Number.POSITIVE_INFINITY;
  const targetResidual = distance(mapped, CERTIFIED_TARGET);
  const preimageDistances = CERTIFIED_PREIMAGES.map((point) => distance(state, point));
  const nearestPreimageDistance = Math.min(...preimageDistances);
  const susceptibility = 1 / (1 + minimumSingularValue);
  const convergenceScore = Math.exp(-(targetResidual ** 2) / (2 * targetTolerance ** 2))
    * Math.exp(-(nearestPreimageDistance ** 2) / (2 * sourceTolerance ** 2));

  return {
    state: [...state],
    mapped,
    jacobian,
    determinant,
    volumeScale: Math.abs(determinant),
    orientation: determinant < 0 ? 'reversing' : 'preserving',
    singularity: Math.abs(determinant) < EPSILON,
    localFoldProbability: Math.abs(determinant) < EPSILON ? null : 0,
    singularValues,
    minimumSingularValue,
    conditionNumber,
    susceptibility,
    targetResidual,
    preimageDistances,
    nearestPreimageDistance,
    convergenceScore,
    register: 'MATHEMATICAL_DERIVATION',
    physicalFoldProbability: null,
    physicalStatus: 'UNAVAILABLE_UNTIL_CALIBRATED',
  };
}
