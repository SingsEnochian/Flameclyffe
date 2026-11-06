'use strict';
// WCE-1 · Wyrdrune Canonical Encoding, JavaScript reference.
// RFC 8785 (JCS) canonical JSON + SHA-256, with WTL value rules:
//  - numbers are finite IEEE-754 doubles; -0 encodes as 0; NaN/±Infinity rejected
//  - text must be well-formed Unicode (no lone surrogates)
//  - record keys sorted by UTF-16 code units (RFC 8785 §3.2.3)
//  - only null, boolean, number, text, list, record
// Every backend (JS, Python, later Rust/WASM) must produce byte-identical
// encodings for the shared vectors in conformance/wce1-vectors.json.
const { createHash } = require('node:crypto');

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function encode(value) {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('WCE-1: non-finite number');
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (typeof value === 'string') {
    if (LONE_SURROGATE.test(value)) throw new TypeError('WCE-1: ill-formed Unicode text');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(encode).join(',') + ']';
  const proto = value !== undefined && typeof value === 'object' ? Object.getPrototypeOf(value) : undefined;
  if (proto === Object.prototype || proto === null) {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return '{' + keys.map(k => {
      if (LONE_SURROGATE.test(k)) throw new TypeError('WCE-1: ill-formed Unicode key');
      return JSON.stringify(k) + ':' + encode(value[k]);
    }).join(',') + '}';
  }
  throw new TypeError('WCE-1: unsupported value type ' + typeof value);
}

function digest(value) {
  return 'wce1:' + createHash('sha256').update(encode(value), 'utf8').digest('hex');
}

module.exports = { encode, digest };
