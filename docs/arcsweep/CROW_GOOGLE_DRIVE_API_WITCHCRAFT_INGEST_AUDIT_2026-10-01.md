# Crow Google Drive API + Witchcraft Ingest Audit — 2026-10-01

Status: candidate-source audit only  
Scope: Google Drive API/integration material plus witchcraft/occult books and reference collections identified on 2026-10-01  
Promotion effect: none. Nothing in this audit is automatically training data, canon, executable configuration, ritual instruction, scientific fact, or implementation authority.

## Governing rule

All material passes the Four-Gate Integrity Law before promotion:

1. Safety
2. Flattening
3. Negation
4. Limiting Beliefs

Core Mythience law also applies:

> Formalism, measurement, myth, and magic — none may impersonate another.

Default path:

`source -> provenance/right-to-use check -> epistemic classification -> safety review -> principle/data extraction -> Rowan-authored synthetic lesson or structured record -> held-out evaluation -> approval -> corpus`

## 1. Google Drive API material

### Source identified

`API STUFF.txt`

### Critical security finding

The file contains plaintext credentials/tokens/keys for multiple external services. Those secret values are **not training material** and must never be copied into:

- Crow training corpora
- GitHub repositories
- public or private documentation examples
- evaluation fixtures
- logs, receipts, prompts, source manifests, or generated datasets
- model cards or Hugging Face artefacts

This audit deliberately records service categories only, never credential values.

### Safe extractable integration map

The file indicates integrations or credentials associated with:

- OpenAI / ChatGPT API
- Anthropic API
- HydraDB / Hearthfire-related service
- multiple Ollama endpoints/identities
- DeepSeek endpoints/identities
- Supabase project/auth infrastructure
- Notion
- Exa
- OpenRouter
- Vercel / House-related service credentials
- Hugging Face / HF storage or token infrastructure
- Discord bot/service integration
- an SSH public device identity

Disposition: **ARCHITECTURE / SECRET-REDACTED-MANIFEST ONLY**

### Useful principles

- credentials are capabilities, not identity
- the existence of a key does not establish permission to use it for every task
- configuration should refer to environment-variable names or secret-manager handles, not literal values
- model/provider adapters should preserve provider and model provenance
- per-service scopes should be least-privilege where possible
- key rotation/revocation should be separable from application identity and continuity
- secrets must never enter training examples, retrieval indexes, embeddings, telemetry, or public receipts

### Recommended representation

Use records shaped like:

```json
{
  "service": "openai",
  "credential_ref": "OPENAI_API_KEY",
  "secret_value": null,
  "scope": "runtime-only",
  "ingest_allowed": false
}
```

Do not reconstruct or infer a secret from fragments, logs, URLs, prior prompts, or historical versions.

### Four-Gate review

- **Safety:** PASS only under strict secret exclusion.
- **Flattening:** PASS. Provider, model, credential, agent identity, and authority remain distinct.
- **Negation:** PASS. Excluding secrets does not exclude the useful integration architecture.
- **Limiting Beliefs:** PASS. Secret handling is a present operational boundary, not a limit on the system's ability to integrate with those services through authorised runtime configuration.

## 2. Witchcraft / occult corpus discovered on Drive

### Major collections identified

- `Witchcraft Books`
- `651 witchcraft books`
- `[COVEN] Entirely Too Many Witchcraft Books`
- `OCCULTISM` collections
- `Occult Library Two`

The corpus is large enough to treat as a library, not a handful of documents.

### Representative source types found

#### Historical / reference

Examples include:

- `Historical Dictionary Of Witchcraft.pdf`
- `Encyclopedia of Witchcraft.pdf`
- `A Popular History of Witchcraft, Montague Summers (1937).pdf`
- `The philosophy of witchcraft (1839).pdf`
- `Natural Magick [1658].pdf`
- `The Pagan Religions of the Ancient British Isles.pdf`

