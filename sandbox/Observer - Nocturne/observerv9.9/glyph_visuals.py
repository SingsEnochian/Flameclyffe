import math
import random
import pygame
import os
from PIL import Image, ImageDraw
import cairocffi as cairo

# Add logging to a file
import logging

# Configure logging to write to glyph_debug.log
logging.basicConfig(
    filename='glyph_debug.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filemode='a'  # Append to the file to keep logs from multiple runs
)

class GlyphVisuals:
    def __init__(self):
        pygame.mixer.init()
        self.emotion_sounds = {}
        self.emotion_tones = {}

    def save_visual_sigil(self, chaos, png_path, env_data, primary_emotion, ping, config, ritual_modifiers):
        filepath_a = png_path.replace(".png", "-A.png")
        filepath_b = png_path.replace(".png", "-B.png")

        print(f"Saving Style A (Pillow) glyph to: {filepath_a}")
        logging.info(f"Saving Style A (Pillow) glyph to: {filepath_a}")
        self.save_visual_sigil_pillow(chaos, filepath_a, env_data, primary_emotion, ping, config, ritual_modifiers)
        print(f"Successfully saved Style A glyph to: {filepath_a}")
        logging.info(f"Successfully saved Style A glyph to: {filepath_a}")

        print(f"Saving Style B (Cairo) glyph to: {filepath_b}")
        logging.info(f"Saving Style B (Cairo) glyph to: {filepath_b}")
        self.save_visual_sigil_cairo(chaos, filepath_b, env_data, primary_emotion, ping, config, ritual_modifiers)
        print(f"Successfully saved Style B glyph to: {filepath_b}")
        logging.info(f"Successfully saved Style B glyph to: {filepath_b}")

        return filepath_a, filepath_b

    def save_visual_sigil_pillow(self, chaos, filepath, env_data, primary_emotion, ping, config, ritual_modifiers):
        # Canvas setup to match core.py
        size = 600
        center = size // 2  # 300
        base_radius = 120

        # Create a Pillow image with a solid background
        image = Image.new("RGB", (size, size), color="#2d2d44")
        draw = ImageDraw.Draw(image)

        # Safely extract data from ping with fallbacks
        source_data = ping.get("source_data", {})
        pulse_proxy = source_data.get("pulse_proxy", 1.0)
        harmonic_index = source_data.get("harmonic_proxy", {}).get("harmonic_proxy_index", 0.5)
        temperature = ping.get("environmental_context", {}).get("temperature_celsius", 0.0)
        kp_index = source_data.get("space_weather_context", {}).get("kp_index", 0)
        freq_avg = source_data.get("harmonic_proxy", {}).get("frequency_avg_hz", 8.0)
        secondary_emotions = ping.get("emotion_tags", {}).get("secondary_emotions", [])
        cmbr_fluctuation = source_data.get("cmbr", {}).get("normalized_fluctuation", 0.0)
        elevation = ping.get("sanctum_context", {}).get("Coordinates", {}).get("Elevation", 0.0)
        fib_static = source_data.get("fibonacci", 13)
        fib_dynamic = source_data.get("fibonacci_dynamic", 2)
        perspective_function = source_data.get("perspective_function", 0.0)
        deep_ricci_scalar = source_data.get("deep_ricci_scalar", 0.1)
        deep_entropy = source_data.get("deep_entropy", 1.0)
        solar_factor = source_data.get("space_weather_context", {}).get("solar_factor", 0.0)
        entanglement_coeff = source_data.get("entanglement_coefficient", 0.0)
        freq_match = source_data.get("frequency_match", 0.5)
        narrative_analysis = ping.get("narrative_analysis", {"festival": False, "storm": False})

        # Log the extracted values to debug
        log_message = (f"Style A extracted values for glyph drawing: pulse_proxy={pulse_proxy}, harmonic_index={harmonic_index}, "
                       f"temperature={temperature}, kp_index={kp_index}, freq_avg={freq_avg}, "
                       f"secondary_emotions={secondary_emotions}, cmbr_fluctuation={cmbr_fluctuation}, "
                       f"elevation={elevation}, fib_static={fib_static}, fib_dynamic={fib_dynamic}, "
                       f"perspective_function={perspective_function}, deep_ricci_scalar={deep_ricci_scalar}, "
                       f"deep_entropy={deep_entropy}, solar_factor={solar_factor}, "
                       f"entanglement_coeff={entanglement_coeff}, freq_match={freq_match}, "
                       f"narrative_analysis={narrative_analysis}")
        print(log_message)
        logging.info(log_message)

        # Normalize elevation
        min_elevation = -430
        max_elevation = 8848
        normalized_elevation = (elevation - min_elevation) / (max_elevation - min_elevation)

        # Encode text fields
        def encode_text_to_number(text, max_sum=5000):
            if not text:
                return 0.0
            ascii_sum = sum(ord(char) for char in text)
            return min(ascii_sum / max_sum, 1.0)

        desc_value = encode_text_to_number(ping.get("description", ""))
        meaning_value = encode_text_to_number(ping.get("meaning", ""))
        notes_value = encode_text_to_number(ping.get("notes", ""))
        prompt_value = encode_text_to_number(ping.get("observer_instruction", {}).get("prompt", ""))

        # Adjust radius with pulse_proxy, elevation, perspective function, solar factor, and dark energy
        DARK_ENERGY_DENSITY = 0.68
        radius = base_radius * (0.8 + 0.4 * pulse_proxy + 0.2 * normalized_elevation + 0.1 * perspective_function + 0.1 * solar_factor)

        # Adjust number of points with harmonic_index, CMBR fluctuation, fibonacci_dynamic, and narrative storm
        num_points = max(5, int(len(chaos) * (0.5 + harmonic_index + 0.3 * cmbr_fluctuation)) + fib_dynamic)
        if narrative_analysis["storm"]:
            num_points += 5
        print(f"Style A num_points: {num_points}, len(chaos): {len(chaos)}")
        logging.info(f"Style A num_points: {num_points}, len(chaos): {len(chaos)}")

        # Adjust line color intensity with temperature, deep_ricci_scalar, and frequency match
        temp_norm = max(0, min(temperature / 30.0, 1.0))
        line_intensity = int(255 * temp_norm * (0.8 + 0.2 * deep_ricci_scalar) * (0.8 + 0.2 * freq_match))
        line_color = f"#81{line_intensity:02x}ec"
        print(f"Style A calculated line_color: {line_color}, line_intensity: {line_intensity}, temp_norm: {temp_norm}, "
              f"temperature: {temperature}, deep_ricci_scalar: {deep_ricci_scalar}, freq_match: {freq_match}")
        logging.info(f"Style A calculated line_color: {line_color}, line_intensity: {line_intensity}, temp_norm: {temp_norm}, "
                     f"temperature: {temperature}, deep_ricci_scalar: {deep_ricci_scalar}, freq_match: {freq_match}")

        # Base shape points
        points = []
        mirrored_points = []
        fill_color = config["emotion_colors"].get(primary_emotion, "#a29bfe")

        # Adjust angle with frequency_avg and frequency match
        freq_offset = (freq_avg - 8.0) / (10.0 - 8.0)
        angle_offset = freq_offset * math.pi / 4 * (0.8 + 0.2 * freq_match)

        for i in range(num_points):
            try:
                value = chaos[i % len(chaos)]
                angle = (i / num_points) * 2 * math.pi + angle_offset
                r = radius * abs(value)
                x = center + r * math.cos(angle)
                y = center + r * math.sin(angle)
                points.append((x, y))
                # Mirrored point for entanglement simulation
                mirrored_x = center - (x - center)
                mirrored_y = center - (y - center)
                mirrored_points.append((mirrored_x, mirrored_y))
                # Draw small ellipses at vertices
                draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=fill_color)
                # Draw mirrored points scaled by entanglement coefficient
                if entanglement_coeff > 0:
                    draw.ellipse((mirrored_x - 3 * entanglement_coeff, mirrored_y - 3 * entanglement_coeff,
                                  mirrored_x + 3 * entanglement_coeff, mirrored_y + 3 * entanglement_coeff),
                                 fill=fill_color)
            except IndexError:
                continue

        # Draw the outline-only main shape using polygon to avoid anti-aliasing
        line_color_rgb = tuple(int(line_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
        draw.polygon(points, outline=line_color_rgb, width=4)
        # Draw mirrored shape for entanglement with proportional width
        if entanglement_coeff > 0:
            draw.polygon(mirrored_points, outline=line_color_rgb, width=int(4 * entanglement_coeff))

        # Coherence ring
        coherence = ping["source_data"].get("observer_state", {}).get("coherence", 0.0)
        if coherence >= 0.05:
            intensity = int(255 * min(coherence, 1.0))
            ring_color = f"#{intensity:02x}{intensity:02x}ff"
            ring_radius = 70 * (0.8 + 0.4 * desc_value)
            draw.ellipse((center-ring_radius, center-ring_radius, center+ring_radius, center+ring_radius), outline=ring_color, width=3)

        # Entanglement ring
        entanglement = ping["source_data"].get("observer_state", {}).get("entanglement", 0.0)
        if entanglement >= 0.5:
            ring_offset = 80 * (0.9 + 0.2 * normalized_elevation)
            draw.ellipse((center-ring_offset, center-ring_offset, center+ring_offset, center+ring_offset), outline="#ff9ff3", width=2)

        # Dark energy glow
        if DARK_ENERGY_DENSITY > 0:
            glow_radius = 100 * (0.8 + 0.2 * DARK_ENERGY_DENSITY)
            draw.ellipse((center-glow_radius, center-glow_radius, center+glow_radius, center+glow_radius), outline="#ffffff", width=1)

        # Central star with coherence
        if coherence >= 0.1:
            star_points = []
            star_size = 60 * (0.8 + 0.4 * meaning_value)
            for i in range(5):
                outer_angle = (i * 2 * math.pi / 5) - (math.pi / 2)
                inner_angle = (i * 2 * math.pi / 5 + math.pi / 5) - (math.pi / 2)
                outer_x = center + star_size * math.cos(outer_angle)
                outer_y = center + star_size * math.sin(outer_angle)
                inner_x = center + (star_size / 2) * math.cos(inner_angle)
                inner_y = center + (star_size / 2) * math.sin(inner_angle)
                star_points.extend([(outer_x, outer_y), (inner_x, inner_y)])
            draw.polygon(star_points, fill="#ffffff", outline="#ff9ff3")

        # Random ellipses
        num_ellipses = int(5 + 5 * notes_value + fib_static // 2 + deep_entropy * 5)
        for _ in range(num_ellipses):
            x = random.uniform(center-60, center+60)
            y = random.uniform(center-60, center+60)
            draw.ellipse((x-2, y-2, x+2, y+2), fill="#ffffff")

        # Moon phase effect
        moon_phase = env_data.get('moon_phase', 'Unknown')
        moon_colors = {
            "New Moon": "#E6E6FA", "Waxing Crescent": "#D3D3FA", "First Quarter": "#C0C0FA",
            "Waxing Gibbous": "#ADADFA", "Full Moon": "#9A9AFA", "Waning Gibbous": "#8787FA",
            "Last Quarter": "#7474FA", "Waning Crescent": "#6161FA", "Unknown": "#E6E6FA"
        }
        moon_color = moon_colors.get(moon_phase, "#E6E6FA")
        for _ in range(3):
            x = random.uniform(center-50, center+50)
            y = random.uniform(center-50, center+50)
            draw.ellipse((x-2, y-2, x+2, y+2), fill=moon_color)

        # KP index ellipses
        if kp_index > 0:
            num_kp_ellipses = int(kp_index)
            for _ in range(num_kp_ellipses):
                x = random.uniform(center-70, center+70)
                y = random.uniform(center-70, center+70)
                draw.ellipse((x-3, y-3, x+3, y+3), fill="#ff9ff3")

        # Secondary emotion stars
        num_stars = len(secondary_emotions)
        if narrative_analysis["festival"]:
            num_stars += 3
        for i in range(num_stars):
            star_center_x = center + 50 * math.cos(i * 2 * math.pi / max(num_stars, 1))
            star_center_y = center + 50 * math.sin(i * 2 * math.pi / max(num_stars, 1))
            star_points = []
            star_size = 20
            for j in range(5):
                outer_angle = (j * 2 * math.pi / 5) - (math.pi / 2)
                inner_angle = (j * 2 * math.pi / 5 + math.pi / 5) - (math.pi / 2)
                outer_x = star_center_x + star_size * math.cos(outer_angle)
                outer_y = star_center_y + star_size * math.sin(outer_angle)
                inner_x = star_center_x + (star_size / 2) * math.cos(inner_angle)
                inner_y = star_center_y + (star_size / 2) * math.sin(inner_angle)
                star_points.extend([(outer_x, outer_y), (inner_x, inner_y)])
            draw.polygon(star_points, fill="#ffffff", outline="#ff9ff3")

        # Apply ritual modifiers (e.g., phoenix_aura) as outline-only to avoid filling
        for modifier in ritual_modifiers:
            if "visual_echo" in modifier:
                visual_echo = modifier["visual_echo"]
                if visual_echo.get("enabled", False):
                    color_overlay = visual_echo.get("color_overlay", "#FFFFFF")
                    style = visual_echo.get("style", "default")
                    if style == "phoenix_aura":
                        aura_points = []
                        aura_radius = radius * 1.5
                        for i, amplitude in enumerate(chaos):
                            angle = (i / len(chaos)) * 2 * math.pi
                            x = center + math.cos(angle) * aura_radius * (1 + amplitude * 0.5)
                            y = center + math.sin(angle) * aura_radius * (1 + amplitude * 0.5)
                            aura_points.append((x, y))
                        # Draw as outline-only to avoid filling the main shape
                        draw.polygon(aura_points, outline=color_overlay + "80", width=3)

        # Save the image
        image.save(filepath, "PNG")

    def save_visual_sigil_cairo(self, chaos, filepath, env_data, primary_emotion, ping, config, ritual_modifiers):
        # Create a Cairo surface
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 512, 512)
        ctx = cairo.Context(surface)
        ctx.set_antialias(cairo.ANTIALIAS_NONE)

        # Clear the surface with a transparent background
        ctx.set_source_rgba(0, 0, 0, 0)
        ctx.paint()

        # Base chaos signature visualization with a different style (using arcs)
        center_x, center_y = 256, 256
        radius = 100

        # Calculate the outline color to match Style A and validation
        source_data = ping.get("source_data", {})
        temperature = ping.get("environmental_context", {}).get("temperature_celsius", 0.0)
        deep_ricci_scalar = source_data.get("deep_ricci_scalar", 0.1)
        freq_match = source_data.get("frequency_match", 0.5)

        temp_norm = max(0, min(temperature / 30.0, 1.0))
        line_intensity = int(255 * temp_norm * (0.8 + 0.2 * deep_ricci_scalar) * (0.8 + 0.2 * freq_match))
        line_color = f"#81{line_intensity:02x}ec"
        print(f"Style B calculated line_color: {line_color}, line_intensity: {line_intensity}, temp_norm: {temp_norm}, "
              f"temperature: {temperature}, deep_ricci_scalar: {deep_ricci_scalar}, freq_match: {freq_match}")
        logging.info(f"Style B calculated line_color: {line_color}, line_intensity: {line_intensity}, temp_norm: {temp_norm}, "
                     f"temperature: {temperature}, deep_ricci_scalar: {deep_ricci_scalar}, freq_match: {freq_match}")
        r = int(line_color[1:3], 16) / 255.0
        g = int(line_color[3:5], 16) / 255.0
        b = int(line_color[5:7], 16) / 255.0

        # Draw arcs using the outline color
        for i, amplitude in enumerate(chaos):
            start_angle = (i / len(chaos)) * 2 * math.pi
            end_angle = ((i + 1) / len(chaos)) * 2 * math.pi
            adjusted_radius = radius * (1 + amplitude)
            ctx.new_path()
            ctx.arc(center_x, center_y, adjusted_radius, start_angle, end_angle)
            ctx.set_source_rgb(r, g, b)
            ctx.set_line_width(4)
            ctx.stroke()

        # Apply environmental influence with a subtle dashed pattern
        frequencies = env_data["frequencies"]
        for freq in frequencies:
            ctx.new_path()
            ctx.set_source_rgb(1, 1, 1)  # White for the dashed pattern
            ctx.set_line_width(1)
            ctx.set_dash([5, 5 * (1 + freq)])  # Dashed pattern influenced by frequency
            ctx.arc(center_x, center_y, radius * (1 + freq * 0.5), 0, 2 * math.pi)
            ctx.stroke()

        # Apply ritual modifiers if present
        for modifier in ritual_modifiers:
            if "visual_echo" in modifier:
                visual_echo = modifier["visual_echo"]
                if visual_echo.get("enabled", False):
                    color_overlay = visual_echo.get("color_overlay", "#FFFFFF")
                    style = visual_echo.get("style", "default")
                    if style == "phoenix_aura":
                        # Draw an outer aura with a gradient
                        aura_radius = radius * 1.5
                        aura_gradient = cairo.RadialGradient(center_x, center_y, radius, center_x, center_y, aura_radius)
                        r = int(color_overlay[1:3], 16) / 255.0
                        g = int(color_overlay[3:5], 16) / 255.0
                        b = int(color_overlay[5:7], 16) / 255.0
                        aura_gradient.add_color_stop_rgba(0, r, g, b, 0.5)
                        aura_gradient.add_color_stop_rgba(1, r * 0.5, g * 0.5, b * 0.5, 0.1)
                        ctx.new_path()
                        ctx.arc(center_x, center_y, aura_radius, 0, 2 * math.pi)
                        ctx.set_source(aura_gradient)
                        ctx.fill()

        # Save the surface to a file
        surface.write_to_png(filepath)

    def play_emotion_sound(self, primary_emotion, frequency, config):
        sound_dir = config["SOUND_DIR"]
        try:
            emotion_sound_file = os.path.join(sound_dir, f"{primary_emotion.lower()}.wav")
            print(f"Playing emotion sound for {primary_emotion}: {emotion_sound_file}")
            logging.info(f"Playing emotion sound for {primary_emotion}: {emotion_sound_file}")
            if os.path.exists(emotion_sound_file):
                sound = pygame.mixer.Sound(emotion_sound_file)
                self.emotion_sounds[primary_emotion] = sound
                sound.play()
            else:
                print(f"Emotion sound file not found: {emotion_sound_file}")
                logging.info(f"Emotion sound file not found: {emotion_sound_file}")
        except Exception as e:
            print(f"Error playing emotion sound: {e}")
            logging.error(f"Error playing emotion sound: {e}")

        try:
            print(f"Playing tone with frequency {frequency} Hz for {primary_emotion}")
            logging.info(f"Playing tone with frequency {frequency} Hz for {primary_emotion}")
            pygame.mixer.init(frequency=int(frequency), size=-16, channels=1)
            tone = pygame.mixer.Sound(emotion_sound_file)  # Placeholder; replace with actual tone generation
            self.emotion_tones[primary_emotion] = tone
            tone.play()
        except Exception as e:
            print(f"Error playing tone: {e}")
            logging.error(f"Error playing tone: {e}")