import { expressionOperations } from './expression.mjs';

// Finite pure-state circuits in the computational basis, most significant bit first.
// Serialized complex values are [real, imaginary] and use explicit binary64 arithmetic.
const MAX_DIMENSION = 16;
const TOLERANCE = 1e-12;
const norm = ([real, imaginary]) => real * real + imaginary * imaginary;

function amplitude(value) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite)) {
    throw new TypeError('Quantum amplitude requires two finite numbers');
  }
  return value;
}

function dimension(length) {
  if (![2, 4, 8, 16].includes(length)) throw new RangeError('Quantum dimension must be 2, 4, 8 or 16');
}

function state(value) {
  if (!Array.isArray(value)) throw new TypeError('Quantum state requires an amplitude list');
  dimension(value.length);
  value.forEach(amplitude);
  const total = value.reduce((sum, entry) => sum + norm(entry), 0);
  if (Math.abs(total - 1) > TOLERANCE) throw new RangeError('Quantum state must have unit norm');
  return value;
}

function inner(left, right, conjugate) {
  let real = 0, imaginary = 0;
  for (let i = 0; i < left.length; i++) {
    const [a, b] = left[i], [c, d] = right[i];
    const signed = conjugate ? -b : b;
    real += a * c - signed * d;
    imaginary += a * d + signed * c;
  }
  return [real, imaginary];
}

function checkMatrix(matrix, size, diagnostic) {
  if (!Array.isArray(matrix) || matrix.length !== size) throw new TypeError(diagnostic);
  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== size) throw new TypeError(diagnostic);
    row.forEach(amplitude);
  }
}

function quantumApply(vector, matrix) {
  const input = state(vector);
  checkMatrix(matrix, input.length, 'Quantum gate dimensions must match the state');
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i; j < matrix.length; j++) {
      const [real, imaginary] = inner(matrix[i], matrix[j], true);
      if (!(Math.abs(real - Number(i === j)) <= TOLERANCE && Math.abs(imaginary) <= TOLERANCE)) {
        throw new RangeError('Quantum gate must be unitary');
      }
    }
  }
  return state(matrix.map(row => inner(row, input, false)));
}

function quantumTensor(left, right) {
  const a = state(left), b = state(right);
  if (a.length * b.length > MAX_DIMENSION) throw new RangeError('Quantum tensor exceeds 16 amplitudes');
  return state(a.flatMap(([x, y]) => b.map(([u, v]) => [x * u - y * v, x * v + y * u])));
}

function quantumProbabilities(vector) {
  return state(vector).map(norm);
}

function quantumExpectation(vector, observable) {
  const input = state(vector);
  checkMatrix(observable, input.length, 'Quantum observable dimensions must match the state');
  for (let i = 0; i < input.length; i++) {
    for (let j = i; j < input.length; j++) {
      const [real, imaginary] = observable[i][j];
      const [otherReal, otherImaginary] = observable[j][i];
      if (real !== otherReal || imaginary !== -otherImaginary) {
        throw new RangeError('Quantum observable must be Hermitian');
      }
    }
  }
  const [expectation] = inner(input, observable.map(row => inner(row, input, false)), true);
  if (!Number.isFinite(expectation)) throw new RangeError('Quantum expectation must be finite');
  return expectation;
}

function quantumProbability(vector, index) {
  const input = state(vector);
  if (!Number.isSafeInteger(index) || index < 0 || index >= input.length) {
    throw new RangeError('Quantum outcome index is outside the basis');
  }
  return norm(input[index]);
}

function wonder(question, perspectives, evidence) {
  if (typeof question !== 'string' || !question.trim() || question.length > 2048 ||
      !Array.isArray(perspectives) || perspectives.length < 1 || perspectives.length > 16 ||
      !perspectives.every(text => typeof text === 'string' && text.trim() && text.length <= 2048) ||
      !Array.isArray(evidence) || evidence.length > 16) {
    throw new TypeError('Wonder requires a question, perspectives and a list of evidence');
  }
  return { schema: 'wyrdrune.wonder/v0.1', status: 'open', question, perspectives, evidence };
}

const operations = new Map([
  ...expressionOperations,
  ['quantumApply', { parameters: ['list', 'list'], result: 'list', run: quantumApply }],
  ['quantumTensor', { parameters: ['list', 'list'], result: 'list', run: quantumTensor }],
  ['quantumProbabilities', { parameters: ['list'], result: 'list', run: quantumProbabilities }],
  ['quantumExpectation', { parameters: ['list', 'list'], result: 'number', run: quantumExpectation }],
  ['quantumProbability', { parameters: ['list', 'number'], result: 'number', run: quantumProbability }],
  ['wonder', { parameters: ['text', 'list', 'list'], result: 'record', run: wonder }],
]);

export const pureOperation = name => operations.get(name);
for (const operation of operations.values()) {
  Object.freeze(operation.parameters);
  Object.freeze(operation);
}
