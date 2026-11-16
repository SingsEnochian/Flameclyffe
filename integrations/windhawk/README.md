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
