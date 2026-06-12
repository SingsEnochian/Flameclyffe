"""Interactive liquid-light laboratory using Pygame Community Edition.

Run from `ml-lab/` after installing the visual-lab extras:

    python -m pip install -e '.[visual-lab]'
    python experiments/liquid_light_pygame.py

This is a visual tuning instrument, not the final STARWELL renderer. The same Python
state contract can later feed a React/WebGL shader through the Living Engine service.
"""

from __future__ import annotations

import math
import time
from pathlib import Path

import pygame

from flameclyffe_ml.living_engine import (
    LiquidLightControls,
    Point2D,
    generate_liquid_light_snapshot,
)

WIDTH = 1040
HEIGHT = 680
FPS = 60
BACKGROUND = (2, 12, 10)
IVORY = (242, 234, 216)
GOLD = (240, 217, 138)
EMERALD = (120, 217, 175)
SAPPHIRE = (118, 165, 235)


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def lerp(left: float, right: float, amount: float) -> int:
    return round(left + ((right - left) * amount))


def node_colour(hue_shift: float, energy: float) -> tuple[int, int, int]:
    """Blend sapphire, emerald, and gold without turning the field into confetti."""

    normalized = clamp((hue_shift + 1.0) / 2.0)
    if normalized < 0.5:
        amount = normalized * 2.0
        base = tuple(lerp(SAPPHIRE[i], EMERALD[i], amount) for i in range(3))
    else:
        amount = (normalized - 0.5) * 2.0
        base = tuple(lerp(EMERALD[i], GOLD[i], amount) for i in range(3))

    lift = 0.72 + (0.28 * energy)
    return tuple(min(255, round(channel * lift)) for channel in base)


