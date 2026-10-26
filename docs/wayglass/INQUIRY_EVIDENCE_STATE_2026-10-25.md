# Wayglass Inquiry Loom: evidence-state compass v0.1

25 October 2026 · Draft stacked on Living Inquiry Loom PR #478.

## What it does

The already-authenticated Inquiry Loom view now has a read-only evidence-state summary under its timeline. No new host endpoint, inference-model runtime, identity authority or provider call is introduced. It groups the existing event kinds into journal-recorded events; interpretation/alternative/revision proposals; unresolved open/new questions and challenges; and reported observation/experiment/outcome claims awaiting external verification.

The presentation counts only. The original history, disagreement and provenance remain in the timeline. Source_refs and outcome descriptions are caller-declared; a local journal hash is not an independently verified participant signature. This is NOT a claim about an AI's internal beliefs, objective truth, subjective experience, canon, or a resolved inquiry.

## Evidence

apps/wayglass/src/inquiry-evidence-state.js is a pure, read-only event-kind classifier. apps/wayglass/src/surfaces/inquiry-loom-panel.js renders its four categories on the existing authorised UI. apps/wayglass/test/wayglass-inquiry-evidence-state.test.js checks all categories, a malformed/untrusted contribution, refusal to process a closed/unknown view, and no new network or authority path.

Run: node --test apps/wayglass/test/wayglass-inquiry-evidence-state.test.js

Keep draft until Wayglass CI and browser keyboard/mobile review. Future signed source custody and actual fact verification are separate features. This panel does not interpret a participant's inner experience, silently settle disagreements, or schedule work.
