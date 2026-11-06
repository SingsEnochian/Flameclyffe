'use strict';
// WIR v0.2 schema checks with a small dependency-free validator covering the
// JSON Schema keywords the WIR schema uses. Codex may swap in a full
// draft 2020-12 validator; these tests must keep passing.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const schema = require('../../docs/wyrdrune/schema/wir-v0.2.schema.json');
const example = require('../../docs/wyrdrune/schema/wir-example.three-cycles.json');

const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array'
  : Number.isInteger(v) ? 'integer' : typeof v;
function validate(s, v, at = '$') {
  if (s.$ref) return validate(schema.$defs[s.$ref.replace('#/$defs/', '')], v, at);
  const errs = [];
  if ('const' in s && JSON.stringify(s.const) !== JSON.stringify(v)) errs.push(`${at}: const`);
  if (s.enum && !s.enum.some(e => JSON.stringify(e) === JSON.stringify(v))) errs.push(`${at}: enum`);
  if (s.type) {
    const t = typeOf(v), want = [].concat(s.type);
    if (!want.some(w => w === t || (w === 'number' && t === 'integer'))) errs.push(`${at}: type ${t}`);
  }
  if (s.oneOf) {
    const ok = s.oneOf.filter(o => validate(o, v, at).length === 0).length;
    if (ok !== 1) errs.push(`${at}: oneOf matched ${ok}`);
  }
  if (typeof v === 'string' && s.pattern && !new RegExp(s.pattern, 'u').test(v)) errs.push(`${at}: pattern`);
  if (typeof v === 'number') {
    if ('minimum' in s && v < s.minimum) errs.push(`${at}: minimum`);
    if ('maximum' in s && v > s.maximum) errs.push(`${at}: maximum`);
  }
  if (Array.isArray(v)) {
    if ('minItems' in s && v.length < s.minItems) errs.push(`${at}: minItems`);
    if ('maxItems' in s && v.length > s.maxItems) errs.push(`${at}: maxItems`);
    const pre = s.prefixItems || [];
    v.forEach((x, i) => {
      const sub = pre[i] || s.items;
      if (sub) errs.push(...validate(sub, x, `${at}[${i}]`));
    });
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const r of s.required || []) if (!(r in v)) errs.push(`${at}: missing ${r}`);
    for (const [k, x] of Object.entries(v)) {
      if (s.properties?.[k]) errs.push(...validate(s.properties[k], x, `${at}.${k}`));
      else if (s.additionalProperties === false) errs.push(`${at}: unexpected ${k}`);
    }
  }
  return errs;
}
const clone = v => JSON.parse(JSON.stringify(v));

test('worked example (L2-three-cycles-carry) is valid WIR v0.2', () => {
  assert.deepEqual(validate(schema, example), []);
});

test('phases must be all eight, in canonical order, at their star angles', () => {
  const swapped = clone(example);
  const ph = swapped.lineages[0].phases;
  [ph[1], ph[2]] = [ph[2], ph[1]];
  assert.ok(validate(schema, swapped).length > 0, 'reordered phases rejected');
  const short = clone(example); short.lineages[0].phases.pop();
  assert.ok(validate(schema, short).some(e => e.includes('minItems')));
  const tilted = clone(example); tilted.lineages[0].phases[3].angle = 90;
  assert.ok(validate(schema, tilted).length > 0, 'wrong ray angle rejected');
});

test('Withness is the center, never a ninth phase slot', () => {
  const nine = clone(example);
  nine.lineages[0].phases.push({ index: 9, phase: 'withness', angle: 360, implicit: false, effects: [], body: [] });
  assert.ok(validate(schema, nine).some(e => e.includes('maxItems')));
});

test('IR cannot smuggle host code or unknown instructions', () => {
  const evil = clone(example);
  evil.lineages[0].phases[0].body.push({ op: 'eval', src: 'require("fs")' });
  assert.ok(validate(schema, evil).length > 0);
  const badCap = clone(example);
  badCap.lineages[0].phases[0].body.push({ op: 'bridge', dst: '%9', capability: 'python', args: [] });
  assert.ok(validate(schema, badCap).length > 0, 'capability must be provider.operation');
});

test('runic and Kelyran names are valid identifiers in IR', () => {
  const runic = clone(example);
  runic.lineages[0].seeds[0].name = 'ᚠehu';
  runic.lineages[0].phases[7].body[3].name = 'varutóra';
  assert.deepEqual(validate(schema, runic), []);
});
