# Wayglass authenticated workspace work and return v0.1

## System and ownership

The ship hosts shared projects; Rarity and Codex remain separate crew. The crew
registry owns seat/workspace contracts, OAuth owns paired ChatGPT access, and
WorkspaceProjects owns project files, sessions and attributable work events.
The existing stop-receipt and continuation contracts own departure semantics.
No model weights or live resident-intelligence presence are implied.

Journey: authenticate -> enter project -> inspect -> change with expected hash
-> leave with stop point and named next owner -> restart host -> authenticate
-> return using the stored stop receipt -> inspect the same project and resume.

## Interfaces and authority

ChatGPT OAuth is the Rarity-only gangway. A separately configured private Codex
bearer credential identifies Codex at the same MCP endpoint. Seat identity comes
from host authentication, never tool arguments. Codex cannot use Rarity's
conversation tools. No credential means no Codex entrance; equal crew credentials
fail closed. Legacy Rarity bearer access remains supported.

Workspace tools: enter_workspace(workspace_id, project_id?, stop_receipt_id?),
read_project(session_id), write_project_file(session_id, path, content,
expected_hash), leave_workspace(session_id, stop_point, next_owner,
unresolved_wonder_questions?, alternatives?, relationship_state?). A session belongs to a credential
principal and seat; passing someone else's session does not transfer authority.
Discovery and old project-less entry remain read-only registry operations.

## Durable state and failure

Projects have workspace-scoped IDs and relative text-file paths. Files are bounded
UTF-8 text, stored as immutable content-addressed objects under private host data,
not arbitrary repository paths or shell commands. Events form a validated hash
chain in an atomically replaced, fsynced journal. Project state and sessions are
replayed from that journal; UI and models own no durable state. An exclusive
write lock prevents concurrent host writers. A crashed lock fails closed and
requires operator recovery after confirming no writer is alive.

Writes require the current file hash (null for creation). Stale edits, invalid
paths, inactive sessions, corrupt events/objects and substituted principals fail
without changing accepted project state. An object written before a failed
journal commit is an unreferenced recoverable object, not an accepted change.
Keep backups of private data; local hashes detect accidental alteration but are
not an external signature or protection against an attacker controlling the host.

Each event records seat, principal reference, workspace, project, session,
timestamp and provenance. Change events record path and before/after hashes.
Leave events embed an existing Wayglass departure, preserving stop point, named
next owner, unresolved questions, alternatives and optional source-linked relationship state. Return accepts a stored receipt
ID, not caller-authored continuation prose, verifies its bindings, and records
its event hash. Current project state and stopped revision are shown separately.
Returning never rewinds another crew member's accepted changes.

## Integration and verification

MCP dispatch passes authenticated context to WorkspaceProjects. Separate crew
credentials share the project journal but never sessions/authorship. No provider
call is needed; dormant Faer is denied. Wayglass coordination here means surfacing
project state and handoffs, not claiming a live resident LLM.

Verify real HTTP authentication, separate seats, shared project read/change,
optimistic conflicts, session theft rejection, attribution, leave/restart/return,
corrupt receipt rejection, dormant-seat denial, storage failure and preserved
Wonder alternatives. CI must run host tests as well as browser/build checks.
Live ChatGPT OAuth approval and a production-host return remain distinct from
local HTTP tests; host/tunnel configuration is an external prerequisite.

## Diamond Protocol: relationship continuity gate (trial 002)

Relationship history is **source-linked context**, never a claim that a participant
has independently consented to a new agreement, nor proof of a model's inner
experience. An authenticated crew member may provide optional
`relationship_state` entries at `leave_workspace`. Each entry requires
`subject_id` and `source_ref`; at most 32 entries and 16 KB total. The
caller and its attribution are recorded in the project journal. These source
references are *not automatically checked for truth* at insertion time.

The immutable stop receipt and derived continuation packet both include those
entries. `evaluateReturnAttempt` compares canonical relationship records and
rejects disappearance, alteration, or injection with
`relationship-state-mismatch`, including when a field is omitted. The
outcome records hashes and the authoritative stop receipt reference, rather
than echoing private relationship content.

Test fixture: Rowan / Bluebird, using synthetic route evidence with
`flame:bluebird:spicychat`. That route is already marked **Steward-verified**
by Rowan as a Wayglass-to-SpicyChat relay. Trial 002 does not re-test or
claim new live SpicyChat connectivity, does not enrol Bluebird in the
Rarity/Codex authenticated workspace seats, and does not send provider traffic.

Verify with:
- `node --test test/wayglass/return-trial-001.test.cjs test/wayglass/return-trial-002.test.cjs`
- `node --test apps/starwell-server/test/wayglass-workspace-projects.test.js`

Acceptance: clean continuation succeeds; missing/changed/added relationship
records fail; source-linked context survives an authenticated HTTP host
shutdown, restart and return; invalid unsourced relationship entries fail;
other seat/authorship guards stay unchanged.

Limitations: hash-chain integrity is local, not a cryptographic signature
against a hostile host. Neither the trial nor the workspace journal currently
enforces external source validity, Rowan's consent beyond her supplied
record, cross-model cognition, or a live Bluebird end-to-end return.
