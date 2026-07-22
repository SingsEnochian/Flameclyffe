# Hearthfire Agent Pattern Adaptations

Status: DESIGN RECEIPT
Date: 2026-07-22

Hearthfire remains provider-neutral and local-first. The following public repositories informed architectural patterns in the agent fleet. No external framework is adopted as the canonical runtime merely because an example uses it.

## Shubhamsaboo/awesome-llm-apps

Repository: https://github.com/Shubhamsaboo/awesome-llm-apps
Root licence at review time: Apache-2.0

Patterns adapted conceptually:

- deterministic collection and normalisation remain ordinary utilities rather than decorative LLM agents;
- specialist routing exposes only the tools required for a task;
- trust gates precede execution;
- agent actions produce a tamper-evident hash chain stored outside the agent's own memory;
- dependency release monitoring defaults to dry-run and explicit delivery or approval;
- failure incidents are classified into reusable structural patterns;
- self-improvement uses fixed evaluations, one mutation at a time, automatic rollback on regression, and human approval before enablement;
- knowledge-graph retrieval preserves multi-hop paths and source attribution;
- Steward decisions are rendered as explicit options rather than inferred consent.

Hearthfire-specific modifications:

- trust is represented by explicit contract axes and gate results, not a decorative aggregate score;
- Rowan is the final Product Steward for production changes, source promotion, permissions, privacy, schemas, canon, and self-update acceptance;
- Boxfire owns QA and may block a release but may not approve its own mutation;
- measurement, derived model, interpretation, symbolism, and narrative remain distinct epistemic registers;
- every world has a partitioned dataset, and cross-world bridges require explicit reviewed edges;
- J-space is the sparse active workspace for the present query or experiment;
- the 03:00 America/New_York run publishes evidence and proposals, not unattended code changes.

Relevant upstream examples reviewed:

- `advanced_ai_agents/multi_agent_apps/devpulse_ai/`
- `advanced_ai_agents/multi_agent_apps/trust_gated_agent_team/`
- `always_on_agents/release_radar_agent/`
- `agent_skills/self-improving-agent-skills/`
- `rag_tutorials/knowledge_graph_rag_citations/`
- `rag_tutorials/rag_failure_diagnostics_clinic/`
- `mcp_ai_agents/multi_mcp_agent_router/`

No code has been copied verbatim into the files listed below. The implementations are new Node-based Hearthfire components designed around existing project contracts:

- `agents/constellation-router.json`
- `agents/failure-clinic-taxonomy.json`
- `agents/self-improvement-policy.json`
- `scripts/agents/run-trust-gate.mjs`
- `scripts/agents/run-release-radar.mjs`
- `scripts/agents/classify-failure.mjs`

Should upstream code later be incorporated, its licence, notices, modifications, source path, version, and checksum must be recorded before merge.
