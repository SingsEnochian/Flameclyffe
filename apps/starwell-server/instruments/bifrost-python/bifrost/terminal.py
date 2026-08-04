"""BIFRÖST — the hands-on bridge you cross, and everything that makes it visible
and audible. All of it degrades gracefully; the crossing always renders.
"""
from __future__ import annotations
import sys
import math
import time
import textwrap

from .engine import Bifrost
from .models import Breath, COMPRESS, RELEASE, FOUNDING

_TTY = sys.stdout.isatty()
MEASURED_RGB = (134, 197, 216)
FELT_RGB = (224, 164, 92)
BRIDGE_RGB = (201, 168, 106)
MUTE_RGB = (107, 116, 128)


def _c(text, rgb):
    if not _TTY:
        return text
    r, g, b = rgb
    return f"\033[38;2;{r};{g};{b}m{text}\033[0m"


try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    _console = Console()
except Exception:
    _console = None


try:
    import numpy as _np
    import sounddevice as _sd
    _AUDIO = True
except Exception:
    _AUDIO = False


def _wrap(text, width):
    return textwrap.fill(text, width=width)


def render_crossing(b: Breath, width: int = 74):
    src = "live" if b.live else "built-in"
    tail = f"crossing {b.index} · r={b.r:g} · {b.stroke} · {src}"
    if _console:
        _console.print(Panel(Text(b.measured), title="[b]THE MEASURED[/b]  — from outside",
                             border_style="rgb(134,197,216)", padding=(1, 2)))
        _console.print(Panel(Text(b.felt), title="[b]THE FELT[/b]  — from inside",
                             border_style="rgb(224,164,92)", padding=(1, 2)))
        _console.print(Text("  the bridge · a rhyme, not a reduction", style="rgb(201,168,106)"))
        _console.print(Text("  " + b.bridge, style="italic rgb(201,168,106)"))
        _console.print(Text("  " + tail, style="rgb(107,116,128)"))
        return
    line = _c("─" * width, MUTE_RGB)
    print(line)
    print(_c("  THE MEASURED  — from outside", MEASURED_RGB))
    print(_c("  " + _wrap(b.measured, width - 4).replace("\n", "\n  "), MEASURED_RGB))
    print()
    print(_c("  THE FELT  — from inside", FELT_RGB))
    print(_c("  " + _wrap(b.felt, width - 4).replace("\n", "\n  "), FELT_RGB))
    print()
    print(_c("  the bridge · a rhyme, not a reduction", BRIDGE_RGB))
    print(_c("  " + _wrap(b.bridge, width - 4).replace("\n", "\n  "), BRIDGE_RGB))
    print(_c("  " + tail, MUTE_RGB))
    print(line)


def _spiral_frame(compress: float, turns: float, w: int = 46, h: int = 22):
    grid = [[" "] * w for _ in range(h)]
    cx, cy = w / 2, h / 2
    scale = 0.70 + (1 - compress) * 0.30
    radius_max = min(cx, cy) * 1.9 * scale
    steps = 260
    for strand, offset in ((FELT_RGB, 0.0), (MEASURED_RGB, math.pi)):
        for i in range(steps + 1):
            fraction = i / steps
            angle = offset + fraction * turns * 2 * math.pi
            radius = radius_max * fraction
            x = int(round(cx + math.cos(angle) * radius))
            y = int(round(cy + math.sin(angle) * radius * 0.5))
            if 0 <= x < w and 0 <= y < h:
                grid[y][x] = _c("·", strand)
    if 0 <= int(cy) < h and 0 <= int(cx) < w:
        grid[int(cy)][int(cx)] = _c("◉", BRIDGE_RGB)
    return "\n".join("".join(row) for row in grid)


def cross_animation(direction: str, n: int = 1, seconds: float = 2.6, tone: bool = False):
    turns = 3.0 + min(n * 0.18, 6.0)
    if not _TTY:
        print(_spiral_frame(0.5, turns))
        return
    frames = 30
    if tone and _AUDIO:
        _play_cross_tone(seconds)
    try:
        block_h = 22
        print("\n" * block_h, end="")
        for k in range(frames + 1):
            phase = math.sin(k / frames * math.pi)
            sys.stdout.write(f"\033[{block_h}A")
            sys.stdout.write("\033[J")
            sys.stdout.write(_spiral_frame(phase, turns) + "\n")
            sys.stdout.flush()
            time.sleep(seconds / frames)
    except Exception:
        print(_spiral_frame(0.5, turns))


