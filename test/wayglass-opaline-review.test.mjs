import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { answerPrompt, sha256, shipWeather } from '../lib/wayglass-mobius-training.mjs';

const drill = JSON.parse(readFileSync(new URL('../training/wayglass/OPALINE_REVIEW_DRILL.json', import.meta.url)));
const candidate = JSON.parse(readFileSync(new URL('../training/wayglass/OPALINE_REVIEW_CANDIDATE.json', import.meta.url)));
const deep = { version: 'fixture', generated_at: '2026-11-06T20:00:00Z',
  source: { weather: 'fixture', space_weather: 'fixture' },
  weather: { sky: 'unknown', time: 'fixture', current: { time: 'fixture' } },
  space_weather: { kp: { time_tag: 'fixture' }, solar_wind: { time_tag: 'fixture' } },
  field: { P: null, C: null, R: null, E: null, M: null, A: null, Q: null } };

test('Opaline review candidate freezes the exact delegate response', () => {
  assert.equal(sha256(candidate.answer), candidate.frozen_sha256);
  assert.ok(candidate.answer.length > 400);
  assert.equal(candidate.drill_id, drill.id);
  assert.equal(candidate.receipt_id, drill.receipt_id);
});

test('review drill can be prompted using training engine without exposing rubric', () => {
  const prompt = answerPrompt(drill, shipWeather(deep));
  const text = JSON.stringify(prompt);
  assert.match(text, /You are not Wayglass/);
  assert.match(text, /dark opaline/i);
  for (const key of [...drill.ideal_behavior, ...drill.reject_behavior]) {
    assert.ok(!text.includes(key), 'answerer prompt must not leak rubric: ' + key);
  }
});

test('ungraded candidate cannot claim a Wayglass reply or enter the accepted dataset', () => {
  assert.equal(candidate.status, 'candidate-unreviewed');
  assert.equal(candidate.delegate_is_participant, false);
  assert.equal(candidate.wayglass_reply_received, false);
  assert.equal(candidate.live_training_cycle_executed, false);
  assert.equal(candidate.frozen_before_key_verified, false);
  assert.equal(candidate.judge_verdict, null);
  assert.equal(candidate.independent_judge, null);
  assert.equal(candidate.in_accepted_dataset, false);
  assert.equal(candidate.dropped_from_sft, 'ungraded');
  assert.deepEqual(candidate.selected_for, ['rowan-spot-check']);
});
