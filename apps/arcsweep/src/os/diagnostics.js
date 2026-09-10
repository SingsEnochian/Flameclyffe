function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function sourceFromMeta(meta) {
  const source = meta?.source;
  return typeof source === 'string' && source.trim() ? source.trim().slice(0, 120) : null;
}

function summarizeBoot(boot = {}) {
  return {
    schema: boot.schema || 'arcsweep.os-boot-state/v1',
    sequence: Number.isFinite(boot.sequence) ? boot.sequence : null,
    state: boot.state || null,
    previous_state: boot.previous_state || null,
    reason: typeof boot.reason === 'string' ? boot.reason.slice(0, 120) : null,
    changed_at: boot.changed_at || null,
  };
}

function summarizeSession(session = {}, featherPaused = false) {
  return {
    schema: session.schema || 'arcsweep.os-session/v1',
    session_id: session.session_id || null,
    active_world_id: session.active_world_id || null,
    active_project_id: session.active_project_id || null,
    active_scene_id: session.active_scene_id || null,
    active_document_id: session.active_document_id || null,
    active_room: session.active_room || null,
    presence_mode: session.presence_mode || null,
    feather_paused: Boolean(featherPaused || session.feather_paused),
    has_current_goal: Boolean(session.current_goal),
    started_at: session.started_at || null,
  };
}

function summarizeContext(context) {
  if (!context) return null;
  return {
    schema: context.schema || null,
    capsule_id: context.capsule_id || null,
    session_id: context.session_id || null,
    world_id: context.world_id || null,
    project_id: context.project_id || null,
    scene_id: context.scene_id || null,
    document_id: context.document_id || null,
    previous_room: context.previous_room || null,
    current_room: context.current_room || null,
    receipt_count: Array.isArray(context.receipt_ids) ? context.receipt_ids.length : 0,
    created_at: context.created_at || null,
  };
}

function summarizeEvent(receipt = {}) {
  return {
    event_id: receipt.event_id || null,
    sequence: Number.isFinite(receipt.sequence) ? receipt.sequence : null,
    name: receipt.name || null,
    source: sourceFromMeta(receipt.meta),
    emitted_at: receipt.emitted_at || null,
  };
}

function summarizeHealth(record = {}) {
  return {
    service_id: record.service_id || null,
    status: record.status || null,
    version: record.version || null,
    recoverable: record.recoverable !== false,
    repair_class: record.repair_class || null,
    observed_at: record.observed_at || null,
  };
}

function summarizeService(record = {}) {
  return {
    service_id: record.service_id || null,
    label: record.label || record.service_id || null,
    consumes: Array.isArray(record.consumes) ? [...record.consumes] : [],
    emits: Array.isArray(record.emits) ? [...record.emits] : [],
    registered_at: record.registered_at || null,
  };
}

function summarizeCapability(record = {}) {
  return {
    capability_id: record.capability_id || null,
    service_id: record.service_id || null,
    authority: record.authority || null,
    requires_confirmation: Boolean(record.requires_confirmation),
    registered_at: record.registered_at || null,
  };
}

function summarizeCapabilityReceipt(receipt = {}) {
  return {
    call_id: receipt.call_id || null,
    capability_id: receipt.capability_id || null,
    service_id: receipt.service_id || null,
    status: receipt.status || null,
    reason: receipt.reason || null,
    resolved_authority: receipt.resolved_authority || null,
    started_at: receipt.started_at || null,
    completed_at: receipt.completed_at || null,
  };
}

function summarizeTripwire(item = {}) {
  return {
    tripwire_id: item.tripwire_id || null,
    decision: item.decision || null,
    reason: item.reason || null,
    capability_id: item.capability_id || null,
    authority: item.authority || item.required_authority || null,
    observed_at: item.observed_at || item.created_at || null,
  };
}

function summarizeLease(item = {}) {
  return {
    lease_id: item.lease_id || null,
    authority: item.authority || null,
    capability_ids: Array.isArray(item.capability_ids) ? [...item.capability_ids] : [],
    single_use: Boolean(item.single_use),
    status: item.status || null,
    issued_at: item.issued_at || null,
    expires_at: item.expires_at || null,
    used_at: item.used_at || null,
    revoked_at: item.revoked_at || null,
  };
}

function summarizeRepair(item = {}) {
  return {
    repair_id: item.repair_id || null,
    fault_class: item.fault_class || null,
    service_id: item.service_id || null,
    repair_level: item.repair_level || null,
    action: item.action || null,
    result: item.result || null,
    reversible: item.reversible !== false,
    completed_at: item.completed_at || null,
  };
}

function summarizeStewardRecord(item = {}) {
  return {
    request_id: item.request_id || null,
    capability_id: item.capability_id || null,
    authority: item.authority || null,
    status: item.status || null,
    requested_at: item.requested_at || null,
    resolved_at: item.resolved_at || null,
    execution_status: item.execution?.status || null,
  };
}

function summarizeRepairBudget(budget = {}) {
  const attempts = budget?.attempts && typeof budget.attempts === 'object' ? budget.attempts : {};
  const services = budget?.service_repairs && typeof budget.service_repairs === 'object' ? budget.service_repairs : {};
  return {
    attempted_fault_count: Object.keys(attempts).length,
    automatic_attempt_count: Object.values(attempts).reduce((sum, value) => sum + (Number(value) || 0), 0),
    repaired_service_count: Object.keys(services).length,
    committed_repair_count: Object.values(services).reduce((sum, value) => sum + (Number(value) || 0), 0),
  };
}

export function createSafeDiagnostics({
  manifest,
  boot,
  session,
  activeContext,
  contextDepth = 0,
  contextPersistence = {},
  events = [],
  health = [],
  services = [],
  capabilities = [],
  guide = null,
  stewardPending = 0,
  stewardRecent = [],
  capabilityReceipts = [],
  securityTripwires = [],
  authorityLeases = [],
  repairReceipts = [],
  repairBudget = {},
  featherPaused = false,
  maxEvents = 32,
  capturedAt = new Date().toISOString(),
} = {}) {
  return Object.freeze(clone({
    schema: 'arcsweep.os-diagnostics/v1',
    manifest,
    boot: summarizeBoot(boot),
    session: summarizeSession(session, featherPaused),
    active_context: summarizeContext(activeContext),
    context_depth: Number(contextDepth) || 0,
    context_persistence: {
      available: Boolean(contextPersistence.available),
      restored: Boolean(contextPersistence.restored),
      storage_key: contextPersistence.storage_key || null,
    },
    recent_events: events.slice(-maxEvents).map(summarizeEvent),
    services: health.map(summarizeHealth),
    service_registry: services.map(summarizeService),
    capabilities: capabilities.map(summarizeCapability),
    guide: guide ? {
      actor_id: guide.actor_id || null,
      voice_id: guide.voice_id || null,
      allowed_capabilities: Array.isArray(guide.allowed_capabilities) ? clone(guide.allowed_capabilities) : [],
    } : null,
    steward_gate: {
      pending: Number(stewardPending) || 0,
      recent: stewardRecent.slice(-16).map(summarizeStewardRecord),
    },
    capability_receipts: capabilityReceipts.slice(-maxEvents).map(summarizeCapabilityReceipt),
    security_tripwires: securityTripwires.slice(-maxEvents).map(summarizeTripwire),
    authority_leases: authorityLeases.slice(-maxEvents).map(summarizeLease),
    repair_receipts: repairReceipts.slice(-maxEvents).map(summarizeRepair),
    repair_budget: summarizeRepairBudget(repairBudget),
    feather_paused: Boolean(featherPaused),
    captured_at: capturedAt,
  }));
}
