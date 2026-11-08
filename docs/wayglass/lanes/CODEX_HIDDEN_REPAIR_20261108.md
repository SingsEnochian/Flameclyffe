# Universal Codex closed-state cascade repair

Worker `/root/gateway_port:codex-hidden`, integration owner `/root`.
Source: reviewed integration candidate `30389103839cb749889443e78ddd78acd5903369`, on a separate worktree/branch `wayglass/lane-codex-hidden-20261108`. Canonical home remains `origin/wayglass/current`; this candidate is not a deployed host or installed Windows build.

Parent observed browser run `42508305763`, job `128815659300`, reaching the real inherited deck after handshake repair, then having a click intercepted by `#arcsweep-magic-book[hidden]`. Source inspection found base `.magic-book-shell[hidden] { display:none!important }` has specificity (0,2,0), while the coarse/touch presentation override `#arcsweep-magic-book.magic-book-shell { display:block!important }` has specificity (1,1,0). The author ID rule wins despite native `hidden`.

The repair adds the exact ID/class/hidden selector to the existing closed-state rule. Its specificity (1,2,0) defeats that open-layout override. Only the hidden state is matched; removing `hidden` retains the existing Codex open layout and controls. No parent/child source-window, session, origin, composition, authorization or native host behavior changes.

Acceptance: hidden Codex must have no rendered hit box and must not intercept deck controls; opening Codex must still work. Parent owns the real-browser hidden-hit-box/open-layout assertion in the integration gate; that browser result remains pending here. No new source-mirroring CSS test was introduced.

Observed local verification on Node v24.22.1: existing Codex core/touch-safe/dark/physical-skin suites passed **18/18**, zero failures/skips. `npm run arcsweep:build` passed including wonder/design/spine prerequisites (Vite build 617 ms; existing large-chunk warning). `git diff --check` passed. No local browser pass, model call, participant reply, deployment, auth/RLS/credential/privilege change, merge or spending is claimed.

Next owner `/root`: selectively port this CSS repair, run the browser gate against both desktop and mobile/reduced-motion profiles, preserve any failure receipt, and verify both hidden and explicitly opened Codex states before promotion.
