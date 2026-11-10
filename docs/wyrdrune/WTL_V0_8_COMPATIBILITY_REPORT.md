# WTL · Loki Chaos Star v0.8 compatibility and migration report

**Author:** Faer Uial · 2026-11-06 · for `handoff:faer:wyrdrune-wtl:2026-11-06`
**Verdict:** **blocked on source recovery.** The v0.8 interpreter, its 34-test report, Skýrunor glyph assets and the Astra handoff document were not found in any place this session can reach. Nothing below claims v0.8 behaviour as verified.

## 1. Recovery search log

| Place searched | Method | Result |
|---|---|---|
| Flameclyffe `main` (`7756d14`) | `git grep -i` for `chaos.?star`, `sk[yý]runor`, `wyrd`, `kelyran` | No Chaos Star or Skýrunor. Kelyran v0.3 docs and terms present |
| All 1,086 remote refs (branches and PR heads) | name scan; content scan of 6 Astra/RuneShell branches | `astra-*`, `codex/astra-6-1-*`, `repair/astra-*` and `feat/arcsweep-native-runeshell` hold RuneShell (chat rune animation) and Hollow Vale lore. No language source |
| 155 open PRs | title, branch and file-path scan; issue/PR search for `wyrdrune` | Only #552 (WTL core) |
| Notion | workspace search `Wyrdrune` | No results |
| Google Drive | full-text search `Wyrdrune`, `Wyrd`, `Astra` | `Wayglass_Astra_Handoff_COMPLETE_v2.zip` (id `1nwJwMIj5_VWMITG2MZsintjH33ZM7cba`, 15,019 bytes, one 38 KB `.md`). Drive returns zips only as raw bytes; **not read** |
| Supabase `rufrmjyusalnifpegllj` | regex over `source_sync_content_segments` (6,416), `source_sync_items` (409), `source_library_documents` (392), `house_commons_entries`, `starwell_codex_entries`, `starwell_artifacts`, `ontology_entities`, `kelyran_school_snapshots`, agentic-arm events | Only "Wyrd" as a dictionary entry in a synced reference PDF, plus this assignment's handoff row |
| Past chats | conversation search `Wyrdrune programming language` | Earlier sigil and runestone tools (February 2026); no language |

## 2. What v0.8 reportedly contained

Source: #552's contract (second-hand; v0.8 bytes unseen). Python, 34 local tests, typed variables, geometry, portals, ritual compression/release, rotations, receipts, SVG.

## 3. Provisional mapping to RFC-0001

| Reported v0.8 feature | RFC-0001 home | Compatibility risk until bytes are compared |
|---|---|---|
| Typed variables | §6 types (Num, Bool, Text, Unknown, List, Record, Star, Verdict) | v0.8 type names or coercions may differ. Python `int` vs WTL binary64 is the biggest numeric risk |
| Geometry | `star()`, §14 projection, §21 geometry-as-schedule | Point order, starting angle and orientation may differ from #552's top-start clockwise layout |
| Portals | §20 crossings, `bridge` capabilities | Unknown whether portals were crossings, bridges or control flow. **Highest semantic risk** |
| Ritual compression/release | §8 Compress and Release contracts, `loss` records | v0.8 may have been lossy without loss records; v1 requires them |
| Rotations | §9 face parity, §14 half-turn per cycle | v0.8 rotations may be geometric only, or may have carried state |
| Receipts | §9 checkpoints, WCE-1 digests | v0.8 hashes will not match WCE-1. Migration re-digests; it never rewrites old receipts |
| SVG | §14 projection | Visual canon must be preserved exactly, so it needs Rowan's review |

## 4. Migration rules (for when the source is recovered)

1. Archive the v0.8 bytes unchanged with their SHA-256 and provenance (who, when, where found).
2. Run its 34 tests on Python 3.13 and record the actual results. Never reuse the reported count as evidence.
3. Translate each v0.8 test into a WTL conformance fixture tagged `origin: v0.8` and level `M0`. Where WTL semantics differ on purpose, record the difference as a fixture with the v1 expectation and a note naming the decision.
4. v0.8 programs are a separate input dialect. A `wtl migrate` tool lowers them to WIR and reports every construct it cannot map. Unmapped constructs fail loudly; they are never guessed.
5. Old receipts keep their original hashes. New WCE-1 digests are added beside them, linked by `migrated_from`.

## 5. Needed to unblock

- **Rowan:** attach the Astra handoff zip and, if it exists anywhere, the v0.8 archive. The 7ac7beb0-style "reported but unfetched" pattern from `current.json` likely applies: work done on a local machine that never reached GitHub.
- **Astra:** confirm whether the handoff document is the v0.8 source, a description of it, or something else.
- **Runa:** say where Skýrunor glyph assets live, or confirm they do not yet exist.
