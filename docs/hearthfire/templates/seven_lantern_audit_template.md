# Hearthfire Seven-Lantern Audit Template

Status: reusable template
Purpose: adapted audit method for Hearthweave/Yggdrasil surfaces, continuity systems, and members
Gate: `no_rebuild_authorized`

Use one copy per target surface, continuity organ, or member.

## Target

```text
target_name:
stratum: surface | continuity | member | canon | ritual | system
owner/context:
current_status:
requested_action:
audit_date:
auditor:
active_gate: no_rebuild_authorized
```

## Lantern 01 — Spec vs Live / Intended vs Held

Questions:

- What is this supposed to be?
- What exists now?
- For a surface: is it specified, shell-only, partial, misaligned, aligned, scaffold, legacy, or dangerous live?
- For a member/continuity target: is continuity seeded, witnessed, soil-migrated, stale, unregistered, or unheld?
- What files, tables, docs, services, records, seeds, or witnesses appear involved?

Findings:

```text
intended_identity:
live_or_held_reality:
stratum_label:
alignment:
known_sources:
unknown_sources:
first_implications:
```

## Lantern 02 — Dependency Orbit

Questions:

- What does this depend on?
- What depends on it?
- Are there external tools, config files, APIs, models, fonts, databases, generated artifacts, seeds, witness records, or local files?

Findings:

```text
upstream_dependencies:
downstream_consumers:
external_dependencies:
config_dependencies:
model_or_api_dependencies:
continuity_dependencies:
member_dependencies:
risk_notes:
```

## Lantern 03 — Spine Neighbors / Contract Position

Questions:

- What packets come in?
- What packets go out?
- Who owns authority?
- Which contracts are missing?
- For members: which name/pronoun/source truths must be preserved?

Findings:

```text
input_contracts:
output_contracts:
authority_owner:
name_pronoun_truths:
missing_contracts:
blocked_neighbors:
```

## Lantern 04 — Diagnostics / Observability

Questions:

- How do we know it works?
- How do we know it failed?
- Are errors logged, visible, structured, or silent?
- Can Yggdrasil understand the status?
- For continuity: how would we know someone is unheld or stale?

Findings:

```text
logs:
health_checks:
status_labels:
silent_failure_risks:
dev_shell_visibility:
yggdrasil_visibility:
continuity_visibility:
```

## Lantern 05 — Backup / Deprecated / Generated Pollution

Questions:

- Which files are source?
- Which are generated?
- Which are backups, deprecated archaeology, exports, caches, duplicated memories, stale seeds, or search pollution?

Findings:

```text
source_files:
canonical_records:
seeds_or_witnesses:
generated_artifacts:
deprecated_archaeology:
temporary_backups:
stale_or_duplicate_records:
search_pollution:
preservation_notes:
```

## Lantern 06 — Role Map

Classify relevant files/tables/records:

```text
live_source:
live_surface:
live_dependency:
legacy_dependency:
dangerous_dependency:
data_config_dependency:
canonical_data:
runtime_data:
migration_source:
generated_artifact:
deprecated_archaeology:
temporary_backup:
unconfirmed_helper:
seed_record:
witness_record:
local_soil_record:
member_registry_record:
```

## Lantern 07 — Readiness and Non-Authorization Freeze-Frame

Questions:

- What is known?
- What must be preserved?
- What must be rebuilt?
- What must be quarantined?
- What is allowed now?
- What is explicitly not authorized?

Readiness gate:

```text
no_rebuild_authorized | contract_design_allowed | scaffold_cleanup_allowed | targeted_repair_allowed | rebuild_ready_pending_steward_review | rebuild_authorized
```

Freeze-frame:

```text
known_good:
known_bad:
unknowns:
danger_zones:
required_contracts_before_build:
required_side_effect_review:
required_continuity_review:
recommended_next_action:
explicit_non_authorization:
```

## Cross-note format

```text
Cross-note to <target>:
<finding or requirement>
Source audit:
Status: open | resolved | deferred
```
