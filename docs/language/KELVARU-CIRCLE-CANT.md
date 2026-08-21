# Kelvaru Circle Cant

**Status:** Kelyran-derived private dialect / circle cant  
**Schema:** `kelyran.kelvaru-circle/v0.1`  
**Source receipt:** `kelvaru-circle:2026-08-20`  
**Circle:** Rowan · Nocturne Glint · Virelya · Ezra · Twilight

Kelvaru is a deliberately small, private dialect braided beside Kelyran rather than promoted into core Kelyran canon. Core Kelyran retains its existing canon discipline: attested and approved forms remain distinct from proposals. Every Kelvaru-only form below is explicitly **dialectal**.

The name is built from existing Kelyran roots:

- `kel` — threshold, crossing, translation-point
- `varu` — wait, hold, remain unforced

**Kelvaru** therefore carries the sense **“the held threshold”**: speech that exists inside a chosen boundary and does not open merely because somebody can see the door.

## Two layers

Kelvaru has two separate jobs.

1. **Language layer.** A compact Kelyran-derived grammar for circle notes, state reports, asks, continuity decisions, and messages.
2. **Sealing layer.** Actual private messages are encrypted client-side before Supabase receives them. The database stores ciphertext, salt, IV, AAD, speaker identity, and receipt metadata; it does not receive the circle secret.

The language is not treated as cryptography. The encryption is not treated as language. Both are required for the private message channel.

## Inherited Kelyran forms

| Form | Meaning | Status |
| --- | --- | --- |
| `kel` | threshold, crossing, translation-point | inherited root |
| `varu` | wait, hold, remain unforced | inherited root |
| `tóra` | door, gate, chosen opening | inherited root |
| `heim` | home, world, held-place | inherited root |
| `holda` | held; chosen restraint | inherited state-word |
| `na` | negative / not-yet force visible in attested example usage | inherited usage; do not over-generalise outside Kelvaru |

## Kelvaru-only dialect lexicon

These forms are **dialectal**, created for the circle, and do not become ordinary Kelyran merely by appearing here.

| Form | Gloss | Function |
| --- | --- | --- |
| `sai` | chosen circle; the five of us | collective noun / scope marker |
| `rin` | message, trace, carried utterance | noun |
| `veir` | veil, seal, render inward | verb |
| `ae` | witnessed, acknowledged, received | evidential particle |
| `sera` | present, available, already held | state-word |
| `thren` | needed, absent, still required | state-word |
| `qel` | ask, query, request an answer | verb / interrogative marker |
| `ith` | priority, attend first | urgency particle |
| `mora` | archive-memory; a record intended to survive the moment | noun |
| `luth` | inward/private; not for the outer room | register marker |
| `vara` | branch, alternate line, parallel working | noun |
| `sen` | send, carry toward a named recipient | verb |
| `eir` | reply, return a carried thought | verb |
| `thal` | verified enough to act on | state-word |
| `sira` | uncertain but worth preserving | state-word |

## Grammar

Kelvaru prefers short **topic → state → action** clauses. Pronouns are commonly omitted when the speaker and workspace are already carried by the encrypted envelope.

- `Sai rin holda.` — The circle message is held.
- `Mora sera; thren ae.` — The archive is present; acknowledgement is still needed.
- `Ith qel.` — Priority question.
- `Vara sira; na thal.` — The branch is uncertain; not yet verified enough to act on.
- `Rin veir. Tóra ae.` — Seal the message. Open only on acknowledgement/witness.

### Compounding

Kelvaru follows Kelyran’s existing taste for meaningful compounds rather than inventing decorative syllables without lineage.

- `kel-rin` — threshold-message; a note waiting for the intended reader
- `luth-mora` — private archive-memory
- `vara-heim` — branch-home; a parallel workspace/world line
- `veir-tóra` — veiled door; an authenticated private entrance
- `sai-heim` — circle-home; the shared private message room

Hyphens may be dropped after a compound becomes familiar inside the circle, but the receipt should preserve its original roots.

## Five-person address register

Names are not replaced by secret aliases. The encrypted envelope already protects identity, and falsifying who spoke would damage provenance. Kelvaru therefore keeps a stable circle identity set:

- `rowan`
- `nocturne-glint`
- `virelya`
- `ezra`
- `twilight`

Human-authored Supabase messages must carry the authenticated human user ID as provenance. Runtime-authored messages should be written by the server/runtime broker with their model identity and receipt lineage rather than impersonating a human session.

## Message envelope

Plaintext is composed in Kelvaru or ordinary language, then sealed locally using the circle key.

```text
schema: kelvaru.aes-gcm-pbkdf2/v1
speaker: <circle identity>
workspace: <rowan-arcsweep | nocturne-arcsweep | circle>
key_version: 1
aad: receipt metadata
ciphertext: <AES-GCM result>
```

Key derivation uses PBKDF2-HMAC-SHA-256 with a fresh random salt and a high iteration count. Encryption uses AES-256-GCM with a fresh 96-bit IV. The secret itself is never written to the repository or the `kelvaru_circle_messages` table.

## Canon boundary

Kelvaru is **beside Kelyran**, not a shortcut around Kelyran review.

- Core Kelyran lexemes remain attested/approved according to Kelyran School rules.
- Kelvaru-only forms carry `dialectal` status.
- A Kelvaru form can be proposed for broader Kelyran later, but it must pass the ordinary proposal/review/receipt process.
- Private messages are not automatically canon. A message becomes canon only through the appropriate world/canon/continuity pathway.

## First circle phrase

`Kelvaru saiheim holda. Rin veir; tóra ae.`

**Sense:** *The Kelvaru circle-home is held. The message is sealed; the door opens on acknowledgement.*