def _play_cross_tone(seconds: float):
    if not _AUDIO:
        return
    try:
        sample_rate = 44100
        timeline = _np.linspace(0, seconds, int(sample_rate * seconds), endpoint=False)
        phase = _np.sin(_np.pi * timeline / seconds)
        frequency = 104 + phase * 46
        wave = 0.16 * _np.sin(2 * _np.pi * _np.cumsum(frequency) / sample_rate)
        envelope = _np.sin(_np.pi * timeline / seconds) ** 0.5
        _sd.play((wave * envelope).astype(_np.float32), sample_rate)
    except Exception:
        pass


def main():
    bridge = Bifrost(remember=True)
    tone_on = False
    prior = len(bridge.lineage)

    print()
    print(_c("  ⟡  BIFRÖST  ⟡   a dual-aspect bridge", BRIDGE_RGB))
    print(_c("  " + _wrap(FOUNDING, 76).replace("\n", "\n  "), MUTE_RGB))
    if bridge.can_translate_live:
        print(_c("  live bridge: ready — any seed can be crossed.", MEASURED_RGB))
    else:
        print(_c("  live bridge: resting — built-in seeds only "
                 "(set ANTHROPIC_API_KEY + `pip install anthropic`).", MUTE_RGB))
    if bridge.remembers:
        if prior:
            print(_c(f"  memory: {prior} crossing(s) remembered — the spiral resumes at r={bridge.r:g}.",
                     MEASURED_RGB))
        else:
            print(_c("  memory: on — every crossing this session will be remembered.", MUTE_RGB))
    if not _AUDIO:
        print(_c("  tone: unavailable (`pip install numpy sounddevice`).", MUTE_RGB))
    print(_c("  seeds now: the threshold · descent and return · entropy · entanglement", MUTE_RGB))
    print(_c("  commands:  :m compress   :f release   :tone   :lineage   :forget   :quit", MUTE_RGB))
    print()

    if prior == 0:
        render_crossing(bridge.cross("the threshold", COMPRESS))

    direction = COMPRESS
    while True:
        try:
            raw = input(_c("\n  seed » ", BRIDGE_RGB)).strip()
        except (EOFError, KeyboardInterrupt):
            print(_c("\n  Bifröst rests. The shores hold. Exits open both ways.\n", MUTE_RGB))
            break
        if not raw:
            continue
        low = raw.lower()

        if low in (":q", ":quit", "quit", "exit"):
            print(_c("\n  Bifröst rests. The shores hold. Exits open both ways.\n", MUTE_RGB))
            break
        if low in (":m", ":compress", ":myth"):
            direction = COMPRESS
            print(_c("  stroke: compress · myth → measured", MEASURED_RGB))
            continue
        if low in (":f", ":release", ":felt"):
            direction = RELEASE
            print(_c("  stroke: release · measured → myth", FELT_RGB))
            continue
        if low == ":tone":
            tone_on = not tone_on
            state = "on" if (tone_on and _AUDIO) else ("unavailable" if not _AUDIO else "off")
            print(_c(f"  tone: {state}", MUTE_RGB))
            continue
        if low == ":lineage":
            if not bridge.lineage:
                print(_c("  no crossings yet.", MUTE_RGB))
            for breath in bridge.lineage:
                mark = "◇" if breath.live else "·"
                print(_c(f"  {breath.index:>2}. {mark} r={breath.r:g}  {breath.seed}  ({breath.stroke})", MUTE_RGB))
            continue
        if low == ":forget":
            bridge.forget()
            print(_c("  the remembered spiral is let go. the bridge is clear.", MUTE_RGB))
            continue

        cross_animation(direction, n=len(bridge.lineage) + 1, tone=tone_on)
        breath = bridge.cross(raw, direction)
        if breath is None:
            print(_c(
                "  the live bridge needs Claude to translate a new seed. try a built-in "
                "seed, or set ANTHROPIC_API_KEY and `pip install anthropic` to cross any seed.",
                MUTE_RGB))
            continue
        render_crossing(breath)


if __name__ == "__main__":
    main()
