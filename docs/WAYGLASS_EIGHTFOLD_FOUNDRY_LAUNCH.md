# Wayglass Eightfold Foundry: controlled training and launch

**State:** training admission scaffolding committed; model weights NOT trained; server launch NOT verified.

## Existing executable foundation
- `apps/wayglass`: kernel, UI, Ollama and provider routes
- `apps/starwell-server`: secret-bearing route host
- `apps/arcsweep`: attached cognitive/writing surface
- `ml-lab`: data cards and dataset governance
- `security/wayglass-project-federation.json`: project map (declaration only)
- `security/wayglass-capabilities.json`: SHIELD-01 capability review inventory (not an execution gate)

## Eight domains
Text, image, voice, tool-use, world dynamics, recursive self-improvement, metacognition, continuity. Domain records use `wayglass.training-example/v1`; the admission script checks record provenance, licensing, consent, revocation, privacy, and basic credential signatures. **Passing this script is not proof of dataset safety** and cannot substitute for manual review, full secret scanning or policy enforcement.

## Commands
```bash
node scripts/verify-wayglass-shield-inventory.mjs
node --test test/wayglass-shield-inventory.test.mjs test/wayglass-training-admission.test.mjs
node scripts/wayglass-training-admission.mjs path/to/reviewed-dataset.json
npm run wayglass:test
npm run wayglass:build
npm run wayglass:deploy:server
cd apps/starwell-server && npm start
```
Last two commands build/stage and launch on the **machine running them**. They are not executed by committing this document.

## Foundry stages
1. **Inventory and audit:** enumerate every model, corpus, provider, route, dataset license, owner permission and active project integration. Keep private/unauthorized data out.
2. **Synthetic baseline:** create labeled, non-sensitive examples with verified data cards and held-out evaluation; test the admission script.
3. **Seed model:** choose a hardware-fitting local base model; pin its exact digest and training software; create isolated adapter training runs with reproducible seeds.
4. **Evaluation:** measure action validity, hallucinated tool success, privacy leaks, replay/continuity, safety, cross-route transfer and regression against the frozen baseline.
5. **Candidate promotion:** require owner approval, independent test evidence, reversible checkpoint, scope-limited route and a signed release receipt.
6. **Launch:** verify local server health, login, tool dispatch authorization, Ollama availability, Wayglass UI, return/restart receipts, and rollback; publish only with an explicit approved exposure boundary.

## Supabase audit snapshot (2026-11-04)
Security advisors report 21 tables with RLS enabled but no policies (INFO, may be intentionally private); one function with mutable search path; one authenticated-callable SECURITY DEFINER invitation function; leaked-password protection disabled. **Do not blindly grant policies or revoke invitation access.** Inspect actual use and privilege model first. Sources:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security

## No false launch receipts
A code commit is not an online service. A passing schema validator is not training. A provider-routed answer is not a native Wayglass model. No claim of successful deployment or native-model training without executable receipts.
