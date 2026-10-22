import test from 'node:test';
import assert from 'node:assert/strict';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerRunaService } from '../src/os/runa-service.js';

const MIRA = Object.freeze({
  id: 'kel-mira',
  lemma: 'mira',
  romanization: 'mira',
  pronunciation: 'MEE-rah',
  syllables: ['mi', 'ra'],
  stress: { primarySyllable: 1, indexBase: 1 },
  script: '',
  scriptStatus: 'pending-runic-expression',
});

class FakeUtterance {
  constructor(value) {
    this.text = value;
    this.lang = '';
    this.pitch = 1;
    this.rate = 1;
    this.volume = 1;
  }
}

test('Runa prepares and explicitly launches Audible Glyph pronunciation-plus-contour playback without canon mutation', async () => {
  const registry = createCapabilityRegistry();
  const spoken = [];
  const before = JSON.stringify(MIRA);

  registerRunaService(registry, {
    speechSynthesisProvider: () => ({ speak: (utterance) => spoken.push({ ...utterance }) }),
    utteranceProvider: () => FakeUtterance,
    now: () => new Date('2026-10-02T13:15:00.000Z'),
  });

  assert.ok(registry.getCapability('runa.audible-glyph.prepare'));
  assert.ok(registry.getCapability('runa.audible-glyph.play'));

  const prepared = await registry.invoke(
    'runa.audible-glyph.prepare',
    { lexeme: MIRA, contour: 'rising' },
    { authority: 'read', actor_id: 'guide:test' },
  );

  assert.equal(prepared.status, 'applied');
  assert.equal(prepared.output.lexeme_id, 'kel-mira');
  assert.equal(prepared.output.contour, 'rising');
  assert.equal(prepared.output.authority.mutates_canonical_strokes, false);
  assert.equal(JSON.stringify(MIRA), before);

  const blocked = await registry.invoke(
    'runa.audible-glyph.play',
    { cue: prepared.output },
    { authority: 'operate', actor_id: 'human:test' },
  );
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.reason, 'confirmation-required');
  assert.equal(spoken.length, 0);

  const played = await registry.invoke(
    'runa.audible-glyph.play',
    { cue: prepared.output },
    { authority: 'operate', actor_id: 'human:test', confirmed: true },
  );

  assert.equal(played.status, 'applied');
  assert.equal(played.output.canonical_mutation, false);
  assert.equal(played.output.segments_scheduled, 2);
  assert.deepEqual(spoken.map((item) => item.text), ['MEE', 'rah']);
  assert.ok(spoken[0].pitch < spoken[1].pitch);
  assert.equal(JSON.stringify(MIRA), before);
});
