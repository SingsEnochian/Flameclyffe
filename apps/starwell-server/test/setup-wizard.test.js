'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const wizardPath = path.join(__dirname, '..', 'public', 'setup-wizard.html');
const wizard = fs.readFileSync(wizardPath, 'utf8');

test('setup wizard exposes Hugging Face as a first-class inference provider', () => {
  assert.match(wizard, /id="key-huggingface"/);
  assert.match(wizard, /Hugging Face inference token/);
  assert.match(wizard, /Inference Providers permission/);
});

test('Hugging Face setup field is stored through the protected HF_TOKEN custom-provider path', () => {
  assert.match(wizard, /document\.getElementById\('key-huggingface'\)\.value\.trim\(\)/);
  assert.match(wizard, /entry\.name === 'HF_TOKEN'/);
  assert.match(wizard, /customFields\.push\(\{ name: 'HF_TOKEN', value: huggingFaceToken \}\)/);
});
