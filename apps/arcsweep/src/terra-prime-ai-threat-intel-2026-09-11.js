import { ingestTerraPrimeCurrent } from './terra-prime-current-ingest.js';

export const TERRA_PRIME_AI_THREAT_INTEL_UPDATE_ID = 'terra-prime-ai-threat-intel-2026-09-11';
export const TERRA_PRIME_AI_THREAT_INTEL_SCHEMA = 'arcsweep.terra-prime-ai-threat-intel-update/v1';

const SOURCE_DATE_ANCHOR = '2026-09-10T00:00:00.000Z';
const EVENT_STALE_AFTER_SECONDS = 172800;

const SOURCE_TIME_NOTE =
  'Source exposes a publication date but not a reliable publication time in the captured primary page; observed_at is normalized to the UTC day boundary.';

export function buildTerraPrimeAiThreatIntelUpdate({
  receivedAt = new Date().toISOString(),
} = {}) {
  const commonProvenance = Object.freeze({
    update_id: TERRA_PRIME_AI_THREAT_INTEL_UPDATE_ID,
    ingest_schema: TERRA_PRIME_AI_THREAT_INTEL_SCHEMA,
    steward: 'rowan:vee',
    captured_on: '2026-09-11',
    source_time_note: SOURCE_TIME_NOTE,
    provenance_rule: 'primary-source-first; secondary-source-for-context; preserve-claim-boundaries',
  });

  const threatReport = ingestTerraPrimeCurrent({
    observationId: 'anthropic-threat-intelligence-2026-09-10',
    family: 'ai-language-pattern',
    source: {
      id: 'anthropic-threat-intelligence-september-2026',
      authority: 'primary-source',
      publisher: 'Anthropic',
      title: 'Detecting and countering misuse of AI: September 2026',
      url: 'https://www.anthropic.com/threat-intelligence-report-september-2026',
    },
    observedAt: SOURCE_DATE_ANCHOR,
    receivedAt,
    staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
    classification: 'threat-intelligence-report',
    payload: {
      event_date: '2026-09-10',
      coverage_period: '2025-12 through 2026-08',
      harm_areas: [
        'cyber operations',
        'influence operations',
        'surveillance',
        'scams and fraud',
        'biological misuse',
        'conventional weapons development',
        'illicit distillation',
      ],
      key_findings: [
        'Anthropic reports disrupting malicious or policy-violating Claude use across seven harm areas.',
        'Reported surveillance cases include state-aligned, state-linked, and commercial actors using Claude to build or operate systems targeting dissidents, activists, journalists, political figures, and other monitored populations.',
        'Anthropic reports AI-assisted cyber operations increasingly using agentic workflows for reconnaissance, exploitation, persistence, data processing, exfiltration, and automated adaptation to defensive detection.',
        'Anthropic reports conventional-weapons misuse cases involving software for guided weapons, electronic warfare, targeting, and control systems; the report does not establish successful fielding for every described effort.',
        'Anthropic reports unauthorized model-distillation campaigns, including Moonshot forwarding some customer requests to Claude and saving at least a portion of exchanges for capability extraction.',
        'The distillation section raises provenance and privacy concerns because third-party users may believe one model handled a request when another provider actually produced the response.',
      ],
      epistemic_status: 'provider-reported threat intelligence; preserve provider attribution and stated confidence levels',
    },
    provenance: {
      ...commonProvenance,
      primary_url: 'https://www.anthropic.com/threat-intelligence-report-september-2026',
      corroborating_sources: [
        'https://www.reuters.com/legal/litigation/anthropic-disrupts-russian-chinese-ai-campaigns-targeting-its-claude-models-2026-09-10/',
        'https://apnews.com/article/00266dca90e4f8853f669648998d3bda',
      ],
    },
  });

  const capabilityEval = ingestTerraPrimeCurrent({
    observationId: 'anthropic-intelligence-weapons-evals-2026-09-10',
    family: 'science',
    source: {
      id: 'anthropic-frontier-red-team-intelligence-weapons-evals',
      authority: 'primary-source',
      publisher: 'Anthropic',
      title: 'Measuring tactical intelligence targeting and conventional weapons capabilities of AI models',
      url: 'https://www.anthropic.com/research/intelligence-targeting-conventional-weapons-capabilities',
    },
    observedAt: SOURCE_DATE_ANCHOR,
    receivedAt,
    staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
    classification: 'capability-evaluation',
    payload: {
      event_date: '2026-09-10',
      evaluation_domains: ['tactical intelligence targeting', 'conventional weapons development'],
      key_findings: [
        'Anthropic reports that frontier models can perform some simulated military and intelligence tasks that historically required scarce, highly trained human experts.',
        'Anthropic reports consistent model progress on simulated targeting and weapons-development tasks.',
        'The report frames model-side safeguards and classifiers as necessary controls because capability alone can materially uplift misuse.',
        'Anthropic reports that tested PRC open-weights models remain behind the frontier while still showing concerning capability in target identification and weapon-performance improvement.',
      ],
      epistemic_status: 'provider-authored evaluation; capability evidence is task-specific and should not be generalized beyond measured domains',
    },
    provenance: {
      ...commonProvenance,
      primary_url: 'https://www.anthropic.com/research/intelligence-targeting-conventional-weapons-capabilities',
    },
  });

  const governanceSignal = ingestTerraPrimeCurrent({
    observationId: 'frontier-ai-governance-pressure-2026-09-09-10',
    family: 'human-world',
    source: {
      id: 'ap-reuters-frontier-ai-governance-2026-09',
      authority: 'secondary-news-synthesis',
      publishers: ['Associated Press', 'Reuters'],
    },
    observedAt: SOURCE_DATE_ANCHOR,
    receivedAt,
    staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
    classification: 'governance-signal',
    payload: {
      event_window: '2026-09-09 through 2026-09-10',
      key_findings: [
        'Jacob Coxon publicly resigned from Anthropic while arguing that competitive pressure is outrunning safety practice at frontier labs.',
        'Public and legislative scrutiny increased around frontier-model autonomy, independent evaluation, auditing, and safety obligations.',
        'The policy signal is not a settled regulatory outcome; it is evidence of rising governance pressure around frontier capability and control.',
      ],
      epistemic_status: 'reported public statements and policy response; legislation and regulatory outcomes remain contingent',
    },
    provenance: {
      ...commonProvenance,
      sources: [
        'https://apnews.com/article/2ed549e07f2f941600a135070487d83d',
        'https://www.reuters.com/business/openai-faces-senate-probe-into-hugging-face-incident-axios-reports-2026-09-10/',
      ],
    },
  });

  const architectureImplication = ingestTerraPrimeCurrent({
    observationId: 'arcsweep-future-proof-provenance-implication-2026-09-11',
    family: 'project-observation',
    source: {
      id: 'rowan-vee-terra-prime-analysis',
      authority: 'project-analysis',
      label: 'Terra Prime future-facing architecture implication',
    },
    observedAt: receivedAt,
    receivedAt,
    staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
    classification: 'architecture-implication',
    payload: {
      trigger_receipts: [
        'terra-prime:anthropic-threat-intelligence-2026-09-10',
        'terra-prime:anthropic-intelligence-weapons-evals-2026-09-10',
        'terra-prime:frontier-ai-governance-pressure-2026-09-09-10',
      ],
      design_requirements: [
        'Every model answer should carry authenticated producer identity where available, not only the user-facing model label.',
        'Cross-provider routing should record route history, provider boundaries, and whether user content left the expected provider context.',
        'Receipts should distinguish model identity, router identity, tool identity, and final presenter identity.',
        'Sensitive-data transfer and hidden subcontracting should be visible to policy gates and provenance review.',
        'Capability-sensitive workflows should combine model-side safeguards with independent Observer receipts and DEEP routing rather than relying on a single refusal layer.',
        'Corrections must supersede earlier interpretations without rewriting historical receipts.',
      ],
      arc_note: 'Build for a future in which capable models are ordinary infrastructure, multi-model routing is common, and provenance itself becomes a safety control.',
      status: 'adopt-as-forward-architecture-requirement',
    },
    provenance: {
      ...commonProvenance,
      derived_from: [
        'anthropic-threat-intelligence-2026-09-10',
        'anthropic-intelligence-weapons-evals-2026-09-10',
        'frontier-ai-governance-pressure-2026-09-09-10',
      ],
    },
  });

  return Object.freeze([threatReport, capabilityEval, governanceSignal, architectureImplication]);
}
