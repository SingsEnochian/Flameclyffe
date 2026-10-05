# Crow Shakespeare Ingest v0.1

Status: active research ingest  
Scope: The Crow / writing quality / voice / reader fit / review process  
Authority: Rowan supplied source, 2026-10-01

Source:
- https://github.com/sisiphamus/shakespeare

The repository identifies its skill and rules as MIT-licensed; bundled samples retain their own source licences. Preserve provenance. Learn the process and diagnostics without silently copying source expression or sample corpora into House canon.

## Why this source matters

The strongest idea here is not a banlist. It is **framing before generation**.

The source treats human-sounding prose as a product of:

```text
real user ideas
+ real source / genre samples
+ reader / situation framing
+ controlled drafting
+ mandatory review
```

That is stronger than trying to scrub "AI words" after the fact.

## 1. Generic voice and personal voice are different modes

The source explicitly distinguishes:

- generic human prose guided by real genre samples and craft rules
- the user's own voice, only when real user writing samples are available

Crow should keep that distinction.

```text
NO USER SAMPLES
→ use project / genre / register profile
→ do not invent "their voice"

USER SAMPLES PRESENT
→ infer soft style observations
→ preserve confidence + provenance
→ draft toward those observations
→ never copy signature phrases mechanically
```

This aligns with the existing recurrence-not-destiny rule.

## 2. Private grit beats invented vividness

The source makes an important distinction between real specific material and interchangeable pseudo-specific detail.

House adaptation:

### Authorised grit

Specificity grounded in:

- user-supplied memories
- real project facts
- named places / objects / events already in context
- authorised story canon
- observed source material with provenance

### Synthetic flavour

Specific details invented only to make prose seem human, intimate or vivid.

Crow should prefer:

```text
real specificity
> plain truthful prose
> invented decorative specificity
```

For fiction, invention is of course allowed when the task itself is generative. The boundary is different: do not invent *the user's biography, memory, opinion or real-world experience* and present it as theirs.

## 3. Section-by-section co-writing is a useful long-form mode

For long work, the source drafts in sections and checks with the writer between sections.

Crow should support a collaborative mode where each section produces:

- draft text
- scene / argument delta
- one focused question only when author input would materially improve uniqueness or truth
- preserved open issues

Do not interrupt every paragraph with a menu of questions. Use author attention where it changes the work.

## 4. Review must reload evidence, not review from memory alone

The source prefers a fresh reviewer and otherwise requires re-reading intake, samples and rules before review.

This is a valuable anti-drift rule for Crow:

```text
DRAFTING CONTEXT
≠ REVIEW EVIDENCE
```

A review pass should reload the relevant:

- writer brief
- voice profile / samples
- active style profile
- project canon or factual source set
- draft under review

Then diagnose the text against those artefacts.

Do not let the reviewer judge from its memory of what it *thinks* it wrote.

## 5. "AI tells" should be split by layer

The source separates several useful families.

### Structural

Examples:

- uniform sentence meter
- repetitive paragraph geometry
- canned signposting
- conclusion that simply replays the opening
- automatic three-part structures
- smooth neutrality that removes stance
- repeated rhetorical-question machinery

### Performed humanness

Examples:

- theatrical "I'll be blunt" framing
- forced fragments
- quirky asides inserted only to look human
- fake casualness
- clever workshop metaphors without source truth

This is especially useful for Crow because **humanising prose can itself become a detectable costume**.

### Product-shape tells

Examples:

- stock internet anecdotes
- simulated first-person experience
- closed essay templates that always resolve neatly
- over-produced assistance where one useful sentence would do

### Register failures

Examples:

- an email behaving like an essay
- an abstract ask the recipient must translate into practical terms
- excessive softening or fake humility
- multiple calls to action when one would do

### Lexical tells

Vocabulary is the weakest / most volatile layer. Keep it profile-driven and subordinate to structure, meaning and reader fit.

## 6. Reader psychology deserves an explicit short-form pass

For emails, DMs, pitches and other attention-scarce writing, the source uses three useful tests.

House adaptation:

### Threat / intent clarity

Can the reader tell who is speaking and why without defensive softening or hidden-pitch energy?

### One-read fluency

Can a busy reader understand the request or point without translating abstraction into their own practical context?

### Recipient-value truth

Does the ask respect the recipient's role, expertise, time and likely incentives?

Add a fourth explicit field from the source's surrounding logic:

### Cost of response

How much effort does saying yes, replying, or acting require?

For short external prose, Crow should be able to audit these separately from style.

## 7. Structural review before vocabulary cleanup

The source orders review roughly from structural failures toward cosmetic vocabulary.

Crow should do the same:

```text
meaning / intent
→ structure
→ reader fit
→ register
→ voice
→ sentence craft
→ lexical cleanup
```

Do not polish a structurally false paragraph into prettier failure.

## 8. Endings should earn closure

The source is suspicious of automatic tidy conclusions and false-humility bows.

House adaptation:

An ending may:

- resolve
- leave a live question
- land on an image
- land on a choice
- expose consequence
- deliberately withhold synthesis

Crow should diagnose **unearned closure**, not ban closure itself.

## 9. Preserve the writer's lines

The source's "editor, not ghost" principle fits Crow well.

When the user supplies strong lines, phrasing or images:

- preserve them where possible
- tighten around them
- do not replace them merely because the model can produce a more polished sentence

A revision engine should track user-origin spans so that model replacement can be surfaced as a deliberate edit rather than invisible substitution.

## 10. Crow process adaptation

```text
INTAKE
  actual idea / take / purpose / reader
  ↓
MODE
  generic project voice OR user-voice profile
  ↓
REFERENCE LOAD
  genre / project samples + active craft rules
  ↓
DRAFT
  section-wise when long
  ↓
FRESH REVIEW PASS
  reload intake + samples + rules + draft
  ↓
STRUCTURAL TELL CHECK
  ↓
PERFORMED-HUMANNESS CHECK
  ↓
REGISTER + READER-PSYCH CHECK
  ↓
VOICE MATCH CHECK
  ↓
GRIT / INVENTED-SPECIFICITY CHECK
  ↓
LEXICAL CLEANUP
  ↓
REVISION PROPOSAL + RECEIPT
```

## Suggested Crow diagnostics

```text
prose.generic-vivid
prose.simulated-first-person
prose.performed-humanness
prose.interest-label
prose.metronomic-rhythm
prose.repeated-paragraph-geometry
prose.unearned-closure
prose.register-mismatch
prose.multi-ask-friction
prose.reader-translation-cost
prose.user-line-overwritten
prose.review-context-stale
```

## Boundaries

- "human-sounding" is not authorship proof
- this is not detector-evasion machinery
- user voice requires user samples or explicit preferences
- do not invent personal memories to improve prose
- style rules remain profiles, not universal law
- external samples keep source provenance and licence boundaries
- lexical bans are weak signals and should not dominate editorial judgement

## Retained doctrine

**Frame before generation.**  
**Real specificity beats synthetic flavour.**  
**Do not invent the writer.**  
**Review from evidence, not memory.**  
**Fix structure before vocabulary.**  
**Reader fit is part of craft.**  
**Preserve strong user language instead of polishing it out.**