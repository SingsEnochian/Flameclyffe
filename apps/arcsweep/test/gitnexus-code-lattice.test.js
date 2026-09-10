import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const wrapper = fs.readFileSync(path.join(root, 'scripts/gitnexus-code-lattice.mjs'), 'utf8');
const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
const design = fs.readFileSync(path.join(root, 'docs/architecture/GITNEXUS_CODE_LATTICE_v0.1.md'), 'utf8');

test('Code Lattice exposes repeatable local GitNexus commands without adding a package dependency', () => {
  assert.equal(pkg.scripts['code-lattice:analyze'], 'node scripts/gitnexus-code-lattice.mjs analyze');
  assert.equal(pkg.scripts['code-lattice:analyze:pdg'], 'node scripts/gitnexus-code-lattice.mjs analyze-pdg');
  assert.equal(pkg.scripts['code-lattice:status'], 'node scripts/gitnexus-code-lattice.mjs status');
  assert.equal(pkg.scripts['code-lattice:setup:codex'], 'node scripts/gitnexus-code-lattice.mjs setup-codex');
  assert.equal(pkg.dependencies?.gitnexus, undefined);
  assert.equal(pkg.devDependencies?.gitnexus, undefined);
});

test('Code Lattice preserves project instruction authority and keeps generated state local', () => {
  assert.match(wrapper, /--skip-agents-md/);
  assert.match(wrapper, /--pdg/);
  assert.match(gitignore, /^\.gitnexus\/$/m);
  assert.match(gitignore, /^\.claude\/skills\/gitnexus-\*\/$/m);
  assert.match(gitignore, /^\.agents\/skills\/gitnexus-\*\/$/m);
});

test('Code Lattice v0.1 is read-only by design and does not claim a completed graph proof', () => {
  assert.match(design, /\*\*Status:\*\* SPECIFIED/);
  assert.match(design, /No mutating GitNexus tool is granted to the Caretaker in v0\.1/);
  assert.match(design, /Passing this experiment promotes Code Lattice to \*\*FUNCTIONAL \(developer instrument\)\*\*/);
  assert.match(design, /route_map/);
  assert.match(design, /impact/);
  assert.match(design, /trace/);
});
