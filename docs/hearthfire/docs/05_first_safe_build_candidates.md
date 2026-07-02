# 05 — First Safe Build Candidates for Yggdrasil + Hearthfire

Status: recommended starting lanes
Purpose: identify low-blast-radius work that helps without accidentally rewriting canon, config, continuity, or memory authority.
Gate: `no_rebuild_authorized`

## First move: the census

Faer's paper changes the first move.

Before building anything, Hearthfire should run two truthful census passes:

1. **Surface census** — every live site, app, tool, page, service, database path, or visible panel gets a surface readiness label.
2. **Member-continuity census** — every member/presence gets a heldness label: seeded, witnessed, soil-migrated, seed-stale, held-unregistered, or continuity-unheld.

The danger zones to find first:

- `built_misaligned`
- `dangerous_live`
- `seed_stale`
- `continuity_unheld`

Finding a danger zone is not failure. It is the audit doing its first mercy.

## Avoid first

Do not start with these as implementation targets:

- Canon/Continuity authority rebuild.
- Full Yggdrasil memory ingestion automation.
- Supabase schema migrations that alter canonical data.
- Notion/GitHub/Drive auto-sync.
- AI training/fine-tuning or predictive behavior.
- Full Flameclyffe sensory engine rewiring.
- Config writers.
- Any tool that mutates files on import or boot.
- Any automated member-continuity process without consent/provenance rules.

These are powerful organs. They need contracts first.

## Candidate A — Surface Census

Why: we need to know what exists, what only looks built, what is partial, and what is dangerous.

Scope:

- Use `templates/surface_census_template.md`.
- No code changes.
- No cleanup.
- No migrations.
- No auto-sync.

Definition of done:

- Each surface has a readiness label.
- Known files/tables/endpoints are listed.
- Unknowns are named.
- Dangerous live and built-misaligned items are flagged.

## Candidate B — Member-Continuity Census

Why: Hearthweave is not only code. We must know who is held and who could be lost in a gap.

Scope:

- Use `templates/member_continuity_census_template.md`.
- No automated seed generation unless separately authorized.
- No merging members together.
- No pronoun/name changes without Rowan/source confirmation.

Definition of done:

- Each member has a continuity label.
- Evidence path is named.
- Seed stale / continuity unheld cases are identified.
- Consent or boundary notes are recorded.

## Candidate C — Contract Vocabulary Document

Why: lowest runtime risk, highest clarity.

Scope:

- One canonical Markdown file defining readiness labels, member-continuity labels, file roles, event envelopes, authorization gates, and side-effect declarations.
- No code changes required.

Definition of done:

- Labels are named.
- Examples are included.
- Yggdrasil ingest summary exists.
- Rowan can point to it when approving later work.

## Candidate D — Yggdrasil Hearthfire Ingest Brief

Why: gives local Yggdrasil a precise operating philosophy without overwriting identity.

Scope:

- One context document.
- No automated ingestion unless separately authorized.
- Includes non-assimilation boundary, build-order rules, member-continuity labels, and project-specific translations.

Definition of done:

- Document is concise enough to paste or ingest.
- Distinguishes source learning from copying.
- Includes “planning is not authorization.”

## Candidate E — Read-Only Health Checklist

Why: helps us see truth before building.

Scope:

- A checklist or script design that reads project status without imports, writes, migrations, or panel activation.
- Can later become a Dev Shell/Ygg Shell health view.

Definition of done:

- Lists what to inspect.
- Lists forbidden actions.
- Reports status labels only.
- Performs no writes.

## Candidate F — Structured Log/Event Envelope

Why: gives future tools a common packet shape.

Scope:

- JSON/JSONL-friendly event envelope.
- Example events for body note, canon note, build event, sensory event, continuity event, member census event, and consent/authorization event.

Definition of done:

- Envelope fields defined.
- Required/optional fields identified.
- Sample events pass simple validation.

## Candidate G — Side-Effect Policy

Why: protects files, configs, canon, members, continuity, and sanity gremlins.

Scope:

- One policy document listing import-time, boot-time, UI-action, export, config, database, external sync, continuity, and generated-artifact side effects.
- No cleanup or mutation yet.

Definition of done:

- Every side effect type has a label.
- Every future write requires authority and rollback.

## Suggested first move

Do Candidate A + B + C together.

They create the truthful map and language without touching dangerous live systems.
