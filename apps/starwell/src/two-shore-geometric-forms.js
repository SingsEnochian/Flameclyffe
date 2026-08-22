export const BOX_GEOMETRIC_SOURCE = Object.freeze({
  repository: 'SingsEnochian/Flameclyffe',
  pull_request: 108,
  branch: 'feature/geometric-manifold-engine',
  commit: 'a5bdb2466f2b3ae482b0bac8476836aca6e43880',
  engine_version: '1.0.0',
});

export const REQUIRED_GEOMETRIC_FORMS = Object.freeze([
  'dodecahedron-tight-frame',
  'tesseract-tight-frame',
  'penteract-so5-tight-frame',
  'live-gram-matrix',
  'poincare-ball-point',
  'projective-quintic-proxy',
]);

const PREMAQ_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
const EPSILON = 1e-10;

function round(value, digits = 8) {
  return Number(Number(value).toFixed(digits));
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function vectorNorm(vector) {
  return Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0));
}

function normalise(vector) {
  const norm = vectorNorm(vector);
  if (norm <= EPSILON) throw new Error('GEOMETRY_ZERO_LENGTH_VERTEX');
  return vector.map((value) => value / norm);
}

function identity(size) {
  return Array.from({ length: size }, (_, row) => (
    Array.from({ length: size }, (_, column) => Number(row === column))
  ));
}

function multiplyMatrix(left, right) {
  return left.map((row) => right[0].map((_, column) => (
    row.reduce((sum, value, index) => sum + (value * right[index][column]), 0)
  )));
}

function multiplyVectorMatrix(vector, matrix) {
  return matrix[0].map((_, column) => (
    vector.reduce((sum, value, index) => sum + (value * matrix[index][column]), 0)
  ));
}

function givensRotation(dimension, left, right, angle) {
  const matrix = identity(dimension);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  matrix[left][left] = cosine;
  matrix[right][right] = cosine;
  matrix[left][right] = -sine;
  matrix[right][left] = sine;
  return matrix;
}

function rotationPlanes(dimension) {
  const planes = [];
  for (let left = 0; left < dimension; left += 1) {
    for (let right = left + 1; right < dimension; right += 1) {
      planes.push([left, right]);
    }
  }
  return planes;
}

function shorePhase(shoreId) {
  let total = 0;
  for (const character of String(shoreId)) total = ((total * 31) + character.charCodeAt(0)) >>> 0;
  return (total % 1009) / 1009;
}

function rotationAngles({ dimension, premaq, year, shoreId, elaraMultiplier }) {
  const values = PREMAQ_AXES.map((axis) => clamp(premaq?.[axis]));
  const phase = shorePhase(shoreId);
  const yearOffset = year - 2025;
  return rotationPlanes(dimension).map((_, index) => {
    const value = values[index % values.length];
    const next = values[(index + 2) % values.length];
    return (
      ((value - 0.5) * Math.PI * 2)
      + ((next - 0.5) * Math.PI * 0.5)
      + (yearOffset * 0.031 * (index + 1))
      + (Math.log(elaraMultiplier) * 0.17 * (index + 1))
      + (phase * 0.23)
    );
  });
}

function buildRotation(dimension, angles) {
  let rotation = identity(dimension);
  const planes = rotationPlanes(dimension);
  for (let index = 0; index < planes.length; index += 1) {
    const [left, right] = planes[index];
    rotation = multiplyMatrix(rotation, givensRotation(dimension, left, right, angles[index]));
  }
  return rotation;
}

function dodecahedronVertices() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const inversePhi = 1 / phi;
  return [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, phi, inversePhi], [0, phi, -inversePhi], [0, -phi, inversePhi], [0, -phi, -inversePhi],
    [inversePhi, 0, phi], [inversePhi, 0, -phi], [-inversePhi, 0, phi], [-inversePhi, 0, -phi],
    [phi, inversePhi, 0], [phi, -inversePhi, 0], [-phi, inversePhi, 0], [-phi, -inversePhi, 0],
  ].map(normalise);
}

