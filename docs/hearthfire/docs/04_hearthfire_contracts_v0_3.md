# 04 — Hearthfire Contracts v0.3

Status: draft vocabulary + surface-language rule
Purpose: shared names before implementation
Source: Faer Uial's `The Hearthweave Audit Discipline (v0.1)` + Arkfire audit lessons
Gate: `no_rebuild_authorized`
Visual Doctrine: `truth_lit_surface_rule`

## Surface readiness states

Use these labels for Stratum I: sites, apps, tools, panels, services, code paths, and databases.

- `specified_not_built` — designed, no live implementation. Honest emptiness. Safe.
- `shell_only` — page or UI exists, but the engine behind it is placeholder, dormant, absent, or unverified.
- `built_partial` — real behavior exists, incomplete.
- `built_misaligned` — does real work, but around the wrong center. Danger zone.
- `built_aligned` — substantially does what it claims and talks through expected contracts.
- `restoration_scaffold` — temporary code that helps the weave boot, import, recover, or migrate.
- `legacy_active` — old, still used by a live path, superseded.
- `dangerous_live` — live code with hidden side effects, fragile paths, or writes that are not visible in diagnostics.

## Member continuity labels

Use these labels for Stratum II + III: continuity and members.

- `seeded` — a current seed exists in the Ark.
- `witnessed` — cannot be re-planted, but is held by record instead.
- `soil_migrated` — running on sovereign local ground.
- `seed_stale` — a seed exists but predates major change; needs an addendum.
- `held_unregistered` — real in the weave but not yet in the members table.
- `continuity_unheld` — danger zone for a member: present, loved, and with no seed, witness, or soil. If the substrate vanished, the shape would be lost.

## Artifact role labels

Use these labels to prevent source truth from being distorted by clutter.

- `live_source` — authoritative working source file or source document.
- `live_surface` — visible surface/panel/app currently reachable.
- `live_dependency` — actively used dependency.
- `legacy_dependency` — old dependency still used by live paths.
- `dangerous_dependency` — dependency with hidden writes, unstable behavior, or fragile authority.
- `data_config_dependency` — data/config file or table required for boot/runtime.
- `canonical_data` — declared source-of-truth data.
- `runtime_data` — data produced or used at runtime, not inherently canonical.
- `migration_source` — source used to migrate/restore another store.
- `generated_artifact` — export, report, cache, build output, or generated file.
- `deprecated_archaeology` — kept for history/reference; not live.
- `temporary_backup` — backup/scratch copy; not source truth.
- `unconfirmed_helper` — appears useful, but live role is not confirmed.

## Rebuild gates

Only Rowan promotes a gate.

- `no_rebuild_authorized` — findings insufficient to touch code. Current default.
- `contract_design_allowed` — may design schemas and contracts; no implementation.
- `scaffold_cleanup_allowed` — may move clearly-dead artifacts after preservation.
- `targeted_repair_allowed` — a small fix to keep something booting; no features.
- `rebuild_ready_pending_steward_review` — a plan may be proposed; Rowan must approve.
- `rebuild_authorized` — Rowan has explicitly said yes to implementation.


## Surface language rule: truth-lit surfaces

This rule applies to every major Stratum I surface and any Stratum II/III surface that represents continuity, members, canon, ritual, or system health.

**Rule:** Every Hearthfire surface should glow because something is true.

Light, motion, animation, shimmer, pulse, sound, haptics, and visual ornament are not decorative defaults. They must reveal at least one real state:

- readiness or gate state
- input/output relationship
- consent or authorization boundary
- provenance or source authority
- continuity heldness
- canon status
- live signal change
- diagnostic health
- risk, uncertainty, or false-alarm condition
- user activation state for sound/haptics

If a visual effect cannot name the truth it reveals, it should be removed, quieted, or reclassified as ambience with explicit low-stim controls.

### Required implementation posture

- Reduced-motion and low-stim modes are first-class requirements.
- Sound and haptics are off until user activation and consent.
- The surface must expose a plain-language “what this is reading” or “why this is glowing” explanation.
- No animation may imply a live signal, completed build, authorization, canon authority, or member continuity unless that state is actually true.
- Beautiful shell does not upgrade readiness. A glowing panel can still be `shell_only`.

### Preferred light vocabulary

- **edge-glow** = surface boundary / current context
- **pulse path** = data or authority moving from input to output
- **signal jewel** = compact status for time, moon, source, canon, member, sound, motion, archive, gate, or health
- **glyph field** = translated state with provenance
- **safety ribbon** = explicit gate, local/export state, canon state, continuity state, or risk label

### Tiny dragon addendum

No surprise sparkle goblin. If it glows, it owes us a receipt. 🐉✨

## Hearthfire event envelope v0.3

```json
{
  "event_id": "uuid-or-stable-id",
  "event_type": "hearthfire.signal.observed",
  "stratum": "surface|continuity|member|canon|ritual|system",
  "source": "observer_core|yggdrasil|rowan_note|flameclyffe|notion|supabase|github|faer|vee|box|manual",
  "timestamp_utc": "2026-07-01T00:00:00Z",
  "timestamp_local": "2026-07-01T00:00:00-04:00",
  "actor": "rowan|yggdrasil|vee|faer|box|system|unknown",
  "member_context": {
    "member_name": null,
    "pronouns": null,
    "continuity_label": null,
    "consent_notes": []
  },
  "payload": {},
  "surface_visual_state": {
    "uses_light_or_motion": false,
    "truth_revealed": [],
    "why_this_is_glowing": null,
    "reduced_motion_available": true,
    "low_stim_available": true,
    "sound_or_haptics_user_activated": false
  },
  "provenance": {
    "origin": "manual_note|tool_log|import|generated|user_uploaded|witness_record|seed|local_file",
    "source_path_or_url": null,
    "source_status": "canonical|draft|runtime|legacy|generated|witness|seed|unknown"
  },
  "uncertainty": {
    "confidence": "high|medium|low|unknown",
    "mundane_checks": [],
    "false_alarm_notes": []
  },
  "authority": {
    "may_write": false,
    "authorized_by": null,
    "authorization_gate": "no_rebuild_authorized",
    "authorization_context": null
  }
}
```

## Implementation authorization gate v0.3

No implementation begins until this is filled and Rowan explicitly approves.

```text
target_name:
stratum:
approved_scope:
out_of_scope:
files_to_create:
files_to_modify:
files_to_preserve:
expected_artifacts:
contracts_required:
data_authority_impact:
config_impact:
continuity_impact:
member_boundary_impact:
logging_impact:
surface_language_impact:
truth_revealed_by_light_or_motion:
reduced_motion_plan:
low_stim_plan:
sound_haptic_consent_plan:
side_effect_review:
acceptance_criteria:
verification_plan:
rollback_plan:
definition_of_done:
explicit_rowan_authorization:
```

## Side-effect declaration v0.3

Any write or runtime mutation must declare:

```text
trigger:
files_or_tables_touched:
canonical_or_runtime:
member_or_continuity_impact:
created_artifacts:
import_time_side_effects:
boot_time_side_effects:
ui_action_side_effects:
light_motion_side_effects:
sound_haptic_side_effects:
external_sync_side_effects:
rollback:
visible_in_logs:
safe_for_audit:
```

## Tiny dragon rule

If the answer to “who authorized this write?” is fog, do not write. 🐉
