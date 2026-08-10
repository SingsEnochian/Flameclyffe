import os
import json

class RitualBindingLoader:
    def get_active_ritual_modifiers(self, emotions, timestamp):
        active_rituals = []  # List of (name, modifiers) tuples
        ritual_dir = "rituals"
        if not os.path.exists(ritual_dir):
            print("Ritual directory does not exist.")
            return active_rituals

        # Get all ritual files
        ritual_files = [f for f in os.listdir(ritual_dir) if f.endswith(".json")]
        print(f"Checking {len(ritual_files)} rituals for activation with emotions: {emotions}")

        # Check each ritual for matching emotions
        for fname in ritual_files:
            try:
                with open(os.path.join(ritual_dir, fname), 'r', encoding='utf-8') as f:
                    ritual = json.load(f)
                ritual_emotions = ritual.get("emotional_signature", [])
                ritual_name = ritual.get("name", "Unnamed Ritual")
                # Check if any emotion in the glyph matches the ritual's emotional signature
                if any(emotion in ritual_emotions for emotion in emotions):
                    modifiers = ritual.get("glyph_echo_parameters", {})
                    if modifiers:
                        active_rituals.append((ritual_name, modifiers))
                        print(f"Activated ritual: {ritual_name} with modifiers: {modifiers}")
                    else:
                        print(f"Ritual {ritual_name} has no glyph_echo_parameters.")
                else:
                    print(f"Ritual {ritual_name} not activated; emotions {ritual_emotions} do not match.")
            except Exception as e:
                print(f"Error loading ritual {fname}: {e}")

        return active_rituals