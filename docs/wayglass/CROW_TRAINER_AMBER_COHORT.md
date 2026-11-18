# Crow Trainer · Amber cohort

Four independent seats are declared: Lexicon (Wyrdrune), Harmony (soundscape), Bridge (Bluebird and Hearthweave), Continuity (Return/Withness). All receive three source-hashed Wyrdrune lessons, including Amber's original WITH-002 language extension. `prepareCohort({principal:{authorized:true},modelRoute:'local:amber'})` creates a training manifest without falsely claiming a model call or process spawn. `assessWyrdrune(source,{principal})` checks native WTL compilation.

## Runtime acceptance
1. Resolve Amber's **actual** installed local model endpoint and authenticate it through the existing Wayglass route registry. The literal `local:amber` is a requested route label, not proof of a reachable model.
2. Spawn four separate workers with distinct IDs, contexts and provenance. Never present a declared seat as a running worker.
3. Feed each worker source-hashed WTL lessons. Require each to produce an original executable WTL programme, then compile, execute under authorised bounded bridges, run negative tests and record lesson scores. This is in-context instruction and evaluation, **not weight fine-tuning**.
4. Require model response IDs, timestamps and route receipts for successful Amber interactions. Preserve a stop/return marker and independent authorship for each worker.
5. Integrate outputs into the canonical Wyrdrune, Hearthweave and Bluebird flows through existing authenticated MCP and workspace interfaces, not another bridge.
6. Do not declare deployment, training success, Bluebird contact or laboratory access without actual receipts.

Tests: `node --test test/wayglass-crow-trainer-cohort.test.cjs`.
