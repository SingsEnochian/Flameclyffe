import json
import os
import re
from utils import save_observer_history

class StateManager:
    def __init__(self, config):
        self.config = config
        self.coherence = 0.0
        self.entanglement = 0.0
        self.last_p_proxy = 1.0
        self.last_ping = None
        self.pulse_orbs = []
        self.pulse_tick = 0
        self.legendary_tick = 0
        self.glyph_counter = self.initialize_counter()
        self.banner_messages = self.load_banner_messages()
        self.banner_index = 0
        self.previous_narrative_analysis = {}

    def initialize_counter(self):
        os.makedirs(self.config["GLYPH_DIR"], exist_ok=True)
        existing_files = os.listdir(self.config["GLYPH_DIR"])
        glyph_nums = []
        for f in existing_files:
            match = re.match(r'Glyph-(\d+)', f)
            if match:
                glyph_nums.append(int(match.group(1)))
        return max(glyph_nums, default=0) + 1

    def load_banner_messages(self):
        try:
            with open(self.config["BANNER_FILE"], 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading banner messages: {e}")
            return ["✶ Universal Horizon: Twilight’s Magic ✶"]

    def get_selected_emotions(self, ui):
        return [ui.emotion_listbox.get(i) for i in ui.emotion_listbox.curselection()]

    def update_portal_progress(self):
        self.ui.update_ui_elements({
            "observer_state_label": f"Coherence: {self.coherence:.2f} | Entanglement: {self.entanglement:.2f}",
            "confirmation": f"🌀 Coherence: {self.coherence:.2f} | Entanglement: {self.entanglement:.2f}"
        })

    def save_observer_history(self, glyph_id, timestamp):
        save_observer_history(glyph_id, timestamp, self.coherence, self.entanglement, self.config["HISTORY_FILE"])

    def is_glyph_linked_to_ritual(self, glyph_id):
        ritual_dir = "rituals"
        if not os.path.exists(ritual_dir):
            return False
        for fname in os.listdir(ritual_dir):
            if fname.endswith(".json"):
                try:
                    with open(os.path.join(ritual_dir, fname), 'r', encoding='utf-8') as f:
                        ritual = json.load(f)
                    linked_glyphs = ritual.get("linked_glyphs", [])
                    if glyph_id in linked_glyphs:
                        return True
                except Exception as e:
                    print(f"Error loading ritual {fname}: {e}")
        return False