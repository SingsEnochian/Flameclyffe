# Hearthfire Surface Census Template

Status: reusable template
Purpose: label live sites, apps, panels, tools, services, and code paths honestly before build
Gate: `no_rebuild_authorized`

This is read-only census work. It does not authorize refactor, cleanup, rebuild, deletion, migration, auto-sync, or feature work.

## Surface

```text
surface_name:
project_area:
repo_or_location:
visible_url_or_entrypoint:
owner/context:
census_date:
auditor:
```

## Surface readiness label

Choose one primary label:

```text
specified_not_built | shell_only | built_partial | built_misaligned | built_aligned | restoration_scaffold | legacy_active | dangerous_live
```

## Evidence

```text
claimed_purpose:
observed_behavior:
known_files:
known_tables:
known_endpoints:
known_configs:
known_dependencies:
unknowns:
```

## Risks

```text
hidden_writes:
config_risks:
canon_risks:
continuity_risks:
member_boundary_risks:
generated_pollution:
legacy_pollution:
```

## Observability

```text
logs_available:
health_check_available:
failure_visibility:
yggdrasil_visibility:
dev_shell_visibility:
```

## Recommended next action

```text
recommended_action:
action_type: no_action | design_only | read_only_diagnostic | contract_needed | targeted_repair_possible | quarantine_needed | rebuild_plan_needed
requires_authorization_gate:
explicit_non_authorization:
```