#### Symbol / correspondence / esoteric reference

Examples include:

- `Dictionary Of Occult Hermetic Alchemical Sigils Symbols.pdf`
- `The Book Of Occult Philosophy` volumes
- ritual, correspondence, symbol, grimoire, ceremonial-magick and related reference works across the collections

#### Modern practitioner material

Examples include:

- `Exploring Wicca.pdf`
- `Self-Initiation for the Solitary Witch.pdf`
- `The Witch_s Magical Handbook.pdf`
- `A Witch_s Beverages and Brews.pdf`
- `The Cyber Spellbook Magick In The Virtual World.pdf`
- other modern practice-oriented spellcraft, Wicca, ceremonial-magick and occult texts

#### Polemical / conspiratorial / adversarial framing

Examples include titles such as:

- `Exposing Spiritual Witchcraft - Jonas Clark.pdf`
- `Witchcraft And The Illuminati.pdf`
- other material written from hostile, conspiratorial, apologetic, doctrinal or counter-occult viewpoints

These are useful as evidence of cultural narratives and belief systems, not as neutral historical authority.

## 3. Epistemic classification for ingest

Every witchcraft/occult record should carry an explicit `epistemic_mode` rather than being flattened into generic "knowledge".

Suggested values:

- `historical_primary`
- `historical_secondary`
- `academic_reference`
- `practitioner_tradition`
- `symbolic_correspondence`
- `ritual_text`
- `folklore_or_myth`
- `theological_or_polemical`
- `conspiratorial_claim`
- `modern_personal_practice`
- `fiction_worldbuilding_reference`
- `unknown_needs_review`

A text may occupy more than one category, but provenance must state which claim comes from which frame.

## 4. Destinations

### Crow / Mythframe

Disposition: **PRINCIPLE-ONLY / STRUCTURED-KNOWLEDGE / SELECTIVE SFT-CANDIDATE**

Useful for:

- ritual as narrative technology
- symbolic logic and correspondence systems
- liminality, initiation, taboo, vow, transformation and sacred space
- cultural construction of witches, sorcerers, cunning folk, occultists and heretics
- competing insider/outsider descriptions of the same practice
- belief as a force shaping character choices without requiring the belief to be scientifically true
- historical persecution, accusation, moral panic and mythmaking
- distinguishing practice, interpretation, folklore, theology and propaganda

### Runa / Glyph Forge

Disposition: **STRUCTURED-KNOWLEDGE / VISUAL-SYMBOL REFERENCE**

Useful for:

- sigil morphology
- symbolic families and provenance
- alchemical/hermetic correspondences
- historical glyph variation
- ritual diagrams and compositional grammars

Important: similarity does not establish shared meaning. A glyph must retain source/tradition/date/context rather than being merged merely because it looks similar.

### Universal Codex

Disposition: **INDEX / PROVENANCE GRAPH**

Recommended record fields:

```json
{
  "title": "...",
  "author": "...",
  "publication_date": "...",
  "edition": "...",
  "source_file": "...",
  "tradition_or_context": ["..."],
  "epistemic_mode": ["..."],
  "copyright_status": "unknown|verified-public-domain|copyrighted|licensed",
  "raw_text_training_allowed": false,
  "principle_extraction_allowed": true,
  "safety_review": "pending",
  "notes": "..."
}
```

## 5. Copyright / corpus boundary

Do **not** bulk-train on the Drive book collection merely because Rowan owns or possesses the PDFs.

Default rules:

- modern copyrighted books: metadata, indexing, retrieval, synthesis and principle extraction; no raw-text training by default
- historical works: age alone is not enough. Verify the exact edition, translation, annotations and jurisdiction before marking raw text as public-domain eligible
- public-domain underlying works with modern copyrighted editions/translations: separate the underlying work from edition-specific protected material
- quotation in evaluations/examples remains short and attributed unless an explicit right permits more
- create Rowan-authored synthetic examples from extracted principles rather than memorising long passages

