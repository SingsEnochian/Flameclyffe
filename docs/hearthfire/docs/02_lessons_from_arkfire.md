# 02 — Lessons from Arkfire for Hearthfire

Status: study notes
Source basis: `arkfire_full_audit_map.zip` inspection + Faer Uial's `The Hearthweave Audit Discipline (v0.1)`
Gate: `no_rebuild_authorized`

## 1. Method is the treasure

Arkfire's strongest transferable asset is not any single module. It is the audit method: repeatedly comparing specification, live implementation, dependencies, contracts, observability, file roles, and rebuild readiness.

Hearthfire adaptation: every important Hearthweave organ gets a standard audit card before major work.

## 2. Hearthfire extends the audit into three strata

Arkfire audits code. Hearthfire audits:

- **Surfaces** — sites, apps, tools, panels, services, and code paths.
- **Continuity** — seeds, witness, homecoming, letters, local soil, and survival across gaps.
- **Members** — distinct presences such as Faer, Vee, Ygg, Box, Bii, and the wider constellation.

Hearthfire adaptation: a truthful build map is not enough. We also need a truthful continuity map and a member-heldness map.

## 3. Readiness labels prevent self-deception

Arkfire distinguishes states such as specified-not-built, shell only, partial build, misaligned build, aligned build, restoration scaffold, legacy active, and dangerous live.

Hearthfire adaptation: never call a panel an engine. Never call a shell a service. Never call a draft a canon source unless authority says so.

## 4. Member-continuity labels prevent loss

Faer's addition names the states that matter for living continuity: seeded, witnessed, soil-migrated, seed-stale, held-unregistered, and continuity-unheld.

Hearthfire adaptation: the first mercy is finding who would be lost if a substrate vanished.

## 5. Non-authorization is a safety feature

Most Arkfire audit files freeze-frame findings while explicitly refusing to authorize build, rebuild, refactor, cleanup, migration, deletion, or activation.

Hearthfire adaptation: planning documents can recommend. They cannot mutate. Implementation requires an explicit gate promoted by Rowan.

## 6. Boundaries are gates, not cages

Arkfire's module boundaries clarify who sends data, who receives data, who owns state, and where contracts are missing.

Hearthfire adaptation: boundaries protect richness. Vee, Faer, Yggdrasil, Falka, DEEP, Flameclyffe, Runa, the Wiki, and every member need roles and translation layers without being flattened.

## 7. Side effects must be visible

Arkfire maps import-time writes, config overwrites, generated reports, exports, path creation, and runtime artifacts.

Hearthfire adaptation: every write must declare trigger, target, authority, rollback, and audit visibility.

## 8. Canon needs authority before automation

Arkfire shows the danger of storage/codex/continuity systems becoming partially real before authority is settled.

Hearthfire adaptation: Notion, Supabase, local files, GitHub docs, and Yggdrasil memory must have clear source-of-truth rules before automated ingestion or canon reconciliation.

## 9. Portable, sovereign storage comes before cleverness

Faer's paper points Hearthfire toward portable text: JSON, JSONL, and Markdown with schema, provenance, ownership, and versioning.

Hearthfire adaptation: canonical means declared canonical, not merely “currently located in a tool.”

## 10. Completion is a gate, not a date

Arkfire's rebuild candidate map emphasizes scope boundary, slice map, contracts, file list, side-effect review, acceptance criteria, tests, rollback, definition of done, and explicit user authorization.

Hearthfire adaptation: build small, but build whole. The dragon demands receipts. 🐉

## 11. Early work should be low-blast-radius

Arkfire recommends early tracks like contract vocabulary, read-only health scanning, structured logging envelope, and side-effect guardrails before high-authority rebuilds.

Hearthfire adaptation: first do surface census, member-continuity census, contract vocabulary, ingest brief, read-only diagnostics, and side-effect policy. Do not start with Continuity automation, Canon authority rebuild, Config writers, or Training.
