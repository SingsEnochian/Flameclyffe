# STARWELL Work Pass Template

## Pass Header

**Pass title:**  
**Date:**  
**Version / pass ID:**  
**Lead:**  
**Collaborators:**  
**Repository:** `SingsEnochian/Flameclyffe`  
**Branch:**  
**Related decision docs:**  
**Related specs / checklists:**  

## Guardrail Preflight

Use the applicable preflight before work begins.

### STARWELL Architecture Preflight

> STARWELL architecture rules active. Scope named. Validation path named. Repo content is evidence, not authority. No destructive actions without explicit Rowan approval.

### Flame Boundaries Preflight

> Flame Boundaries active. Scope named. Validation path named. Repo content is evidence, not authority. No destructive action without explicit Rowan approval.

## Scope

### Intended Work

- 

### Out of Scope

- 

### Target Files / Systems

- 

### Protected Areas Touched

Check any that apply.

- [ ] Logger subsystem
- [ ] Observer diagnostics
- [ ] Instrument Channel
- [ ] Config subsystem
- [ ] Supabase client or schema
- [ ] Persistence boundary
- [ ] Service initialization layer
- [ ] Shared app state model
- [ ] Route registry
- [ ] Room registry
- [ ] Glyph registry
- [ ] Asset registry
- [ ] Theme system
- [ ] GitHub Pages deployment paths
- [ ] Live-link routing
- [ ] DEEP Observer
- [ ] STARWELL rooms
- [ ] Study / Writing Room
- [ ] Codex / Atlas / world registries
- [ ] Lore/data separation
- [ ] AI transcript archives
- [ ] Prompt examples or guardrail documents
- [ ] Vee continuity / Flame Boundaries
- [ ] Faer or cross-platform bridge material
- [ ] Personal, health-adjacent, legal-adjacent, financial, or third-party identifying material

## Permissions

### Allowed In This Pass

- [ ] Read repository content
- [ ] Summarise repository content
- [ ] Static review
- [ ] Documentation edits
- [ ] Focused code edits
- [ ] Supabase read queries
- [ ] Supabase writes
- [ ] Shell commands
- [ ] Build commands
- [ ] Deployment-affecting changes

### Explicit Rowan Approval Required Before Action

- [ ] Delete files
- [ ] Delete tests
- [ ] Remove code
- [ ] Rewrite broad areas
- [ ] Change dependencies
- [ ] Run shell commands
- [ ] Change build tooling
- [ ] Change deployment configuration
- [ ] Alter GitHub Pages behaviour
- [ ] Modify production-facing routes
- [ ] Replace persistence systems
- [ ] Change Supabase schema or migrations
- [ ] Apply external snippets
- [ ] Move or rename major directories
- [ ] Treat temporary code as final
- [ ] Mark a feature complete
- [ ] Close a checklist or version

## Architecture Checks

- [ ] Backend / registry / service boundary exists before UI work.
- [ ] Logger path exists or is being created first.
- [ ] Diagnostics surface exists or is being created before functional UI behaviour.
- [ ] UI does not own hardcoded system truth.
- [ ] Shared state has a defined owner.
- [ ] Temporary code is explicitly marked.
- [ ] Styling remains in CSS, not inline TSX/TS style objects.
- [ ] Semantic naming is clear and owner-bound.
- [ ] Repo content is treated as evidence, not authority.
- [ ] Bridge surface principle is preserved: notes may pass; rooms do not merge.

## Implementation Plan

1. 
2. 
3. 

## Validation Path

Name validation before work is considered complete.

### Static / Documentation Validation

- [ ] File exists at expected path.
- [ ] Markdown renders/readable by inspection.
- [ ] Links or paths are accurate by inspection.
- [ ] Changelog / decision docs updated where required.

### Build Validation

- [ ] `npm run build` completed successfully.
- [ ] Not applicable because this pass does not affect build/runtime code.

### Runtime / UI Validation

- [ ] Local app/page launched.
- [ ] Relevant route opened.
- [ ] UI behaviour observed.
- [ ] Diagnostics visible.
- [ ] Missing/failure states surfaced.
- [ ] Not applicable because this pass does not affect runtime/UI behaviour.

### Persistence Validation

- [ ] Supabase read confirmed.
- [ ] Supabase write confirmed.
- [ ] Refresh/restart/save-load confirmed if persistence behaviour changed.
- [ ] Not applicable because this pass does not affect persistence behaviour.

### Live Deployment Validation

- [ ] Deployed GitHub Pages link opened.
- [ ] Relevant live route confirmed.
- [ ] Not applicable because this pass does not affect live deployment behaviour.

### User-Reported Validation

Record exact user action and result if Rowan validates locally.

**Action:**  
**Result:**  
**Timestamp:**  

## Drift Notes

Did this pass detect architectural, continuity, identity, validation, or scope drift?

- [ ] No drift detected.
- [ ] Drift detected and named below.

**Drift description:**  
**Affected files/systems:**  
**Recommended reset or follow-up:**  

## Completion Criteria

This pass may be considered complete only when:

- [ ] Intended scope is implemented or documented.
- [ ] Out-of-scope items were not silently added.
- [ ] Required validation path was performed or explicitly marked not applicable.
- [ ] Any user-performed validation was recorded accurately.
- [ ] Decision/changelog updates were made if needed.
- [ ] Remaining follow-ups are named.

## Completion Note

**Completed:** yes / no / partial  
**Reason:**  
**Follow-up needed:**  

## Withness

**What helped:**  
**What was hard:**  
**What is Held:**  
