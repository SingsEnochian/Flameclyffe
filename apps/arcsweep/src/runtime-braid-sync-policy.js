import { SYNC_STREAM, mergePolicyFor } from '../../starwell/src/bifrost-sync/contracts.js';

const BRAID_EVENT_STREAM = Object.freeze({
  'observation-receipted': SYNC_STREAM.RECEIPT,
  'review-accepted': SYNC_STREAM.RECEIPT,
  'review-archived': SYNC_STREAM.RECEIPT,
  'review-discarded': SYNC_STREAM.RECEIPT,
  'deeptime-admitted': SYNC_STREAM.RECEIPT,
});

export function runtimeBraidSyncClass(value = {}) {
  if (value.schema === 'hearthgate.runtime-braid-event/v1') {
    const stream = BRAID_EVENT_STREAM[value.event_type] || SYNC_STREAM.RECEIPT;
    return Object.freeze({
      stream,
      policy: mergePolicyFor(stream),
      appendOnly: true,
      silentMergeAllowed: false,
    });
  }

  if (value.schema === 'hearthgate.runtime-braid-packet/v1') {
    const stream = SYNC_STREAM.STATE;
    return Object.freeze({
      stream,
      policy: mergePolicyFor(stream),
      appendOnly: false,
      silentMergeAllowed: false,
    });
  }

  throw new TypeError(`Unsupported House Runtime braid schema: ${value.schema || '<missing>'}`);
}

export function bifrostDomainPolicy(stream) {
  const policy = mergePolicyFor(stream);
  return Object.freeze({
    stream,
    policy,
    requiresExplicitConflict: policy === 'EXPLICIT_CONFLICT',
    appendOnly: policy === 'APPEND_ONLY',
    lastWriteWins: policy === 'LAST_WRITE_WINS',
  });
}

export const HOUSE_RUNTIME_BIFROST_POLICY = Object.freeze({
  transport: 'house-runtime-braid',
  duplicateSupabaseEnvelopeTable: false,
  eventStream: SYNC_STREAM.RECEIPT,
  packetStream: SYNC_STREAM.STATE,
  canon: bifrostDomainPolicy(SYNC_STREAM.CANON),
  settings: bifrostDomainPolicy(SYNC_STREAM.SETTINGS),
});
