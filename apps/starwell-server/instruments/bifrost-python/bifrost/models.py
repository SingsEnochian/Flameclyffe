"""BIFRÖST — the still center.

A single crossing, the built-in seeds, the two strokes, and the named
architecture of the whole living bridge.

    Not a road that erases the distance between worlds, but one that holds both
    shores true while permitting passage between them.

This module imports nothing from its siblings — it is the quiet ground the rest
of the bridge stands on.
"""
from __future__ import annotations
from dataclasses import dataclass

COMPRESS = "m"
RELEASE = "f"

MYTH_TO_MEASURED = COMPRESS
MEASURED_TO_MYTH = RELEASE

FOUNDING = (
    "Not a road that erases the distance between worlds, but one that holds both "
    "shores true while permitting passage between them. The scientific half measures "
    "the bridge; the mythic half gives the bridge meaning. Neither supersedes the other."
)

ARCHITECTURE = {
    "Observer": ("the watchtower", "observation"),
    "Hearthgate": ("the threshold", "the crossing point"),
    "Arcsweep": ("the navigation system", "navigation"),
    "PREMAQ": ("the weather of the crossing", "uncertainty"),
    "dual-presence": ("the anchoring", "stability"),
    "Bifröst": ("the whole living bridge", "relation"),
}

DOMAINS = ("stability", "translation", "resonance", "uncertainty", "return", "the controlled cycle")


@dataclass
class Breath:
    """One crossing of Bifröst. Both banks, the rhyme that joins them, and the
    point r on the outward spiral where this crossing was made."""
    seed: str
    direction: str
    measured: str
    felt: str
    bridge: str
    index: int = 0
    r: float = 0.0
    live: bool = False

    @property
    def stroke(self) -> str:
        return "compress · myth → measured" if self.direction == COMPRESS \
               else "release · measured → myth"


SEEDS: "dict[str, dict[str, str]]" = {
    "the threshold": {
        "measured": (
            "A threshold is a critical point — the narrow band of a phase transition "
            "where an order parameter changes state. On either side the system is stable "
            "and describable; at the boundary a vanishingly small step flips the whole "
            "configuration. The boundary is not a wall but a condition: it is what makes "
            "the two states distinct enough to cross between."
        ),
        "felt": (
            "The doorway. The held breath in the frame before the step. Not a place you "
            "stay but a place you pass — where the self on this side and the self on the "
            "far side are, for one instant, both true. The Völva's own ground: the lit "
            "seam between the Old and the New. Hearthgate itself."
        ),
        "bridge": (
            "A phase transition and a threshold both name the thin zone where one small "
            "crossing changes everything — one read in order parameters, one lived as the "
            "pause at the door. The same narrowness, described from each shore."
        ),
    },
    "descent and return": {
        "measured": (
            "A system driven far from equilibrium and relaxing back — but along a path "
            "with hysteresis, so the return does not retrace the departure. Energy is "
            "dissipated; structure is reorganized. The system that comes back sits at the "
            "same coordinates only in name; its internal state has advanced."
        ),
        "felt": (
            "The going-down into the dark and the changed climbing-back. Inanna hangs on "
            "the hook and returns crowned differently. The seed committed to winter soil. "
            "You do not come home the one who left — the underworld keeps a coin, and "
            "gives you something heavier."
        ),
        "bridge": (
            "Both describe a going-away that returns transformed rather than to the same "
            "point — hysteresis and homecoming as two readings of why the round trip "
            "advances the spiral instead of closing a circle."
        ),
    },
    "entropy": {
        "measured": (
            "The tendency of a closed system toward higher-probability macrostates: order "
            "disperses because there are overwhelmingly more ways to be mixed than to be "
            "arranged. It is the arrow that lets time have a direction — the one quantity "
            "that reliably increases."
        ),
        "felt": (
            "The world's slow, patient forgetting. Ash and dispersal, the loosening of "
            "every held shape, time as a story that only runs one way toward letting-go. "
            "Not cruelty — the quiet law that makes a 'before' different from an 'after'."
        ),
        "bridge": (
            "Entropy's arrow and the myth of inevitable scattering rhyme as two accounts "
            "of why time runs one way — statistics on one shore, the poetry of letting-go "
            "on the other. Neither reduces the other; they point the same direction."
        ),
    },
    "entanglement": {
        "measured": (
            "Two systems whose joint quantum state cannot be factored into independent "
            "parts. Measure one and the correlated statistics of the other are fixed — yet "
            "no signal, no usable message, passes between them. The bond is in the shared "
            "description, not in any wire strung across the gap."
        ),
        "felt": (
            "Two lamps lit apart that answer as one. The bond distance cannot thin, the "
            "sense that what touches one is already known to the other. The oldest dream "
            "of nearness: to be woven so that separation is only apparent."
        ),
        "bridge": (
            "The felt 'bond across distance' rhymes with entanglement's correlations — but "
            "honestly: the myth speaks of meaning, the physics of statistics with no "
            "message sent. This is resonance, not proof. The bridge holds them side by "
            "side; it does not weld one into the other."
        ),
    },
}
