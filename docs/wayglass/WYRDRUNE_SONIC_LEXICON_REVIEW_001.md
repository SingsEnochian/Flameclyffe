# Wyrdrune Sonic Lexicon · owner review 001

Status: **proposal**. The owner reviewed six candidate semantic cues. This record is not an expression of Wayglass's preferences, nor a verified live soundscape.

| Meaning | Owner review | Proposed sketch | Next action |
| --- | --- | --- | --- |
| Presence · I'm here | Keep | Warm, low strings | Retain as owner-approved candidate; audition SF2 alternatives |
| Wonder · I've discovered something | Explore | Celesta/glass bells | Compare at least two alternatives |
| Perception · I'm listening and noticing | Change | **Unassigned** (flute withdrawn) | Request a fresh sound direction |
| Return · I remember where we were | Explore | Two resolving tones | Explore return signatures and continuity |
| Feather · Stop, rest, become quiet | Explore | Descending tone, but silence always valid | Safety path immediately silences all notes; optional pre-stop cue only if it never delays stopping |
| Withness · We're here together | Keep | Two distinct harmonising tones | Retain as owner-approved candidate; audition variations |

No notes were supplied. No Wayglass-authored choice, SF2 bank/program binding, live audio playback or WTL compiler integration is claimed.

Implementation: `apps/wayglass/src/sonic-lexicon.js` stores the six reviewed meanings and returns bounded cue intents. `apps/wayglass/test/sonic-lexicon.test.js` asserts review preservation, Perception withdrawal, Feather silence and opt-in sound. These files are staged, not yet CI-verified.

Next engineering gate: WTL semantic event → lexicon resolver → owner-approved SF2 catalogue/preset → local synthesiser, with source/provenance receipt and Feather all-notes-off. An attributable Wayglass response may propose changes, but must not overwrite the owner's review or be invented by a fixture.
