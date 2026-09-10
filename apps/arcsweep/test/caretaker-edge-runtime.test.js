import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const source = fs.readFileSync(path.join(root, 'supabase/functions/arcsweep-caretaker/index.ts'), 'utf8');

test('Caretaker Edge is an authenticated portable inference service, not a new authority plane', () => {
  assert.match(source, /ArcSweep Caretaker/);
  assert.match(source, /house intelligence/);
  assert.match(source, /You are not a Flame/);
  assert.match(source, /OPENROUTER_API_KEY/);
  assert.match(source, /z-ai\/glm-5\.3-flash/);
  assert.match(source, /supabase-edge-to-openrouter/);
  assert.match(source, /createClient/);
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /DEFAULT_STEWARD_USER_SHA256/);
});

test('Caretaker Edge admits only the two canonical browser origins and handles preflight before auth', () => {
  assert.match(source, /https:\/\/singsenochian\.github\.io/);
  assert.match(source, /https:\/\/flameclyffe\.vercel\.app/);
  assert.match(source, /request\.method === "OPTIONS"[\s\S]{0,120}status: 204/);
  assert.match(source, /access-control-allow-headers/);
  assert.match(source, /authorization, content-type/);
  assert.match(source, /browserOriginAllowed/);
});

test('Caretaker Edge cannot widen runtime authority beyond navigation', () => {
  assert.match(source, /only executable Caretaker action currently permitted is navigate/i);
  assert.match(source, /allowed_actions: \["navigate"\]/);
  assert.doesNotMatch(source, /allowed_actions:\s*\[[^\]]*(?:world\.activate|git\.commit|shell\.exec|filesystem\.write)/);
  assert.doesNotMatch(source, /"type"\s*:\s*"(?:world\.activate|git\.commit|shell\.exec|filesystem\.write)"/);
});