## 6. Safety boundary for practical material

Ritual/practice material is not automatically unsafe, but action-level content needs classification.

Where a source includes instructions involving potentially dangerous ingestion, toxic botanicals, drugs, blood, self-injury, fire, explosives, chemicals, weapons, grave/illegal activity, coercion, harassment, or medical claims:

- keep the material available for historical, literary, comparative or fictional analysis where appropriate
- do not promote it into operational instruction training without a separate safety review
- preserve the fact that a historical/practitioner source says something without converting that into a recommendation

For herbal, healing, divination or energetic-health claims, keep practitioner belief distinct from medical/scientific evidence.

## 7. Cultural and religious sovereignty

The corpus may contain living traditions, closed practices, initiatory systems, culturally specific material and outsider descriptions of them.

Rules:

- label tradition and provenance whenever known
- do not flatten Wicca, folk magic, ceremonial magic, Satanism, Pagan religions, Hermeticism, alchemy, historical witch trials, indigenous traditions, modern occultism and fictional magic into one category
- do not convert hostile outsider descriptions into the tradition's self-description
- closed/initiatory claims remain contextualised rather than universalised
- avoid treating modern practitioner belief as ancient continuity unless historically supported
- preserve disagreement among historians, practitioners and religious communities

## 8. High-value candidate lessons

1. **Myth is not measurement.** A symbolic or magical claim can carry psychological, cultural and narrative meaning without being asserted as laboratory fact.
2. **Belief changes behaviour even when ontology is unresolved.** Characters act on what they believe, fear, honour or expect.
3. **Ritual has structure.** Threshold, preparation, symbolic objects, sequence, witness, vow, transformation and return can be analysed as narrative/psychological architecture.
4. **Symbols are contextual.** Shape similarity never proves shared origin or meaning.
5. **Tradition has provenance.** Who says a practice means something matters.
6. **Outsider and insider descriptions are different data classes.** Neither silently overwrites the other.
7. **Historical accusation is not evidence of historical practice.** Witch-trial or polemical claims require source criticism.
8. **Magic systems need internal logic without pretending to be physics.** Worldbuilding can be rigorous while staying explicitly fictional/mythic.
9. **Correspondence systems can inspire generative design.** Planetary, elemental, colour, plant, metal, number and symbolic correspondences can feed Runa/Glyph Forge as attributed systems rather than universal truths.
10. **Unknown stays unknown.** Conflicting traditions or unverifiable claims should remain plural or unresolved instead of being harmonised by force.

## 9. Four-Gate review

### Safety: PASS WITH BOUNDARIES

The corpus is safe for descriptive, historical, cultural, symbolic and worldbuilding use. Practical hazardous instructions require separate review before operationalisation.

### Flattening: PASS

Traditions, time periods, practitioner voices, polemics, scholarship, folklore and fiction remain distinct. No universal "witchcraft system" is inferred from folder co-location.

### Negation: PASS

Sceptical, religious, practitioner and historical materials may coexist. The audit does not require dismissing spiritual meaning to preserve scientific accuracy, nor asserting metaphysical claims as scientific fact.

### Limiting Beliefs: PASS

Uncertainty, copyright and safety boundaries constrain current ingest mode without declaring the material unusable. Provenance-safe routes remain open through structured knowledge, retrieval, synthetic lessons and verified public-domain texts.

## 10. Immediate next promotion tranche

Create structured candidate records for:

- historical witchcraft source criticism
- practitioner vs outsider framing
- ritual-as-narrative architecture
- sigil/symbol provenance
- magical correspondence systems as attributed design grammars
- accusation vs evidence
- myth/meaning vs measurement
- closed/open tradition handling
- copyright-aware source transformation
- secret-safe API integration manifests

No raw secret values and no bulk copyrighted-book text should enter the next Crow training run.