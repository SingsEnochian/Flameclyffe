import {
  ADMISSION_STATES,
  MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA,
} from './mythframe-federation.js';

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return `sha256:${bytesToHex(digest)}`;
}

export async function reviewMythframeTranslationCapsule(capsule, {
  targetAdmissionState,
  reviewedBy = 'Rowan',
  reviewNote = '',
} = {}, {
  clock = () => new Date(),
  idFactory = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
} = {}) {
  if (capsule?.schema !== MYTHFRAME_TRANSLATION_CAPSULE_SCHEMA) throw new Error('A valid Mythframe Translation Capsule is required.');
  if (!ADMISSION_STATES.includes(targetAdmissionState)) throw new Error('targetAdmissionState is unsupported.');
  if (targetAdmissionState === 'unreviewed') throw new Error('Target review must make an explicit admission decision.');
  const reviewer = String(reviewedBy || '').trim();
  if (!reviewer) throw new Error('reviewedBy is required.');
  const revised = {
    ...structuredClone(capsule),
    capsule_revision_id: `mythframe-capsule-review-${idFactory()}`,
    parent_capsule_fingerprint: capsule.capsule_fingerprint,
    target_admission_state: targetAdmissionState,
    target_review: {
      reviewed_at: clock().toISOString(),
      reviewed_by: reviewer.slice(0, 160),
      decision: targetAdmissionState,
      note: String(reviewNote || '').trim().slice(0, 4000) || null,
    },
    authority: {
      ...structuredClone(capsule.authority || {}),
      target_admission_independent: true,
      relation_admission: ['relation_accepted', 'local_adoption_accepted'].includes(targetAdmissionState),
      continuity_admission: targetAdmissionState === 'local_adoption_accepted',
      canon_admission: false,
      ambient_context: false,
    },
  };
  delete revised.capsule_fingerprint;
  revised.capsule_fingerprint = await sha256(JSON.stringify(revised));
  return Object.freeze(revised);
}
