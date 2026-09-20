import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  VALA_STREAM_SCHEMA,
  VALA_WORK_PROJECT_REF,
  VALA_WORK_URL,
  numericCoordinates,
  normaliseValaFrame,
} from '../src/vala-stream-adapter.js';

const migrationUrl = new URL('../../../supabase/vala-work/migrations/20260920_init_matrix_stream.sql', import.meta.url);

test('Vala adapter remains pinned to the Vala Work project', () => {
  assert.equal(VALA_STREAM_SCHEMA, 'arcsweep.vala-matrix-stream/v1');
  assert.equal(VALA_WORK_PROJECT_REF, 'frqrxmshxftpylwdtsdm');
  assert.match(VALA_WORK_URL, /^https:\/\/frqrxmshxftpylwdtsdm\.supabase\.co$/);
});

test('matrix frames normalise into the ArcSweep contract', () => {
  assert.deepEqual(
    normaliseValaFrame({
      id: '7',
      step: 11,
      timestamp: 123.5,
      created_at: '2026-09-20T00:00:00Z',
      raw_coordinates: { x: 4 },
      projected_coordinates: [1, 2, 3],
    }),
    {
      schema: 'arcsweep.vala-matrix-stream/v1',
      id: 7,
      step: 11,
      timestamp: 123.5,
      created_at: '2026-09-20T00:00:00Z',
      raw_coordinates: { x: 4 },
      projected_coordinates: [1, 2, 3],
    },
  );
  assert.equal(normaliseValaFrame({ id: 'nope', step: 1, timestamp: 1 }), null);
});

test('spectrometer coordinate extraction handles arrays and keyed tensors', () => {
  assert.deepEqual(numericCoordinates([1, { y: 2, nested: [3, 'skip'] }, null]), [1, 2, 3]);
});

test('Vala migration is read-only for browser roles and Realtime-enabled', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /create table if not exists public\.matrix_stream/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke insert, update, delete .* from anon, authenticated/i);
  assert.match(sql, /grant select .* to anon, authenticated/i);
  assert.match(sql, /supabase_realtime/i);
  assert.match(sql, /project ref frqrxmshxftpylwdtsdm/i);
});
