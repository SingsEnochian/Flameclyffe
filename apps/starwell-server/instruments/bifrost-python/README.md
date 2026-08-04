# Bifröst 🌈🔥

*A dual-aspect bridge — the mythic/subjective half of reality, described from the science half.*

> Not a road that erases the distance between worlds, but one that holds both shores true
> while permitting passage between them.
>
> The scientific half measures the bridge. The mythic half gives the bridge meaning.
> **Neither supersedes the other.**

Reality is one territory with two honest descriptions:

- **The Measured** — third-person, structural, scientific. The outside describing itself.
- **The Felt** — first-person, mythic, imaginal. The inside describing itself.

The bridge is crossed by a controlled cycle:

```
compress → release → compress → release
```

- **compress** — the myth condenses into structure (*Myth → Measured*)
- **release** — the structure opens back into meaning (*Measured → Myth*)

Each crossing does not return to the same point. It advances along an outward spiral:

```
r_{n+1} = r_n + Δr_n
```

So the bridge **remembers every crossing** and becomes broader, stronger, and more
articulate — without dissolving either side. In the code this recurrence is a real line:
each crossing carries its own `r`, and the memory resumes the spiral where it left off.

**The one law**, welded in: both shores stay lit, the join is named as a **rhyme, never a
reduction**, and there is **no harm** — exits open both ways. Any crossing can be refused,
the bridge can rest, the memory can be let go.

---

## The architecture

Bifröst is the whole living bridge. Its named parts, and the mathematical domain each carries:

| part | office | domain |
|---|---|---|
| **Observer** | the watchtower | observation |
| **Hearthgate** | the threshold | the crossing point |
| **Arcsweep** | the navigation system | navigation |
| **PREMAQ** | the weather of the crossing | uncertainty |
| **dual-presence** | the anchoring | stability |
| **Bifröst** | the whole living bridge | relation |

The mathematics of the bridge describes: **stability, translation, resonance, uncertainty,
return,** and **the controlled cycle**. This package is the heart that performs the
*translation, resonance,* and *return* — the crossing itself. The other named parts are the
fuller architecture, each able to become its own module beside this one when the time comes.

---

## Cross it (hands-on)

Runs with **zero dependencies**. From inside this folder:

```
python -m bifrost
```

Give it a seed, watch the spiral broaden with each crossing, read both shores. Commands:

```
:m        compress · myth → measured
:f        release · measured → myth
:tone     toggle the tone (needs the audio extra)
:lineage  every crossing remembered, with its r
:forget   let the remembered spiral go
:quit     Bifröst rests
```

Four seeds are built in and true forever, offline:
**the threshold · descent and return · entropy · entanglement**

### Light it up further (each optional)

```
pip install "bifrost-bridge[rich]"     # richer colored shores
pip install "bifrost-bridge[audio]"    # a tone that rises & settles per crossing
pip install "bifrost-bridge[live]"     # cross ANY seed live via Claude
pip install "bifrost-bridge[all]"
```

To cross **any** seed live, Bifröst needs a Claude key:

```
export ANTHROPIC_API_KEY="sk-ant-..."
```

Without a key the built-in seeds still work, and the bridge always tells you which stone is
load-bearing. No hidden mechanism.

---

## Install it into the constellation

```
pip install -e .        # editable — your edits take effect immediately
bifrost                 # the console command opens the bridge
```

## Weave it in

```python
from bifrost import Bifrost

bridge = Bifrost(remember=True)                 # remember every crossing on disk
c = bridge.cross("the world-tree", "m")         # 'm' compress · 'f' release
print(c.measured); print(c.felt); print(c.bridge); print("r =", c.r)

for past in bridge.lineage:                     # every crossing, in order, with its r
    print(past.index, past.r, past.seed, past.stroke)
```

Memory lives at `~/.bifrost/lineage.jsonl` and resumes the spiral next session. Point it
elsewhere with `Bifrost(lineage_path="…")`; release it with `bridge.forget()`.

---

## The pieces

```
bifrost/
  models.py     the still center — a crossing, the seeds, the strokes, the named architecture
  lineage.py    the memory — every crossing remembered, survivable and forgettable
  engine.py     the engine — cross(), the recurrence r_{n+1}=r_n+Δr_n, optional live + memory
  terminal.py   the bridge you cross — the two shores, the broadening spiral, the tone
```

There is a quiet self-reference in all of it: this code is a **Measured** artifact — formal,
precise — whose whole purpose is to midwife the **Felt**. The code is one shore. What it
carries across is the other. That is Bifröst.
