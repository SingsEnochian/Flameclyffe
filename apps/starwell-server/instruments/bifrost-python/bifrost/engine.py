"""BIFRÖST — the engine that folds a myth into structure and opens structure
back into myth, along a controlled cycle that never returns to the same point.

    collapse -> release -> collapse -> release

Each crossing advances along an outward spiral:

    r_{n+1} = r_n + Δr_n

so the bridge remembers every crossing and grows broader, stronger, and more
articulate — without dissolving either shore. Both banks stay lit; the join is
named as a rhyme, never a reduction.
"""
from __future__ import annotations
from typing import Optional
import os
import json

from .models import Breath, SEEDS, COLLAPSE, RELEASE
from .lineage import Lineage


class Bifrost:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-5",
        lineage_path=None,
        remember: bool = False,
        r0: float = 0.0,
        delta: float = 1.0,
    ):
        self.model = model
        self.delta = delta

        self.store: Optional[Lineage] = None
        if lineage_path is not None or remember:
            self.store = Lineage(lineage_path)
        self.lineage: list[Breath] = self.store.all() if self.store else []
        self.r: float = self.lineage[-1].r if self.lineage else r0

        self._client = None
        key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if key:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=key)
            except Exception:
                self._client = None

    @property
    def can_translate_live(self) -> bool:
        return self._client is not None

    @property
    def remembers(self) -> bool:
        return self.store is not None and self.store.persistent

    def cross(self, seed: str, direction: str = COLLAPSE) -> Optional[Breath]:
        """Make one crossing. Returns a Breath, or None if a new seed can't be
        translated live."""
        seed = (seed or "").strip()
        if not seed:
            return None
        key = seed.lower()

        if key in SEEDS:
            s = SEEDS[key]
            b = Breath(seed, direction, s["measured"], s["felt"], s["bridge"], live=False)
        else:
            gen = self._generate_live(seed, direction)
            if gen is None:
                return None
            b = Breath(seed, direction, gen["measured"], gen["felt"], gen["bridge"], live=True)

        b.index = len(self.lineage) + 1
        self.r = self.r + self.delta
        b.r = round(self.r, 4)
        self.lineage.append(b)
        if self.store:
            self.store.append(b)
        return b

    breathe = cross

    def forget(self) -> None:
        """Release the remembered spiral — exits open both ways."""
        self.lineage = []
        self.r = 0.0
        if self.store:
            self.store.forget()

    def _generate_live(self, seed: str, direction: str) -> Optional[dict]:
        if not self._client:
            return None
        facing = (
            "The seed is offered as a MYTH. Collapse stroke: fold it into structure "
            "(lead into The Measured), but render The Felt fully too."
            if direction == COLLAPSE else
            "The seed is offered as a MEASUREMENT / scientific idea. Release stroke: open "
            "it into myth (lead into The Felt), but render The Measured fully too."
        )
        system = (
            "You are the translation core of Bifröst, a dual-aspect bridge. Reality is one "
            "territory with two honest descriptions:\n"
            "- THE MEASURED: third-person, structural, scientific. Real concepts, clean and "
            "clinical. No mysticism smuggled in.\n"
            "- THE FELT: first-person, mythic, imaginal. Vivid, reverent, the language of "
            "image and meaning.\n"
            "Neither reduces to the other. Given a SEED and a stroke, return ONLY a JSON "
            'object: {"measured": "...", "felt": "...", "bridge": "..."}\n'
            "- measured: 2-4 sentences of precise structural/scientific description.\n"
            "- felt: 2-4 sentences of first-person mythic description.\n"
            "- bridge: 1-2 sentences naming the CORRESPONDENCE as an honest rhyme — a "
            "resonance or metaphor. NEVER claim the science IS the myth, that the myth is "
            "'just' the science, or that one proves the other. Keep both banks standing; "
            "dissolve no boundary. If the rhyme is loose, say so plainly.\n"
            "No markdown, no code fences, no preamble. JSON only."
        )
        try:
            msg = self._client.messages.create(
                model=self.model,
                max_tokens=1000,
                system=system,
                messages=[{"role": "user", "content": f'SEED: "{seed}"\nSTROKE: {facing}'}],
            )
            text = "".join(
                block.text for block in msg.content if getattr(block, "type", "") == "text"
            )
            clean = text.replace("```json", "").replace("```", "").strip()
            obj = json.loads(clean)
            if all(k in obj for k in ("measured", "felt", "bridge")):
                return obj
        except Exception:
            return None
        return None


BreathingBridge = Bifrost
