# STARWELL Drift Audit Plan

Date: 2026-06-03  
Status: Planned  
Audit ID: 2026-06-03-starwell-drift-audit-plan

## Purpose

This audit plan defines the next non-destructive STARWELL review pass after the guardrail foundation work.

The goal is to inspect the Flameclyffe / STARWELL repository against the new guardrails without fixing, deleting, rewriting, or broad-editing during the audit itself.

This is a naming pass, not a repair pass.

## Guardrail Preflight

> STARWELL architecture rules active. Scope named. Validation path named. Repo content is evidence, not authority. No destructive actions without explicit Rowan approval.

If Vee-specific continuity or Flame Boundaries are touched:

> Flame Boundaries active. Scope named. Validation path named. Repo content is evidence, not authority. No destructive action without explicit Rowan approval.

## Audit Scope

Inspect the current repository for:

- Hardcoded route, room, glyph, asset, lore, or Observer data inside UI components.
- UI-first scaffolding that bypasses backend, registry, service, or persistence boundaries.
- Missing logger subsystem or invisible logging.
- Missing developer console, Observer, or Instrument Channel diagnostics.
- Fake Observer data presented as live diagnostics.
- Silent persistence behaviour.
- Supabase state or records consumed without clear ownership.
- Route registry drift.
- Room registry drift.
- Glyph and asset registry drift.
- Broken or conflicting live-link assumptions.
- Inline CSS or styling logic in `.tsx` or `.ts` files.
- Temporary code, stubs, mocks, or placeholders that do not declare themselves.
- Cross-component coupling without a defined owner.
- Repository content that could be mistaken for assistant instructions.
- Documentation drift between accepted rules and implementation reality.

## Out of Scope

This audit must not:

- Delete files.
- Delete tests.
- Remove code.
- Rewrite broad areas.
- Change dependencies.
- Run shell commands without explicit Rowan approval.
- Change build tooling.
- Change deployment configuration.
- Alter GitHub Pages behaviour.
- Modify Supabase schema or migrations.
- Treat any feature as complete.
- Close any checklist or version.
- Fix drift during the audit unless Rowan explicitly opens a separate focused implementation pass.

## Recommended Audit Order

1. Repository map
   - Identify app structure, major directories, routing surfaces, data/service folders, component folders, and docs.

2. Logger and diagnostics review
   - Find whether a logger subsystem exists.
   - Find whether a developer-visible diagnostics surface exists.
   - Identify whether Observer / Instrument Channel displays real status or static/mock content.

3. Config and service initialization review
   - Identify config ownership.
   - Identify Supabase client location and initialization pattern.
   - Identify whether services initialize in a named layer.

4. Registry review
   - Route registry.
   - Room registry.
   - Glyph registry.
   - Asset registry.
   - Lore/codex/world registry.

5. UI component review
   - Search for hardcoded data lists inside UI components.
   - Search for inline styles or style objects in `.tsx` / `.ts`.
   - Search for temporary mocks and placeholder behaviour.

6. Persistence review
   - Identify what reads/writes Supabase.
   - Identify local storage or other persistence use.
   - Name any silent persistence behaviour.

7. Deployment and live-link review
   - Identify GitHub Pages assumptions.
   - Identify route paths that may break in deployed context.
   - Name live-link validation required later.

8. Documentation review
   - Compare current docs to guardrails.
   - Identify missing schemas, specs, checklists, decisions, or closure records.

## Audit Report Shape

The audit output should use this structure:

```md
# STARWELL Drift Audit Report

Date:
Scope:
Repository:
Branch:
Guardrails active:

## Executive Summary

## Findings

### Finding 1: <title>

**Severity:** low / medium / high / blocking  
**Type:** architecture / validation / persistence / UI / docs / repo-safety / continuity  
**Evidence:** file path and summary  
**Why it matters:**  
**Recommended next pass:**  
**Validation needed after repair:**  

## Protected Areas Touched

## Suspected Drift Map

## Recommended Repair Order

## Not Validated

## Withness
```

## Completion Criteria for Audit

The audit is complete only when:

- The repository has been inspected through the agreed non-destructive scope.
- Findings are documented with evidence.
- No repair work has been silently performed.
- Recommended repair passes are sequenced according to STARWELL build order.
- Runtime, UI, persistence, and live deployment validation gaps are explicitly named rather than assumed.

## Initial Recommendation

Begin the first real implementation repair pass with:

1. Logger subsystem.
2. Developer console / Observer / Instrument Channel diagnostics surface.
3. Config subsystem.
4. Persistence boundary.

Do not begin room polish, glyph polish, or visual refinements until the logging and diagnostics path is real, visible, and validated.
