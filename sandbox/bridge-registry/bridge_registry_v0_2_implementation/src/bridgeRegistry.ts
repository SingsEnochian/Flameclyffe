import { z } from 'zod';

export const BridgeTypeSchema = z.enum([
  'Concordance',
  'Signal',
  'Play',
  'Technical',
  'Memory',
  'Hybrid',
]);

export const ConsentStateSchema = z.enum([
  'Dream',
  'Draft',
  'Invited',
  'Active',
  'Paused',
  'Archived',
  'Closed',
  'Revoked',
  'Dormant',
]);

export const BridgeStatusSchema = z.enum([
  'Working',
  'Canon Candidate',
  'Active',
  'Archived',
  'Needs Review',
]);

export const BridgeParticipantSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  lens: z.string().optional(),
  consent: z.string().optional(),
});

export const RelatedLogSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  url: z.string().url().optional(),
  note: z.string().optional(),
});

export const BridgeManifestSchema = z.object({
  bridge_slug: z.string().min(1),
  bridge_name: z.string().min(1),
  bridge_types: z.array(BridgeTypeSchema).min(1),
  consent_state: ConsentStateSchema.default('Draft'),
  status: BridgeStatusSchema.default('Working'),
  source_lens: z.string().optional(),
  destination_lens: z.string().optional(),
  participants: z.array(BridgeParticipantSchema).default([]),
  purpose: z.string().optional(),
  sovereignty_rule: z.string().optional(),
  memory_policy: z.string().optional(),
  signal_policy: z.string().optional(),
  pause_cues: z.array(z.string()).default([]),
  related_logs: z.array(RelatedLogSchema).default([]),
  facet_rule: z.string().optional(),
  road_rule: z.string().optional(),
  safety_rule: z.string().optional(),
  interpretation_stance: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  last_reviewed: z.string().optional(),
});

export type BridgeType = z.infer<typeof BridgeTypeSchema>;
export type ConsentState = z.infer<typeof ConsentStateSchema>;
export type BridgeStatus = z.infer<typeof BridgeStatusSchema>;
export type BridgeParticipant = z.infer<typeof BridgeParticipantSchema>;
export type RelatedLog = z.infer<typeof RelatedLogSchema>;
export type BridgeManifest = z.infer<typeof BridgeManifestSchema>;

export function validateBridgeManifest(input: unknown): BridgeManifest {
  return BridgeManifestSchema.parse(input);
}

export function canBridgeReceiveActivity(bridge: BridgeManifest): boolean {
  return bridge.consent_state === 'Active' || bridge.consent_state === 'Invited';
}

export function isBridgePausedOrClosed(bridge: BridgeManifest): boolean {
  return ['Paused', 'Archived', 'Closed', 'Revoked', 'Dormant'].includes(bridge.consent_state);
}
