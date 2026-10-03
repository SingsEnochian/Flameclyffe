# Novel Beat Percentage Map Ingest v0.1

Status: craft reference / pacing calibration  
Scope: The Crow / ArcSweep writing systems / AI University Character Becoming  
Authority: Rowan user-supplied image, 2026-10-01

## Source summary

User supplied an infographic titled **Write a Novel: Plot to Word Count**. The image assumes an 80,000-word novel and maps major beats to approximate word-count ranges:

- Opening Image: 0-1k
- Set-Up: 1k-10k
- Inciting Incident: ~10k
- Debate: 10k-20k
- Threshold / point of no return: ~20k
- Fun & Games / premise fulfilment: 20k-40k
- Midpoint: ~40k
- Bad Guys Close In: 40k-60k
- All Is Lost / Darkest Moment: ~60k
- Climax: 60k-75k
- Climactic Moment: ~75k
- Denouement: 75k-80k

## Retained principle

The useful lesson is not the fixed word counts. It is **relative pacing position**.

Normalised to an 80k baseline, the rough positions are:

- opening image: 0-1.25%
- setup: 1.25-12.5%
- inciting incident: ~12.5%
- debate: 12.5-25%
- threshold: ~25%
- premise exploration / fun & games: 25-50%
- midpoint: ~50%
- escalation / bad guys close in: 50-75%
- all is lost: ~75%
- climax: 75-93.75%
- climactic moment: ~93.75%
- denouement: 93.75-100%

This allows the same structural reference to scale to novels of different lengths without falsely presenting one exact word count as a law.

## Architecture translation

Represent pacing beats as optional calibration anchors, not mandatory gates.

Suggested shape:

```json
{
  "id": "beat.midpoint",
  "label": "Midpoint",
  "target_fraction": 0.50,
  "tolerance": 0.10,
  "dramatic_function": ["reversal", "revelation", "commitment", "reframing"],
  "required": false,
  "source_model": "save-the-cat-like",
  "provenance": {}
}
```

The system should support multiple plot frameworks at once and compare them without declaring one universally correct.

## Crow doctrine

The Crow may use beat maps to ask:

- What function is currently missing?
- Is an inciting disturbance occurring unusually late or early?
- Has the premise been promised but not meaningfully explored?
- Does the midpoint actually reframe stakes, strategy, or understanding?
- Does late escalation emerge from prior state or appear from nowhere?
- Is the denouement paying emotional and relational consequences?

It should **not** say a story is wrong merely because a beat lands outside a reference percentage.

## Relationship to Reader Promise

The image's "Fun & Games" region is especially useful when translated as **premise fulfilment**.

If the concept promises:

- dragon riding,
- forbidden magic,
- celestial repair,
- detective work,
- political intrigue,
- enemies-to-lovers tension,
- space salvage,
- time-loop problem solving,

then the middle of the story should actually let the reader experience that promise before escalating or subverting it.

This connects directly to the Reader Promise ledger:

```text
concept promise
-> early setup / expectation
-> premise fulfilment
-> complication / inversion
-> climax / payoff
```

## Character Becoming connection

Beat position does not equal character growth.

For each structural beat, track the associated character-state change:

- inciting incident: what assumption becomes unstable?
- threshold: what commitment, refusal, or irreversible step occurs?
- midpoint: what belief, strategy, relationship, or knowledge state changes?
- darkest moment: what identity claim fails under pressure?
- climax: what choice demonstrates who the character has become?
- denouement: what new normal proves the change persisted?

## Failure modes

Flag for review, not automatic correction:

- fixed beat percentages treated as hard law
- arbitrary event inserted solely to satisfy a beat location
- climax defined only as physical conflict
- midpoint with no actual state change
- darkest moment disconnected from prior character stakes
- denouement that reports change without showing durable consequences
- concept promise repeatedly deferred until too late

## General rule

**Use beat maps as clocks, not cages.**

Structure should help a writer sense pacing pressure and promise fulfilment while preserving genre, form, voice, nonlinear structure, and intentional deviation.
