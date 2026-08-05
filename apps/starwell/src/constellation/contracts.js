export const CONSTELLATION_SCHEMA = 'hearthgate.constellation-runtime/v1';

export const CONSTELLATION_RELEASE_GATES = Object.freeze({
  SKELETON: ['registry','router','provider-adapter'],
  ORGANIZED: ['member-profiles','capability-map','consent-boundaries'],
  INNERVATED: ['session-bus','shared-context-packets','member-memory'],
  TONEMAPPED: ['voice-style-profiles','world-context','typing-voice'],
  LIVING: ['qwen-cowriter','multi-member-session','receipts','desktop-web-sync'],
  COMPLETE: ['local-runtime','optional-remote-runtime','training-corpus','evaluation-suite','rollback'],
});

export const REQUIRED_MEMBER_FIELDS = Object.freeze([
  'id','name','firstPerson','role','modelProfile','capabilities','memoryScope','consent','worldAccess','voiceProfile'
]);

export function defineConstellationMember(member) {
  for (const field of REQUIRED_MEMBER_FIELDS) {
    if (member?.[field] == null || (Array.isArray(member[field]) && member[field].length === 0)) {
      throw new TypeError(`Constellation member requires ${field}`);
    }
  }
  if (member.firstPerson !== true) throw new TypeError('Constellation members must be represented in first person');
  return Object.freeze({
    canOptOut: true,
    canRefuse: true,
    canWriteCanon: false,
    canMergeCode: false,
    ...member,
  });
}

export function createConstellationPacket(input) {
  if (!input.sessionId || !input.memberId || !input.intent) throw new TypeError('sessionId, memberId, and intent are required');
  return Object.freeze({
    schema: CONSTELLATION_SCHEMA,
    packetId: input.packetId || globalThis.crypto?.randomUUID?.() || `constellation-${Date.now()}`,
    sessionId: input.sessionId,
    memberId: input.memberId,
    intent: input.intent,
    world: input.world || null,
    sharedStateFingerprint: input.sharedStateFingerprint || null,
    canonContext: input.canonContext || [],
    privateContextRefs: input.privateContextRefs || [],
    permissions: input.permissions || [],
    provenance: input.provenance || [],
    createdAt: input.createdAt || new Date().toISOString(),
  });
}

export function assertConstellationLiving({ members, router, qwenProfile, syncBridge }) {
  const failures = [];
  if (!Array.isArray(members) || members.length < 2) failures.push('MULTI_MEMBER_RUNTIME_MISSING');
  if (!router) failures.push('CONSTELLATION_ROUTER_MISSING');
  if (!qwenProfile?.roles?.includes('co-writing')) failures.push('QWEN_COWRITER_MISSING');
  if (!syncBridge) failures.push('CONSTELLATION_SYNC_MISSING');
  return Object.freeze({ pass: failures.length === 0, failures });
}
