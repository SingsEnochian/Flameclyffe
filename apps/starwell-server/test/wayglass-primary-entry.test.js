'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {selectPrimaryApplicationUrl} = require('../electron/application-entry.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass installed entry '));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  function write(relative, content = '<!doctype html><title>Captured staged entry</title>') {
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), {recursive:true});
    fs.writeFileSync(filename, content);
  }
  return {root,write};
}
function tree(root) {
  const result = {};
  function visit(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      const key = path.join(relative, entry.name), filename = path.join(directory, entry.name);
      if (entry.isDirectory()) { result[key] = 'directory';visit(filename,key); }
      else result[key] = fs.readFileSync(filename, 'utf8');
    }
  }
  visit(root);return result;
}

// Acceptance: installed launch selects actual staged Wayglass first, retains
// both legacy fallbacks, stays at the configured loopback port, and merely
// inspects entry existence without changing configuration or runtime files.
test('installed launch prefers staged Wayglass when both application entries exist', t => {
  const f = fixture(t);
  f.write('public/starwell/index.html');
  f.write('public/wayglass/index.html');
  assert.equal(selectPrimaryApplicationUrl(f.root), 'http://localhost:3841/wayglass/');
});
test('installed launch retains STARWELL fallback when Wayglass has no staged index', t => {
  const f = fixture(t);
  f.write('public/starwell/index.html');
  f.write('public/wayglass/assets/body.js', '/* staged asset without an entry */');
  assert.equal(selectPrimaryApplicationUrl(f.root), 'http://localhost:3841/starwell/');
});
test('installed launch retains Hearthgate fallback without either staged application', t => {
  const f = fixture(t);
  f.write('public/hearthgate.html');
  f.write('public/wayglass/README.txt', 'A directory alone is not a staged application entry.');
  assert.equal(selectPrimaryApplicationUrl(f.root), 'http://localhost:3841/hearthgate.html');
});
test('installed launch uses the selected loopback port and does not change staged files or configuration', t => {
  const f = fixture(t);
  f.write('public/wayglass/index.html');
  f.write('private/hearthgate-config.json', '{"name":"Untouched captured configuration"}');
  const before = tree(f.root), inspected = [];
  const result = selectPrimaryApplicationUrl(f.root, 5186, filename => {
    inspected.push(path.relative(f.root, filename));
    return fs.existsSync(filename);
  });
  assert.equal(result, 'http://localhost:5186/wayglass/');
  assert.deepEqual(inspected, [path.join('public','wayglass','index.html')]);
  assert.deepEqual(tree(f.root), before);
});
test('invalid root and ports reject before checking staged entries', () => {
  let checks = 0;
  const exists = () => { checks++;return true; };
  for (const root of [undefined,null,'',42]) assert.throws(() => selectPrimaryApplicationUrl(root,3841,exists), TypeError);
  for (const port of [0,-1,65536,3.5,NaN,Infinity,'3841']) assert.throws(() => selectPrimaryApplicationUrl('/captured-root',port,exists), RangeError);
  assert.equal(checks,0);
});