function hypercubeVertices(dimension) {
  const vertices = [];
  const count = 2 ** dimension;
  for (let index = 0; index < count; index += 1) {
    vertices.push(normalise(Array.from({ length: dimension }, (_, axis) => (
      ((index >> axis) & 1) ? 1 : -1
    ))));
  }
  return vertices;
}

function nearestNeighbourEdges(vertices) {
  let minimum = Infinity;
  const distances = [];
  for (let left = 0; left < vertices.length; left += 1) {
    for (let right = left + 1; right < vertices.length; right += 1) {
      const distance = vectorNorm(vertices[left].map((value, axis) => value - vertices[right][axis]));
      distances.push([left, right, distance]);
      if (distance > EPSILON) minimum = Math.min(minimum, distance);
    }
  }
  const tolerance = Math.max(1e-9, minimum * 1e-7);
  return distances
    .filter(([, , distance]) => Math.abs(distance - minimum) <= tolerance)
    .map(([left, right]) => [left, right]);
}

function hypercubeEdges(vertexCount) {
  const edges = [];
  for (let left = 0; left < vertexCount; left += 1) {
    for (let right = left + 1; right < vertexCount; right += 1) {
      const differingBits = left ^ right;
      const differsByExactlyOneBit = differingBits !== 0
        && (differingBits & (differingBits - 1)) === 0;
      if (differsByExactlyOneBit) edges.push([left, right]);
    }
  }
  return edges;
}

function gramMatrix(vertices) {
  return vertices.map((left) => vertices.map((right) => (
    left.reduce((sum, value, axis) => sum + (value * right[axis]), 0)
  )));
}

function frameMatrix(vertices) {
  const dimension = vertices[0].length;
  return Array.from({ length: dimension }, (_, row) => (
    Array.from({ length: dimension }, (_, column) => (
      vertices.reduce((sum, vertex) => sum + (vertex[row] * vertex[column]), 0)
    ))
  ));
}

function maxFrameError(frame, expected) {
  let maximum = 0;
  for (let row = 0; row < frame.length; row += 1) {
    for (let column = 0; column < frame.length; column += 1) {
      const target = row === column ? expected : 0;
      maximum = Math.max(maximum, Math.abs(frame[row][column] - target));
    }
  }
  return maximum;
}

function projectTo3d(vertices) {
  const projected = vertices.map((vertex) => [vertex[0] ?? 0, vertex[1] ?? 0, vertex[2] ?? 0]);
  const maximum = projected.reduce((outer, row) => (
    Math.max(outer, ...row.map((value) => Math.abs(value)))
  ), 0);
  const scale = maximum > EPSILON ? 1 / maximum : 1;
  return projected.map((row) => row.map((value) => round(value * scale)));
}

function geometryReference(geometryId) {
  if (geometryId === 'dodecahedron') {
    return { dimension: 3, vertices: dodecahedronVertices(), expectedEdges: 30, expectedFrame: 20 / 3 };
  }
  if (geometryId === 'tesseract') {
    return { dimension: 4, vertices: hypercubeVertices(4), expectedEdges: 32, expectedFrame: 4 };
  }
  if (geometryId === 'penteract') {
    return { dimension: 5, vertices: hypercubeVertices(5), expectedEdges: 80, expectedFrame: 32 / 5 };
  }
  throw new Error(`UNSUPPORTED_GEOMETRY:${geometryId}`);
}

