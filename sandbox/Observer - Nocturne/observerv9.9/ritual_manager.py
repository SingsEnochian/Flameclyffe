import os
import json

class RitualManager:
    def __init__(self, config, sanctum, api_key, data_fetchers, ritual_binding_loader):
        self.config = config
        self.sanctum = sanctum
        self.api_key = api_key
        self.data_fetchers = data_fetchers
        self.ritual_binding_loader = ritual_binding_loader
        self.ritual_linkages = self.load_ritual_linkages()
        print(f"Initialized RitualManager with ritual_linkages: {self.ritual_linkages}")

    def load_ritual_linkages(self):
        linkages_file = "ritual_linkages.json"
        print(f"Attempting to load ritual linkages from {os.path.abspath(linkages_file)}")
        if os.path.exists(linkages_file):
            with open(linkages_file, 'r') as f:
                return json.load(f)
        print("No existing ritual_linkages.json found. Starting with empty dictionary.")
        return {}

    def save_ritual_linkages(self):
        linkages_file = "ritual_linkages.json"
        absolute_path = os.path.abspath(linkages_file)
        print(f"Saving ritual linkages to {absolute_path}: {self.ritual_linkages}")
        try:
            with open(linkages_file, 'w') as f:
                json.dump(self.ritual_linkages, f, indent=2)
            print(f"Successfully saved ritual linkages to {absolute_path}")
        except Exception as e:
            print(f"Error saving ritual linkages to {absolute_path}: {e}")
            raise

    def load_rituals(self):
        """Load all rituals from the rituals directory."""
        rituals_dir = "rituals"
        rituals = []
        if os.path.exists(rituals_dir):
            for fname in os.listdir(rituals_dir):
                if fname.endswith(".json"):
                    try:
                        with open(os.path.join(rituals_dir, fname), 'r', encoding='utf-8') as f:
                            ritual = json.load(f)
                        rituals.append(ritual)
                    except Exception as e:
                        print(f"Error loading ritual {fname}: {e}")
        return rituals

    def bind_new_ritual(self, name, ritual_type, participants, emotions, location, narrative, entanglement_boost, coherence_floor, visual_color):
        ritual = {
            "name": name,
            "type": ritual_type,
            "participants": [p.strip() for p in participants],
            "emotional_signature": emotions,
            "location": location,
            "narrative": narrative,
            "entanglement_boost": entanglement_boost,
            "coherence_floor": coherence_floor,
            "visual_echo": {
                "enabled": True,
                "style": "phoenix_aura",
                "color_overlay": visual_color if visual_color else "#ff6f61"
            }
        }
        os.makedirs("rituals", exist_ok=True)
        ritual_filename = f"rituals/{name.lower().replace(' ', '_')}.json"
        with open(ritual_filename, 'w') as f:
            json.dump(ritual, f, indent=2)
        return True, f"Successfully bound ritual: {name}"

    def attach_glyph_to_ritual(self, glyph_id, ritual_name):
        ritual_filename = f"rituals/{ritual_name.lower().replace(' ', '_')}.json"
        print(f"Checking for ritual file: {os.path.abspath(ritual_filename)}")
        if not os.path.exists(ritual_filename):
            print(f"Failed to attach glyph: Ritual file {ritual_filename} does not exist.")
            return False, f"Ritual {ritual_name} does not exist."
        print(f"Attaching glyph {glyph_id} to ritual {ritual_name}")
        self.ritual_linkages[glyph_id] = ritual_name
        self.save_ritual_linkages()
        return True, f"Attached glyph {glyph_id} to ritual {ritual_name}"

    def is_glyph_linked_to_ritual(self, glyph_id):
        return glyph_id in self.ritual_linkages