import { IPadSomaticHapticSession } from './ipad-somatic-haptics.js';
import { readIPadSomaticLineage } from './ipad-somatic-lineage.js';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function invariant(condition, message) {
  if (!condition) throw new Error(`IPAD_SOMATIC_BINDING: ${message}`);
}

export class BoundIPadSomaticHapticSession extends IPadSomaticHapticSession {
  constructor({
    lineageStorage = globalThis.localStorage,
    lineageReader = readIPadSomaticLineage,
    ...options
  } = {}) {
    super(options);
    this.lineageStorage = lineageStorage;
    this.lineageReader = lineageReader;
  }

  readCurrentLineage() {
    invariant(this.candidate?.world_id, 'load a candidate before resolving Bifröst lineage');
    return this.lineageReader({
      storage: this.lineageStorage,
      worldId: this.candidate.world_id,
    });
  }

  async audition(options = {}) {
    const lineage = this.readCurrentLineage();
    const receipt = await super.audition(options);
    const boundReceipt = deepFreeze({
      ...receipt,
      source_lineage: lineage,
      source_state_fingerprint: lineage.shared_state_fingerprint,
      compression_release_receipt_id: lineage.compression_release_receipt_id,
      compression_cycle: lineage.compression_cycle,
      next_operation: lineage.next_operation,
    });
    this.auditionReceipt = boundReceipt;
    return boundReceipt;
  }

  assertLineageStillCurrent() {
    invariant(this.completedAudition?.source_lineage, 'completed audition lacks Bifröst lineage');
    const current = this.readCurrentLineage();
    const audition = this.completedAudition.source_lineage;
    invariant(
      current.dual_aspect_packet_fingerprint === audition.dual_aspect_packet_fingerprint,
      'active DualAspectPacket changed after the somatic audition',
    );
    invariant(
      current.shared_state_fingerprint === audition.shared_state_fingerprint,
      'active shared state changed after the somatic audition',
    );
    invariant(
      current.compression_release_receipt_id === audition.compression_release_receipt_id,
      'active compression-release cycle changed after the somatic audition',
    );
    return current;
  }

  async decide(options = {}) {
    this.assertLineageStillCurrent();
    return super.decide(options);
  }
}