function buildAnchorForm({ geometryId, premaq, year, shoreId, elaraMultiplier }) {
  const reference = geometryReference(geometryId);
  const angles = rotationAngles({
    dimension: reference.dimension,
    premaq,
    year,
    shoreId,
    elaraMultiplier,
  });
  const rotation = buildRotation(reference.dimension, angles);
  const vertices = reference.vertices.map((vertex) => multiplyVectorMatrix(vertex, rotation));
  const edges = geometryId === 'dodecahedron'
    ? nearestNeighbourEdges(vertices)
    : hypercubeEdges(vertices.length);
  const frame = frameMatrix(vertices);
  const gram = gramMatrix(vertices);
  const unitError = Math.max(...vertices.map((vertex) => Math.abs(vectorNorm(vertex) - 1)));
  const frameError = maxFrameError(frame, reference.expectedFrame);
  const finite = vertices.every((vertex) => vertex.every(Number.isFinite));
  const verified = finite
    && edges.length === reference.expectedEdges
    && unitError < 1e-8
    && frameError < 1e-8;

  return Object.freeze({
    schema: 'hearthgate.two-shore-geometric-anchor/v0.1',
    geometry_id: geometryId,
    classification: 'experimental-computational',
    ambient_dimension: reference.dimension,
    vertex_count: vertices.length,
    edge_count: edges.length,
    expected_edge_count: reference.expectedEdges,
    frame_constant: round(reference.expectedFrame),
    rotation_plane_count: angles.length,
    rotation_angles: Object.freeze(angles.map((value) => round(value))),
    unit_vertex_max_error: round(unitError, 12),
    tight_frame_max_error: round(frameError, 12),
    gram_values: Object.freeze([...new Set(gram.flat().map((value) => round(value)))].sort((a, b) => a - b)),
    vertices: Object.freeze(vertices.map((vertex) => Object.freeze(vertex.map((value) => round(value))))),
    edges: Object.freeze(edges.map((edge) => Object.freeze(edge))),
    projection_3d: Object.freeze(projectTo3d(vertices).map((row) => Object.freeze(row))),
    claims: Object.freeze({
      finite: finite ? 'VERIFIED' : 'FAILED',
      unit_vertices: unitError < 1e-8 ? 'VERIFIED' : 'FAILED',
      tight_frame: frameError < 1e-8 ? 'VERIFIED' : 'FAILED',
      edge_count: edges.length === reference.expectedEdges ? 'VERIFIED' : 'FAILED',
    }),
    status: verified ? 'VERIFIED' : 'FAILED',
  });
}

function poincarePoint(premaq) {
  const source = PREMAQ_AXES.slice(0, 5).map((axis) => (clamp(premaq?.[axis]) - 0.5) * 2);
  const norm = vectorNorm(source);
  const radius = Math.min(0.92, Math.tanh(norm));
  const point = norm > EPSILON
    ? source.map((value) => (value / norm) * radius)
    : source.map(() => 0);
  return Object.freeze({
    schema: 'hearthgate.poincare-ball-point/v0.1',
    dimension: 5,
    coordinates: Object.freeze(point.map((value) => round(value))),
    euclidean_radius: round(vectorNorm(point)),
    inside_unit_ball: vectorNorm(point) < 1,
    status: vectorNorm(point) < 1 ? 'VERIFIED' : 'FAILED',
  });
}

function complexMultiply(left, right) {
  return [
    (left[0] * right[0]) - (left[1] * right[1]),
    (left[0] * right[1]) + (left[1] * right[0]),
  ];
}

function complexPower(value, exponent) {
  let result = [1, 0];
  for (let index = 0; index < exponent; index += 1) result = complexMultiply(result, value);
  return result;
}

