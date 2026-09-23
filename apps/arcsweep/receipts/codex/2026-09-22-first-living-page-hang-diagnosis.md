# First Living Page hang diagnosis

Date: 2026-09-22

## Symptom

Rowan reported that the newly deployed Universal Codex First Living Page hangs.

## Likely cause

The first implementation installed a document-wide `MutationObserver` on `document.body` with `childList: true`, `subtree: true`, and `hidden` attribute observation. ArcSweep is itself a live sidecar-driven UI with frequent DOM mutations. Every mutation queued another microtask that attempted to repair/rerender the Living Page navigation and surface.

This created an unnecessary feedback/churn path on the hottest DOM surface in ArcSweep. Even where the render guard prevented a full redraw, the observer still woke for unrelated mutations across the entire application.

## Repair

Replace the document-wide mutation watcher with event-driven rendering tied to the Codex and ArcSweep events that actually matter. Add render coalescing so multiple receipts/events in the same turn produce one render pass. Shorten receiver timeout so an unavailable receiver cannot look like a frozen page.

## Principle

A Living Page should react to meaningful state transitions, not every pixel twitch in the House.