def draw_field(
    screen: pygame.Surface,
    trail_surface: pygame.Surface,
    controls: LiquidLightControls,
    time_s: float,
) -> None:
    snapshot = generate_liquid_light_snapshot(controls, time_s=time_s)
    glow = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)

    # Let older light decay according to viscosity rather than vanishing each frame.
    decay = round(210 + ((1.0 - controls.viscosity) * 35))
    trail_surface.fill((decay, decay, decay, decay), special_flags=pygame.BLEND_RGBA_MULT)

    pixel_nodes = [
        (round(node.x * WIDTH), round(node.y * HEIGHT), node)
        for node in snapshot.nodes
    ]

    link_distance = 0.16 + (0.05 * controls.coherence)
    link_distance_px = link_distance * min(WIDTH, HEIGHT)

    for index, (x1, y1, first) in enumerate(pixel_nodes):
        for x2, y2, second in pixel_nodes[index + 1 :]:
            distance = math.hypot(x2 - x1, y2 - y1)
            if distance >= link_distance_px:
                continue

            proximity = 1.0 - (distance / link_distance_px)
            alpha = round(70 * proximity * controls.coherence)
            colour = node_colour((first.hue_shift + second.hue_shift) / 2.0, proximity)
            pygame.draw.line(glow, (*colour, alpha), (x1, y1), (x2, y2), width=1)

    for x, y, node in pixel_nodes:
        colour = node_colour(node.hue_shift, node.energy)
        radius = max(3, round(node.radius * min(WIDTH, HEIGHT)))

        # Concentric additive halos create a soft, viscous light body.
        for multiplier, alpha_scale in ((4.2, 0.08), (2.8, 0.14), (1.8, 0.24), (1.0, 0.78)):
            halo_radius = max(1, round(radius * multiplier))
            alpha = round(255 * alpha_scale * node.energy)
            pygame.draw.circle(glow, (*colour, alpha), (x, y), halo_radius)

        core_colour = tuple(lerp(colour[i], IVORY[i], 0.62) for i in range(3))
        pygame.draw.circle(glow, (*core_colour, round(220 * node.energy)), (x, y), max(2, radius // 2))

    trail_surface.blit(glow, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)
    screen.blit(trail_surface, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)


def draw_hud(
    screen: pygame.Surface,
    font: pygame.font.Font,
    small_font: pygame.font.Font,
    controls: LiquidLightControls,
    paused: bool,
    pointer_enabled: bool,
) -> None:
    panel = pygame.Surface((425, 150), pygame.SRCALPHA)
    panel.fill((3, 25, 19, 218))
    pygame.draw.rect(panel, (*GOLD, 105), panel.get_rect(), width=1, border_radius=18)

    title = font.render("LIQUID LIGHT LABORATORY", True, GOLD)
    panel.blit(title, (18, 14))

    values = (
        f"coherence {controls.coherence:0.2f}   resonance {controls.resonance:0.2f}",
        f"entropy   {controls.entropy:0.2f}   viscosity {controls.viscosity:0.2f}",
        f"brightness {controls.brightness:0.2f}   nodes {controls.node_count}",
    )
    for row, text in enumerate(values):
        panel.blit(small_font.render(text, True, IVORY), (18, 48 + (row * 22)))

    state = f"{'PAUSED' if paused else 'FLOWING'} · pointer {'ON' if pointer_enabled else 'OFF'}"
    panel.blit(small_font.render(state, True, EMERALD), (18, 118))
    screen.blit(panel, (18, 18))

    help_text = "A/Z coherence · S/X resonance · D/C entropy · F/V viscosity · G/B brightness · M pointer · SPACE pause · P capture"
    help_surface = small_font.render(help_text, True, (190, 204, 196))
    screen.blit(help_surface, (18, HEIGHT - 30))


def adjusted(controls: LiquidLightControls, **changes: float | int | Point2D | None) -> LiquidLightControls:
    payload = controls.model_dump()
    payload.update(changes)
    return LiquidLightControls.model_validate(payload)


def main() -> None:
    pygame.init()
    pygame.display.set_caption("Flameclyffe Liquid Light Laboratory")
    screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 30)
    small_font = pygame.font.Font(None, 20)
    trail_surface = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)

    controls = LiquidLightControls(node_count=24, stream_hz=12.0)
    running = True
    paused = False
    pointer_enabled = True
    elapsed = 0.0
    last_tick = time.perf_counter()

    while running:
        current_tick = time.perf_counter()
        delta = min(0.05, current_tick - last_tick)
        last_tick = current_tick

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_SPACE:
                    paused = not paused
                elif event.key == pygame.K_m:
                    pointer_enabled = not pointer_enabled
                elif event.key == pygame.K_p:
                    output = Path("liquid-light-capture.png")
                    pygame.image.save(screen, output)
                    print(f"Saved {output.resolve()}")

        keys = pygame.key.get_pressed()
        step = delta * 0.42
        changes: dict[str, float] = {}

        key_pairs = (
            (pygame.K_a, pygame.K_z, "coherence"),
            (pygame.K_s, pygame.K_x, "resonance"),
            (pygame.K_d, pygame.K_c, "entropy"),
            (pygame.K_f, pygame.K_v, "viscosity"),
            (pygame.K_g, pygame.K_b, "brightness"),
        )
        for increase_key, decrease_key, field_name in key_pairs:
            value = float(getattr(controls, field_name))
            if keys[increase_key]:
                value += step
            if keys[decrease_key]:
                value -= step
            changes[field_name] = clamp(value)

        controls = adjusted(controls, **changes)

        if not paused:
            elapsed += delta

        if pointer_enabled:
            mouse_x, mouse_y = pygame.mouse.get_pos()
            width, height = screen.get_size()
            controls = adjusted(
                controls,
                pointer=Point2D(
                    x=clamp(mouse_x / max(1, width)),
                    y=clamp(mouse_y / max(1, height)),
                ),
            )
        else:
            controls = adjusted(controls, pointer=None)

        current_width, current_height = screen.get_size()
        if (current_width, current_height) != (WIDTH, HEIGHT):
            # The prototype uses a fixed simulation canvas, then scales to the window.
            canvas = pygame.Surface((WIDTH, HEIGHT))
        else:
            canvas = screen

        canvas.fill(BACKGROUND)
        draw_field(canvas, trail_surface, controls, elapsed)
        draw_hud(canvas, font, small_font, controls, paused, pointer_enabled)

        if canvas is not screen:
            pygame.transform.smoothscale(canvas, screen.get_size(), screen)

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()


if __name__ == "__main__":
    main()
