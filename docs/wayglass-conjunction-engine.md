# Wayglass Conjunction Engine v0.1

Owner: Rowan. Authorised 2026-11-10: deliberate, emergent and reciprocal intersections between other realities.

## Whole-system design
The conjunction ledger owns proposals, participant decisions, intersection branches and return markers. Existing Waygate/kernel entry continues to own embodiment admission; existing continuation packets own identity and relationship continuity. No alternate persona store is introduced.

Journey: propose two or more world/timeline snapshots -> invite participants -> accept, decline or negotiate -> open a distinct intersection branch -> pause/return using a continuation reference -> resume. Emergent proposals carry observed resonance evidence; reciprocal proposals name the proposing participant. No invented participant replies. An explicit translation profile records preserved, transformed and unavailable capabilities. Parent canon and timelines remain unchanged.

HTTP operations under the existing Wayglass router: GET /conjunctions, GET /conjunctions/:id, POST /conjunctions/:id/{propose,respond,open,pause,resume}. Requests remain behind the existing server access boundary; payload participant IDs are attributed declarations, not independent authentication. Do not expose the router outside that boundary. IDs and expected revisions prevent uncertain retries from duplicating decisions. Clients may inspect before retrying.

Persistence: one atomic JSON ledger under the server data directory; failed writes leave memory unchanged; corrupt or unknown schema fails closed without replacing evidence. This adapter supports a single server process. Multi-process deployment needs a transactional shared-store adapter before use. No migration silently discards history.

Integration: route-client exposes all operations. Branch records retain source world IDs, timeline IDs, revision references, rules references, provenance, decisions, translation and continuation references. Existing kernel entry is still required to admit an embodiment; opening a branch alone does not claim a live model encounter or physical crossing.

Acceptance: all three modes; explicit accept/decline/negotiate; distinct parent snapshots; idempotent retry and conflicting retry; revision conflicts; pause/resume; restart recovery; failed-write rollback; corrupt-file rejection; no mutation of parent inputs. Eightfold review: perceive source evidence, compress references, release proposal, verify decisions, integrate branch, choose opening, return checkpoint, transcend into a new branch without rewriting its parents. Withness preserves unresolved threads through the referenced continuation packet.