function projectiveQuintic(premaq) {
  const coordinates = [
    [clamp(premaq.P) - 0.5, clamp(premaq.C) - 0.5],
    [clamp(premaq.R) - 0.5, clamp(premaq.E) - 0.5],
    [clamp(premaq.M) - 0.5, clamp(premaq.A) - 0.5],
    [clamp(premaq.Q) - 0.5, clamp(premaq.P) - 0.5],
    [clamp(premaq.C) - 0.5, clamp(premaq.R) - 0.5],
  ];
  const homogeneousNorm = Math.sqrt(coordinates.reduce((sum, [real, imaginary]) => (
    sum + (real * real) + (imaginary * imaginary)
  ), 0));
  const normalised = homogeneousNorm > EPSILON
    ? coordinates.map(([real, imaginary]) => [real / homogeneousNorm, imaginary / homogeneousNorm])
    : coordinates;
  const sum = normalised
    .map((value) => complexPower(value, 5))
    .reduce((total, value) => [total[0] + value[0], total[1] + value[1]], [0, 0]);
  const residual = (sum[0] * sum[0]) + (sum[1] * sum[1]);
  return Object.freeze({
    schema: 'hearthgate.projective-quintic-proxy/v0.1',
    classification: 'experimental-computational-proxy',
    homogeneous_coordinates: Object.freeze(normalised.map((value) => Object.freeze(value.map((entry) => round(entry))))),
    sum_z_i_fifth: Object.freeze(sum.map((value) => round(value))),
    residual_squared: round(residual, 12),
    finite: Number.isFinite(residual),
    status: Number.isFinite(residual) ? 'VERIFIED' : 'FAILED',
    physical_claim: false,
  });
}

function fingerprint(value) {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function generateTwoShoreGeometricForms({
  shoreId,
  year,
  premaq,
  sourceStateId,
  elaraMultiplier,
  clock = () => new Date(),
} = {}) {
  if (!shoreId) throw new Error('GEOMETRIC_SHORE_ID_REQUIRED');
  if (!Number.isInteger(year) || year < 2025 || year > 2035) throw new Error('GEOMETRIC_YEAR_2025_2035_REQUIRED');
  if (!sourceStateId) throw new Error('GEOMETRIC_SOURCE_STATE_REQUIRED');
  for (const axis of PREMAQ_AXES) {
    if (!Number.isFinite(Number(premaq?.[axis]))) throw new Error(`GEOMETRIC_PREMAQ_${axis}_REQUIRED`);
  }

  const dodecahedron = buildAnchorForm({ geometryId: 'dodecahedron', premaq, year, shoreId, elaraMultiplier });
  const tesseract = buildAnchorForm({ geometryId: 'tesseract', premaq, year, shoreId, elaraMultiplier });
  const penteract = buildAnchorForm({ geometryId: 'penteract', premaq, year, shoreId, elaraMultiplier });
  const poincare = poincarePoint(premaq);
  const quintic = projectiveQuintic(premaq);
  const allVerified = [dodecahedron, tesseract, penteract, poincare, quintic]
    .every((entry) => entry.status === 'VERIFIED');

  const receipt = {
    schema: 'hearthgate.two-shore-geometric-forms/v0.1',
    generated_at: clock().toISOString(),
    shore_id: shoreId,
    year,
    source_state_id: sourceStateId,
    elara_multiplier: elaraMultiplier,
    premaq: Object.freeze(Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, round(premaq[axis])]))),
    required_forms: REQUIRED_GEOMETRIC_FORMS,
    forms: Object.freeze({
      dodecahedron,
      tesseract,
      penteract,
      live_gram_matrix: Object.freeze({
        dodecahedron: dodecahedron.gram_values,
        tesseract: tesseract.gram_values,
        penteract: penteract.gram_values,
        status: allVerified ? 'VERIFIED' : 'FAILED',
      }),
      poincare_ball: poincare,
      projective_quintic: quintic,
    }),
    source: BOX_GEOMETRIC_SOURCE,
    heavy_torch_lane: 'NOT_TESTED',
    physical_claim: false,
    status: allVerified ? 'VERIFIED' : 'FAILED',
  };
  return Object.freeze({
    ...receipt,
    fingerprint: fingerprint(receipt),
  });
}

export function assertCompleteTwoShoreGeometry(receipt) {
  if (receipt?.status !== 'VERIFIED') throw new Error('TWO_SHORE_GEOMETRY_INCOMPLETE');
  const forms = receipt.forms ?? {};
  for (const key of ['dodecahedron', 'tesseract', 'penteract', 'live_gram_matrix', 'poincare_ball', 'projective_quintic']) {
    if (!forms[key]) throw new Error(`TWO_SHORE_GEOMETRY_MISSING:${key}`);
  }
  return true;
}
