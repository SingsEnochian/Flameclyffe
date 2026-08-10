import json
import os
import random

class EvolutionUtils:
    def select_parent_glyph(self, config):
        """Select the parent glyph based on highest entanglement coefficient from recent casts."""
        recent_glyphs = []
        glyph_files = sorted([f for f in os.listdir(config["GLYPH_DIR"]) if f.endswith(".json")])
        for glyph_file in glyph_files[-5:]:
            try:
                with open(os.path.join(config["GLYPH_DIR"], glyph_file), 'r') as f:
                    glyph_data = json.load(f)
                entanglement_coeff = glyph_data["source_data"].get("entanglement_coefficient", 0.0)
                recent_glyphs.append((glyph_data, entanglement_coeff))
            except:
                continue
        if not recent_glyphs:
            return None
        parent_glyph = max(recent_glyphs, key=lambda x: x[1])[0]
        return parent_glyph

    def determine_evolution_stage(self, generation):
        """Determine the evolution stage based on generation."""
        if generation <= 3:
            return "Seed", 1.0
        elif generation <= 6:
            return "Sprout", 1.1
        elif generation <= 9:
            return "Bloom", 1.2
        else:
            return "Harmony", 1.3

    def load_emotion_history(self):
        """Load emotion history from a file."""
        history_file = "emotion_history.json"
        if os.path.exists(history_file):
            with open(history_file, 'r') as f:
                return json.load(f)
        return {"counts": {}, "total": 0}

    def save_emotion_history(self, emotion_history):
        """Save emotion history to a file."""
        with open("emotion_history.json", 'w') as f:
            json.dump(emotion_history, f, indent=2)

    def update_emotion_history(self, emotion_history, emotions):
        """Update emotion history with new emotions."""
        for emotion in emotions:
            emotion_history["counts"][emotion] = emotion_history["counts"].get(emotion, 0) + 1
            emotion_history["total"] += 1
        self.save_emotion_history(emotion_history)
        return emotion_history

    def compute_emotional_color(self, primary_emotion, emotion_history, config):
        """Compute a blended color based on emotional history and current emotion."""
        default_color = config["emotion_colors"].get(primary_emotion, "#a29bfe")
        if not emotion_history["total"]:
            return default_color

        def hex_to_rgb(hex_color):
            hex_color = hex_color.lstrip('#')
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

        def rgb_to_hex(rgb):
            return '#{:02x}{:02x}{:02x}'.format(int(rgb[0]), int(rgb[1]), int(rgb[2]))

        r_sum, g_sum, b_sum = 0, 0, 0
        total_weight = emotion_history["total"]
        for emotion, count in emotion_history["counts"].items():
            color = config["emotion_colors"].get(emotion, "#a29bfe")
            rgb = hex_to_rgb(color)
            weight = count / total_weight
            r_sum += rgb[0] * weight
            g_sum += rgb[1] * weight
            b_sum += rgb[2] * weight

        current_rgb = hex_to_rgb(default_color)
        blended_rgb = (
            0.5 * r_sum + 0.5 * current_rgb[0],
            0.5 * g_sum + 0.5 * current_rgb[1],
            0.5 * b_sum + 0.5 * current_rgb[2]
        )
        return rgb_to_hex(blended_rgb)