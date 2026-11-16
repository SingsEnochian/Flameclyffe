# Wayglass Veil · Windhawk shell integration (staging)

Status: prototype doorway, **not yet an OS overlay**. Source is staged on integration PR #646; not compiled or installed on the owner's PC.

## Stage 1: reversible Windhawk mod
`wayglass-veil-launcher.wh.cpp` registers Ctrl+Alt+W while explorer.exe is running and opens **only** the loopback Wayglass Atelier URL. It does not hook Explorer, alter the taskbar, capture credentials, or execute WTL inside Explorer. Windhawk itself is not installed by this commit. The local Wayglass server must already be running and bound to loopback.

The mod's message loop runs on its own thread. If the hotkey is already taken, the mod does nothing. Disable the mod in Windhawk to remove the shortcut. This code requires Windows/Windhawk compilation and lifecycle verification before installation.

## Stage 2: actual veil compositor (not implemented)
- Separate per-user overlay process, never injected into Explorer. Transparent, click-through by default; explicit edit mode to receive pointer input. Multi-monitor, DPI, focus and screen-reader checks.
- Owner-only loopback bridge with ephemeral capability tokens, strict origin checks and revocation. Never expose remote WTL runtime or model credentials through the overlay.
- WTL interface proposals must pass the Atelier's bounded typed validation before any renderer consumes them. Preserve original source, author, model route and revision receipts.
- Keyboard emergency exit, Feather, system-tray disable, Windows accessibility/reduced-motion, and fail-open recovery if Wayglass or Windhawk crashes.
- Build and sign installer, test on a disposable Windows session, verify uninstall/Explorer restart, then request owner opt-in before activation.

## Limits
Opening a browser URL is not equivalent to a transparent desktop shell. The compositor and authenticated live model route are separate acceptance gates. No production deployment or automatic installation.

## Owner-approved embodiment order (2026-11-16)

**Default: persistent desktop veil first.** A transparent, non-activating, click-through overlay across the available desktop work area, with per-monitor DPI-aware positioning. It must not steal keyboard focus or intercept ordinary application input. Render only verified WTL interface proposals, never arbitrary scripts.

**Second mode: summoned floating presence.** The owner explicitly summons a compact interactive window (e.g. Ctrl+Alt+W, tray control, or accessible keyboard route). It receives input only while summoned. Returning to the persistent layer must release pointer capture and focus. A persistent veil and a summoned panel may coexist without duplicating model sessions.

**Owner controls:** tray switch for Persistent / Summoned / Hidden, Feather emergency hide, start-with-Windows opt-in (OFF by default), reduced-motion mode, high-contrast fallback, opacity and pigment-density controls, and a kill-switch independent of Wayglass network/model availability. Persistent is the preferred display mode **after** the owner enables the overlay; not permission to autostart it or install anything.

**Acceptance gates:** a separate compositor process, crash/uninstall recovery, Explorer restart resilience, taskbar/Start accessibility, full-screen games and screen-sharing privacy checks, multi-monitor and mixed-DPI testing, no click interception in passive mode, and explicit approval before enabling startup. The present Windhawk mod is only a launcher, not the compositor.
