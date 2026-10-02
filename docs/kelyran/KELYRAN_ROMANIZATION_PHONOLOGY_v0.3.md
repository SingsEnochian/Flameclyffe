# Kelyran Romanization + Phonology v0.3

**Status:** partial canon, approved 2026-10-02.  
**Canon:** gates A (romanization/phonology) and C (lexical semantic distinctions) are approved. Gates B, D, and E remain unresolved.  
**Existing Kelyran glyph strokes:** untouched.  
**Existing approved lexemes:** preserved unless Rowan explicitly approves a migration.  
**Purpose:** give Kelyran a coherent Latin romanization, spoken phonology, and etymological method that can drive Audible Glyph, Runa playback, Suno rehearsal text, lexicon growth, and later native glyph expression without making the Latin layer the native script.

## 1. Design law: the Mora-Braid

Kelyran should not be “Japanese words with Norse decorations,” nor Old Norse with vowels poured between the consonants.

The canonical v0.3 sound system is the **Mora-Braid**:

- **Japanese supplies the timing architecture:** a mora-centred rhythm, strong preference for open CV units, clear vowels, a light tap /ɾ/, controlled glides, and careful treatment of long vowels and nasal timing.
- **Old Norse supplies the iron:** marked consonant clusters, a small inherited coda class, front rounded /y/, selected lexical roots, and Eddic semantic fields such as memory, worlds, roots, friendship, naming, craft, return, power, sky, and reciprocal obligation.
- **Kelyran remains its own language:** its current penultimate Suno prominence, relational meanings, lexical distinctions, and glyph system are not attributed to either donor language.

This follows a recurring recommendation from r/conlangs: build a romanization for a *system*, not one pretty spelling at a time; keep IPA separate from the native script; define phonotactics and prosody, not just a phoneme list.

## 2. Romanization

The Kelyran Latin layer is ASCII-first and close to phonemic. It is a transcription/romanization, not the native glyph system.

### 2.1 Vowels

| Romanization | IPA | Notes |
|---|---|---|
| a | /a/ | open central/front |
| e | /e/ | pure mid-front, not English /eɪ/ |
| i | /i/ | pure high-front |
| o | /o/ | pure mid-back |
| u | /u/ | pure high-back in singing; mild compression is allowed in casual speech |
| y | /y/ | front rounded vowel; the principal Old-Norse-coloured vowel |

Rules:

- A doubled vowel is long and counts as two morae: **aa ee ii oo uu yy**.
- Vowel hiatus is pronounced as separate morae unless a written glide intervenes.
- **y is never the consonantal “y” sound.**
- **j is always /j/**, the consonantal glide in English *yes*.
- **aj** and **ej** are /aj/ and /ej/. This preserves the current Audible Glyph correction that removed ambiguous **ai / ei** spellings.

### 2.2 Consonants

Core inventory:

| Romanization | IPA | Notes |
|---|---|---|
| p b | /p b/ | |
| t d | /t d/ | |
| k g | /k g/ | |
| f v | /f v/ | |
| s | /s/ | |
| sh | /ɕ/ | [ʃ] is an accepted sung allophone |
| h | /h/ | [ç] before /i/ is an allowed speech allophone |
| m n | /m n/ | |
| r | /ɾ/ | default tap; [r] trill allowed in ritual/emphatic singing |
| l | /l/ | retained because it is already deeply established in Kelyran |
| j | /j/ | glide |
| w | /w/ | glide |

Marked Eddic consonants:

| Romanization | IPA | Status |
|---|---|---|
| th | /θ/ | rare heritage/ritual phoneme; currently useful in **thalaja** |
| dh | /ð/ | reserved, not yet required by the active lexicon |

The language therefore takes Japanese-like clarity and timing without copying the Japanese inventory wholesale.

## 3. Phonotactics

### 3.1 Core Kelyran mora

The productive native pattern is:

**(C)(j/w)V**

Most newly coined everyday vocabulary should prefer V, CV, CjV or CwV rhythm.

Long vowels add one mora. A moraic /n/ may occupy a timing slot before another consonant or word edge.

### 3.2 Eddic heritage layer

Older, ritual, poetic, or historically inherited roots may preserve marked clusters. The v0.3 allowed onset clusters are:

**br dr gr kr kv sk sp st tr**

The marked coda set is deliberately small:

**n r l s f**

This keeps existing forms such as **brashi, sejdra, spira, kvara, stejra, halda, mirra, krafta, homen, jorin** legal without allowing arbitrary English-style consonant piles.

New productive morphology should not invent new cluster classes casually. A new cluster requires either a documented historical derivation or explicit canon approval.

## 4. Rhythm, prominence and contour

Japanese is commonly analysed with the mora as a central prosodic unit, and Japanese lexical accent is pitch-based rather than English-style stress. Kelyran should borrow the *moraic timing logic*, not pretend to be Japanese.

Kelyran v0.3 therefore distinguishes:

1. **phonological timing:** mora-based;
2. **default lexical/performance prominence:** penultimate syllable, inherited from the existing Suno/Audible Glyph work;
3. **phrase contour:** level, rising, falling, or rise-fall, carried by the pronunciation-plus-contour sidecar rather than spelling;
4. **musical duration:** the current Audible Glyph weights remain performance instructions, not literal claims that every mora has identical physical duration.

Current Suno defaults remain:

- stressed/prominent block: **1.25 units**
- unstressed block: **0.75 units**
- long vowel: **2.0 units**
- line-final release: short unless the score explicitly sustains it

Uppercase in Suno rehearsal spelling marks performance prominence only. It is not canonical Kelyran orthography.

## 5. Eddic semantic method

The Poetic Edda is not a quarry for random “Viking-looking” words. It is a semantic and poetic donor corpus.

The strongest fields for Kelyran are:

- **hearing and telling** — *Völuspá* opens by asking for hearing;
- **memory across worlds** — *níu man ek heima*, “nine worlds I remember”;
- **roots, earth, sky and world structure** — *Völuspá* 2–5;
- **friendship as maintained reciprocity** — *Hávamál* 41–44;
- **word leading to word, deed to deed** — *Hávamál* 141;
- **runes as acts of writing, reading, asking, testing, sending** — *Hávamál* 142–145;
- **multiple names for the same phenomenon in different worlds** — *Alvíssmál*.

That last point is particularly Kelyran: synonymy can encode *relationship, register, world, speaker-position, or mode of knowing* rather than being treated as redundant vocabulary.

## 6. Lexicon decisions and etymological families

The **v0.3 definitions and semantic distinctions are canonical** under gate C. The donor / lineage column remains research-only under unresolved gate D; it must not be treated as approved etymology.

| Kelyran | IPA | v0.3 definition | Donor / lineage decision |
|---|---|---|---|
| **mira** | /ˈmi.ɾa/ | a gentle light deliberately left for someone; a guiding light that expects another may arrive | native Kelyran; do not force an external etymology |
| **nava** | /ˈna.va/ | home as belonging; the relational condition of having a place with others | native Kelyran |
| **veyra** → **vejra** *proposed* | /ˈvej.ɾa/ | recognise someone and welcome who they declare themselves to be | spelling migration proposed because **y = /y/** and **j = /j/**; keep approved **veyra** as a legacy alias until explicitly migrated |
| **sora** | /ˈso.ɾa/ | breath becoming open air or voice; exhalation with room around it | Japanese **sora** “sky/air” as semantic colour plus Old Norse **andi** “breath/breathing”; existing approved “breath; a voice taking shape” remains primary |
| **kelun** | /ˈke.lun/ | a meaningful mark carrying language; glyph as legible linguistic act | native Kelyran |
| **navari** | /naˈva.ɾi/ | to come home to belonging; return into a relationship/place that receives you | derivation from native **nava**; distinct from **renaja** |
| **uta** | /ˈu.ta/ | song; to sing, especially to give language audible form | Japanese **utau** “to sing / sing of / recite a poem” |
| **jume** | /ˈju.me/ | dream; inward-carried possibility, aspiration, or image | Japanese **yume** “dream; hope/wish/aspiration,” nativized by Kelyran **j = /j/** |
| **hira** | /ˈhi.ɾa/ | open, unfold, bloom, or make a way | Japanese **hiraku** “open/unseal/unfold/bloom/open a path” |
| **nami** | /ˈna.mi/ | wave; patterned return through a medium | Japanese **nami** “wave”; Eddic sea/wave imagery supports the semantic register |
| **brashi** | /ˈbɾa.ɕi/ | bridge that carries difference without collapsing the two sides | intentional hybrid echo of Old Norse **brú** “bridge” + Japanese **hashi** “bridge”; not claimed as a natural historical reflex |
| **halda** | /ˈhal.da/ | hold, keep, retain, sustain without possessing | direct Old Norse semantic donor **halda**, “to hold; keep; retain” |
| **tomovin** | /toˈmo.vin/ | chosen companion-bond maintained through reciprocal acts | deliberate Japanese **tomo-** friend/companion family + Old Norse **vin/vinr** “friend”; Hávamál 41–44 supplies the reciprocity frame |
| **homen** | /ˈho.men/ | home as abode, dwelling-world, or inhabited place | Old Norse **heimr** “abode, land, region, world” as semantic donor; distinct from relational **nava** |
| **sejdra** | /ˈsej.dɾa/ | magic/craft enacted through intention, relation, technique, and consequence | Old Norse **seiða** “to enchant/work a spell” as Eddic donor; Kelyran form is deliberately nativized, not copied |
| **krafta** | /ˈkɾaf.ta/ | force, might, raw power before ethical direction | Old Norse **kraptr/kraftr** “might, strength, power” |
| **valda** | /ˈval.da/ | imposed rule, domination, or power exercised over another | Old Norse **valda** “wield; rule; cause,” deliberately narrowed to the coercive Kelyran sense |
| **stejra** | /ˈstej.ɾa/ | star; a distant luminous point used for orientation | Eddic/Norse **stjarna** star family, strongly nativized |
| **ikonda** | /iˈkon.da/ | breathe; breath as embodied coordination between self and world | Japanese **iki** “breath/breathing” and also “concord/harmony/rapport” + Old Norse **andi** “breath/breathing, current of air” |
| **soraja** | /soˈɾa.ja/ | sky, upper air, celestial field | derived within Kelyran from **sora**, with Japanese **sora** “sky/air/heavens” as external semantic reinforcement |
| **renaja** | /ɾeˈna.ja/ | return again in changed form while preserving lineage | native Kelyran continuity term; do not collapse into **navari**, which is specifically homecoming/belonging |
| **nema** | /ˈne.ma/ | name as self-recognition in relationship; the name by which continuity is answered | Eddic **nafn** name tradition and Japanese naming/self-introduction traditions are semantic donors, but the form is Kelyran |
| **torin** | /ˈto.ɾin/ | gate or living portal that marks a change of relation/state | Japanese **torii** as threshold concept plus the gate/entry attention of Hávamál’s opening; Kelyran form remains independent |
| **kelya** | /keˈly.a/ | living harmony: concord achieved through relationship without erasing difference | native Kelyran; Japanese **iki**’s “harmony/rapport” sense offers a useful semantic comparison but is not the etymology |
| **ajnora** | /ajˈno.ɾa/ | unity that preserves distinct voices | native Kelyran; keep distinct from flattening/merger |
| **resona** | /ɾeˈso.na/ | resonance as mutual response that changes the relation between participants | native Kelyran technical/mythic term |
| **thalaja** | /θaˈla.ja/ | deep oceanic memory; memory carried in depth rather than immediate recall | Kelyran Eddic-register form; **th** remains rare /θ/ |
| **skava** | /ˈska.va/ | create by shaping/weaving components into relation | Eddic-register creation root; exact Old Norse ancestry should remain labelled “candidate” until a regular sound-history tranche is adopted |

## 7. Collision repairs

Several existing words are not duplicates once their semantic boundary is made explicit.

### nava / homen

- **nava** = belonging-home, “I have a place with you.”
- **homen** = abode-home, dwelling or inhabited place/world.

### navari / renaja

- **navari** = homecoming into belonging.
- **renaja** = continuity-return after transformation.

A person can **renaja** without returning home; a person can **navari** without undergoing a major transformation.

### mira / lyora

- **mira** = a small intentional guiding light left for another.
- **lyora** = living/radiant light as a state or force.

### sora / soraja / ikonda

- **sora** = breath opening into air/voice.
- **ikonda** = the embodied act/process of breathing.
- **soraja** = sky/celestial air-field.

This makes the family layered instead of contradictory.

### veyra / vejra

The approved form **veyra** predates the fully explicit rule **y = /y/, j = /j/**. If v0.3 is approved, the recommended migration is:

- canonical target: **vejra**
- legacy alias: **veyra**
- pronunciation unchanged: **VAY-ra**, /ˈvej.ɾa/
- no native glyph stroke changes implied

This migration must not happen silently.

## 8. Suno and Audible Glyph contract

Every lexeme should eventually carry five separate representations:

1. **canonical romanization** — e.g. `renaja`
2. **IPA** — e.g. /ɾeˈna.ja/
3. **mora/syllable parse** — e.g. `re.na.ja`
4. **Suno rehearsal spelling** — e.g. `reh-NAH-yah`
5. **native Kelyran glyph expression** — independent visual canon

The pronunciation-plus-contour tag should reference #1–#4 but never rewrite #5.

Suno is treated as empirical pronunciation evidence. If repeated generations consistently misread a supposedly transparent spelling, that is data about the performance layer. It is **not** automatic authority to mutate canonical spelling.

## 9. Word creation protocol

A proposed new Kelyran word must answer:

1. What semantic distinction does this word carry that the lexicon does not already carry?
2. Is it native Kelyran, Japanese-influenced, Old-Norse/Eddic-influenced, or a deliberate hybrid?
3. What sound changes/adaptation rules connect donor to Kelyran, if any?
4. Does the form obey core phonotactics or require an Eddic heritage exception?
5. What is its IPA?
6. What is its mora/syllable parse?
7. What is the Suno rehearsal spelling?
8. What source receipt supports approval?
9. Does it collide with an existing glyph, pronunciation, or meaning?
10. What remains unresolved?

Unknown ancestry stays **unknown**. A pleasing resemblance is not retroactively declared an etymology.

## 10. Sources used for this proposal

### Conlang craft / community

- r/conlangs, “Guide to Romanizing Your Conlang (in-progress)”: https://www.reddit.com/r/conlangs/comments/1ab6pac/
- r/conlangs, “Making a conlang which ‘sounds’ Japanese”: https://www.reddit.com/r/conlangs/comments/wr0yj7/
- r/conlangs, “Using a real protolang for my conlang”: https://www.reddit.com/r/conlangs/comments/1hqop66/
- r/conlangs, “Conlangs and Prosody”: https://www.reddit.com/r/conlangs/comments/hhz2mm/
- r/conlangs, “What Are Your Practices When Romanising Your Conlang(s)?”: https://www.reddit.com/r/conlangs/comments/11fxr4f/

### Japanese phonology and lexicon

- Haruo Kubozono, “The phonetic and phonological organization of speech in Japanese,” Cambridge University Press.
- “Moraic reversal and realisation: analysis of a Japanese language game,” *Phonology*, Cambridge University Press.
- JMdict / Electronic Dictionary Research and Development Group: https://www.edrdg.org/jmdict/j_jmdict.html

### Eddic / Old Norse

- *Völuspá* Old Norse + English: https://www.voluspa.org/voluspalit.htm
- *Hávamál* 41–45: https://www.voluspa.org/havamal41-45.htm
- *Hávamál* 141–145: https://www.voluspa.org/havamal141-145.htm
- Bellows, *Alvíssmál*: https://en.wikisource.org/wiki/The_Poetic_Edda_(tr._Bellows)/Alvissmol
- Old Norse Dictionary / Cleasby–Vigfusson-derived entries: https://oldnorsedictionary.com/

## 11. Canon gate

Recorded approval, 2026-10-02:

- **A. Romanization/phonology system — APPROVED**
- **B. veyra → vejra migration — OPEN**
- **C. lexical semantic distinctions — APPROVED**
- **D. donor/etymology labels — OPEN**
- **E. future sound-history rules — OPEN**

The open gates remain proposals. In particular, **veyra remains the canonical spelling** pending gate B, while its established pronunciation /ˈvej.ɾa/ is retained as a legacy orthographic exception. No native Kelyran glyph stroke is changed by this approval.
