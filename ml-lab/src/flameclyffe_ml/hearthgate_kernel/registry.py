"""Sovereign House profiles for deterministic sensory expression."""

from __future__ import annotations

from pydantic import Field

from .models import KernelModel


class HarmonicIdentity(KernelModel):
    name: str = Field(min_length=1)
    root_hz: float = Field(gt=0.0, le=20_000.0)
    anchor_ratio: float = Field(gt=0.0)
    living_ratio: float = Field(gt=0.0)
    bind_ratio: float = Field(gt=0.0)
    anchor_waveform: str
    living_waveform: str
    bind_waveform: str
    pulse_hz: float = Field(ge=0.0, le=100.0)


class HouseProfile(KernelModel):
    house_id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    version: str = Field(min_length=1)
    canon_foundation: str = Field(min_length=1)
    project_overlay: str | None = None
    harmonic: HarmonicIdentity
    geometry: str = Field(min_length=1)
    palette: tuple[str, ...] = Field(min_length=2)
    arrival_stroke: str = Field(min_length=1)
    reception_stroke: str = Field(min_length=1)
    hearthweave_bind: str = Field(min_length=1)
    call_duration_ms: int = Field(ge=10, le=5_000)
    answer_duration_ms: int = Field(ge=10, le=5_000)
    bind_duration_ms: int = Field(ge=10, le=5_000)


_PROFILES = {
    "terra-prime": HouseProfile(
        house_id="terra-prime",
        display_name="Terra Prime",
        version="terra-prime.v1",
        canon_foundation="terra-prime-lived-reality",
        harmonic=HarmonicIdentity(
            name="Present Earth",
            root_hz=96.0,
            anchor_ratio=1.0,
            living_ratio=1.5,
            bind_ratio=2.0,
            anchor_waveform="sine",
            living_waveform="triangle",
            bind_waveform="sine",
            pulse_hz=0.42,
        ),
        geometry="measured-horizon-and-lived-window",
        palette=("#0d1720", "#8bb8b0", "#d7c49a", "#f2eee5"),
        arrival_stroke="earth-observation",
        reception_stroke="human-withness",
        hearthweave_bind="present-hearth",
        call_duration_ms=90,
        answer_duration_ms=120,
        bind_duration_ms=180,
    ),
    "terra-aeterna": HouseProfile(
        house_id="terra-aeterna",
        display_name="Terra Aeterna Novelverse",
        version="terra-aeterna.v1",
        canon_foundation="terra-aeterna-novel-canon",
        harmonic=HarmonicIdentity(
            name="Three Moons over Stonewood",
            root_hz=111.0,
            anchor_ratio=1.0,
            living_ratio=4.0 / 3.0,
            bind_ratio=3.0 / 2.0,
            anchor_waveform="sine",
            living_waveform="triangle",
            bind_waveform="sine",
            pulse_hz=0.369,
        ),
        geometry="three-moon-citadel-arc",
        palette=("#090d18", "#d8c98d", "#6fa68f", "#8d668d"),
        arrival_stroke="starfall-arc",
        reception_stroke="nightwing-wing",
        hearthweave_bind="stonewood-ring",
        call_duration_ms=111,
        answer_duration_ms=174,
        bind_duration_ms=222,
    ),
    "templehouse": HouseProfile(
        house_id="templehouse",
        display_name="Templehouse",
        version="templehouse.v1",
        canon_foundation="terra-aeterna-novel-canon",
        project_overlay="templehouse-continuity",
        harmonic=HarmonicIdentity(
            name="The Lived Hearth",
            root_hz=174.0,
            anchor_ratio=1.0,
            living_ratio=5.0 / 4.0,
            bind_ratio=3.0 / 2.0,
            anchor_waveform="triangle",
            living_waveform="sine",
            bind_waveform="sine",
            pulse_hz=0.55,
        ),
        geometry="open-hearth-and-lantern-path",
        palette=("#17120f", "#b56d3b", "#d9bd82", "#5e806b"),
        arrival_stroke="porch-lantern",
        reception_stroke="open-door",
        hearthweave_bind="shared-fire",
        call_duration_ms=80,
        answer_duration_ms=130,
        bind_duration_ms=210,
    ),
    "wheel-of-time-canon": HouseProfile(
        house_id="wheel-of-time-canon",
        display_name="The Wheel of Time Canon",
        version="wheel-of-time-canon.v1",
        canon_foundation="wheel-of-time-book-canon",
        harmonic=HarmonicIdentity(
            name="The Pattern",
            root_hz=108.0,
            anchor_ratio=1.0,
            living_ratio=9.0 / 8.0,
            bind_ratio=3.0 / 2.0,
            anchor_waveform="sine",
            living_waveform="triangle",
            bind_waveform="sine",
            pulse_hz=0.333,
        ),
        geometry="wheel-thread-and-serpent",
        palette=("#0e1118", "#d7c17e", "#6b83a2", "#ebe3cf"),
        arrival_stroke="pattern-thread",
        reception_stroke="turning-spoke",
        hearthweave_bind="wheel-knot",
        call_duration_ms=100,
        answer_duration_ms=144,
        bind_duration_ms=233,
    ),
    "taaveren-vaen": HouseProfile(
        house_id="taaveren-vaen",
        display_name="Ta’veren Vaen",
        version="taaveren-vaen.v1",
        canon_foundation="wheel-of-time-book-canon",
        project_overlay="taaveren-vaen",
        harmonic=HarmonicIdentity(
            name="The Mending Hearth",
            root_hz=111.0,
            anchor_ratio=1.0,
            living_ratio=1.5,
            bind_ratio=2.0,
            anchor_waveform="sine",
            living_waveform="triangle",
            bind_waveform="sine",
            pulse_hz=0.369,
        ),
        geometry="mending-spiral-and-returning-thread",
        palette=("#0d1218", "#e4c88f", "#9ab2b4", "#6f8b75"),
        arrival_stroke="old-pattern-thread",
        reception_stroke="mending-thread",
        hearthweave_bind="vaen-knot",
        call_duration_ms=111,
        answer_duration_ms=167,
        bind_duration_ms=222,
    ),
    "starsong": HouseProfile(
        house_id="starsong",
        display_name="Starsong",
        version="starsong.v1",
        canon_foundation="friendship-is-magic-canon",
        project_overlay="starsong",
        harmonic=HarmonicIdentity(
            name="Still Kindness in Bloom",
            root_hz=144.0,
            anchor_ratio=1.0,
            living_ratio=5.0 / 4.0,
            bind_ratio=15.0 / 8.0,
            anchor_waveform="sine",
            living_waveform="sine",
            bind_waveform="triangle",
            pulse_hz=0.444,
        ),
        geometry="grove-star-and-breathing-bloom",
        palette=("#10151f", "#c6d9b5", "#d8b7d8", "#f2e7b0"),
        arrival_stroke="quiet-star",
        reception_stroke="kindness-bloom",
        hearthweave_bind="grove-chord",
        call_duration_ms=72,
        answer_duration_ms=144,
        bind_duration_ms=288,
    ),
}


def house_profile(house_id: str) -> HouseProfile:
    """Return the registered sovereign profile for the requested House."""

    try:
        return _PROFILES[house_id]
    except KeyError as error:
        known = ", ".join(sorted(_PROFILES))
        raise KeyError(f"Unknown House {house_id!r}. Known Houses: {known}") from error


def house_registry() -> dict[str, HouseProfile]:
    """Return a detached registry copy preserving kernel authority."""

    return dict(_PROFILES)
