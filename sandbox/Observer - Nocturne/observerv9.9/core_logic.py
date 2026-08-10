import re
import datetime
import sanctum_anchor
import os
import json
import random
from data_fetchers import DataFetchers
from glyph_calculations import GlyphCalculations
from glyph_visuals import GlyphVisuals
from narrative_utils import NarrativeUtils
from evolution_utils import EvolutionUtils
from ritual_binding_loader import RitualBindingLoader
from glyph_casting import GlyphCasting
from ritual_manager import RitualManager
from ui_updater import UIUpdater

class CoreLogic:
    def __init__(self, config, update_ui_callback):
        self.config = config
        self.sanctum = sanctum_anchor.load_sanctum()
        self.api_key = "35bde82b7249e2d0915a2796b4ce6015"
        
        # Initialize state variables
        self.pulse_orbs = []
        self.coherence = 0.0
        self.entanglement = 0.0
        self.last_p_proxy = 0.0
        self.pulse_tick = 0
        self.legendary_tick = 0
        self.banner_index = 0
        self.banner_messages = ["Welcome to Universal Horizon Observer", "Harmonizing Earth and Equestria", "Observe the Weave of Magic"]
        self.last_ping = None
        # Initialize glyph counter by finding the highest existing glyph ID
        self.glyph_counter = self.initialize_glyph_counter()
        self.previous_narrative_analysis = {}  # For narrative analysis tracking
        self.glyph_style = "A"  # Default to Style A (Pillow)
        
        # Initialize helper classes
        self.data_fetchers = DataFetchers()
        self.glyph_calculations = GlyphCalculations()
        self.glyph_visuals = GlyphVisuals()
        self.narrative_utils = NarrativeUtils()
        self.evolution_utils = EvolutionUtils()
        self.ritual_binding_loader = RitualBindingLoader()
        
        # Initialize new modular classes
        self.ui_updater = UIUpdater(config)
        self.ritual_manager = RitualManager(config, self.sanctum, self.api_key, self.data_fetchers, self.ritual_binding_loader)
        self.glyph_casting = GlyphCasting(
            config, self.sanctum, self.api_key, self.data_fetchers, self.glyph_calculations,
            self.glyph_visuals, self.narrative_utils, self.evolution_utils, self.ritual_binding_loader,
            self, self.ui_updater
        )

        # Load glyphs from glyph_archive subfolder
        self.load_glyphs()
        # Load the most recent last_ping
        self.load_last_ping()

    def set_ui(self, ui):
        """Set the UI instance for the UIUpdater and CoreLogic."""
        self.ui = ui  # Store the UI instance on CoreLogic
        self.ui_updater.set_ui(ui)

    def set_glyph_style(self, style):
        """Set the glyph drawing style (A or B)."""
        self.glyph_style = style
        print(f"Glyph style set to: {style}")
        # Refresh the gallery to update displayed glyphs
        self.ui_updater.refresh_gallery(self.pulse_orbs)

    def initialize_glyph_counter(self):
        """Initialize the glyph counter by finding the highest existing glyph ID."""
        glyph_dir = self.config["GLYPH_DIR"]
        if not os.path.exists(glyph_dir):
            print(f"Glyph directory {glyph_dir} does not exist. Starting counter at 1.")
            return 1

        glyph_nums = []
        for fname in os.listdir(glyph_dir):
            match = re.match(r'Glyph-(\d+)\.json', fname)
            if match:
                glyph_nums.append(int(match.group(1)))
        
        if glyph_nums:
            max_num = max(glyph_nums)
            print(f"Found {len(glyph_nums)} existing glyphs. Highest ID: Glyph-{max_num:04d}. Starting counter at {max_num + 1}.")
            return max_num + 1
        else:
            print("No existing glyphs found. Starting counter at 1.")
            return 1

    def load_last_ping(self):
        """Load the most recent last_ping from glyph_archive based on timestamp_utc."""
        glyph_dir = self.config["GLYPH_DIR"]
        if not os.path.exists(glyph_dir):
            print(f"Glyph directory {glyph_dir} does not exist. No last_ping to load.")
            return

        latest_ping = None
        latest_timestamp = None
        for fname in os.listdir(glyph_dir):
            if fname.endswith(".json") and not fname.endswith("-verified.json"):
                filepath = os.path.join(glyph_dir, fname)
                try:
                    with open(filepath, 'r') as f:
                        ping_data = json.load(f)
                    timestamp_str = ping_data.get("timestamp_utc")
                    if timestamp_str:
                        # Ensure the timestamp is offset-aware by adding +00:00 if missing
                        if timestamp_str.endswith('Z'):
                            timestamp_str = timestamp_str.replace('Z', '+00:00')
                        elif '+' not in timestamp_str and 'Z' not in timestamp_str:
                            timestamp_str += '+00:00'
                        timestamp = datetime.datetime.fromisoformat(timestamp_str)
                        if latest_timestamp is None or timestamp > latest_timestamp:
                            latest_timestamp = timestamp
                            latest_ping = ping_data
                except Exception as e:
                    print(f"Error loading glyph JSON {fname} for last_ping: {e}")
        
        if latest_ping:
            self.last_ping = latest_ping
            print(f"Loaded last_ping for glyph {self.last_ping['glyph_id']} with timestamp {self.last_ping['timestamp_utc']}")
        else:
            print("No valid last_ping found in glyph_archive.")

    def load_glyphs(self):
        """Load glyph JSON files from the glyph_archive subfolder and populate pulse_orbs."""
        glyph_archive_path = "glyph_archive"
        if not os.path.exists(glyph_archive_path):
            print(f"Warning: glyph_archive subfolder not found at {glyph_archive_path}")
            self.pulse_orbs = []  # Ensure pulse_orbs is empty if glyph_archive is missing
            return

        glyph_files = [f for f in os.listdir(glyph_archive_path) if f.endswith(".json") and not f.endswith("-verified.json")]
        if not glyph_files:
            print(f"No glyph files found in {glyph_archive_path}. Initializing pulse_orbs as empty.")
            self.pulse_orbs = []
            return

        seen_glyph_ids = set()
        temp_pulse_orbs = []
        for filename in glyph_files:
            filepath = os.path.join(glyph_archive_path, filename)
            try:
                with open(filepath, 'r') as f:
                    glyph_data = json.load(f)
                glyph_id = glyph_data.get("glyph_id", "Unknown")
                # Skip if glyph_id has already been processed (keep the most recent based on timestamp)
                if glyph_id in seen_glyph_ids:
                    print(f"Skipping duplicate glyph: {glyph_id}")
                    continue
                # Determine the correct image paths
                image_path_a = glyph_data.get("visual_artifact_a")
                if not image_path_a or image_path_a.strip() == "":
                    image_path_a = glyph_data.get("visual_artifact", f"{glyph_id}-A.png")
                if not image_path_a.endswith("-A.png"):
                    image_path_a = f"{glyph_id}-A.png"
                image_path_a = os.path.join(glyph_archive_path, image_path_a)
                
                image_path_b = glyph_data.get("visual_artifact_b")
                if not image_path_b or image_path_b.strip() == "":
                    image_path_b = glyph_data.get("visual_artifact", f"{glyph_id}-B.png")
                if not image_path_b.endswith("-B.png"):
                    image_path_b = f"{glyph_id}-B.png"
                image_path_b = os.path.join(glyph_archive_path, image_path_b)
                
                # Verify that the corresponding image files exist
                if not (os.path.exists(image_path_a) and os.path.exists(image_path_b)):
                    print(f"Skipping glyph {glyph_id}: Image files missing (A: {image_path_a}, B: {image_path_b})")
                    continue
                # Map glyph data to pulse_orbs format
                orb = {
                    "cx": 90,
                    "cy": 50,  # Will be adjusted after sorting
                    "base_size": 20,
                    "tags": glyph_data.get("tags", ["Stillness"]),
                    "glyph_id": glyph_id,
                    "timestamp": glyph_data.get("timestamp_utc", "1970-01-01T00:00:00+00:00")
                }
                temp_pulse_orbs.append(orb)
                seen_glyph_ids.add(glyph_id)
                print(f"Loaded glyph: {glyph_id}")
            except Exception as e:
                print(f"Error loading glyph JSON {filename}: {e}")

        # Sort by timestamp to keep the most recent entry for each glyph_id (newest first)
        temp_pulse_orbs.sort(key=lambda x: x["timestamp"], reverse=True)
        self.pulse_orbs = []
        seen_glyph_ids.clear()
        for orb in temp_pulse_orbs:
            if orb["glyph_id"] not in seen_glyph_ids:
                seen_glyph_ids.add(orb["glyph_id"])
                self.pulse_orbs.append(orb)
        
        # Reverse the order so the newest is at the top (lowest cy value)
        self.pulse_orbs.reverse()
        # Adjust cy values: newest at the top (cy=50), oldest at the bottom
        for idx, orb in enumerate(self.pulse_orbs):
            orb["cy"] = 50 + idx * 60

    def refresh_initial_state(self):
        if self.coherence == 0.0 and self.entanglement == 0.0:
            self.ui_updater.update_ui({"observer_state_label": f"Coherence: 0.00 | Entanglement: 0.00"})
        self.ui_updater.refresh_gallery(self.pulse_orbs)
        self.ui_updater.refresh_log()
        self.ui_updater.refresh_history()
        self.ui_updater.refresh_narrative_history()

    def full_cast(self):
        self.glyph_casting.full_cast(self.ui)
        # Check for ETF suggestion after casting
        self.check_etf_suggestion()

    def check_etf_suggestion(self):
        if not self.last_ping:
            print("No last ping available for ETF suggestion check.")
            return

        # Criteria for ETF suggestion
        entanglement_coeff = self.last_ping["source_data"].get("entanglement_coefficient", 0.0)
        glyph_emotions = self.last_ping["tags"]
        glyph_id = self.last_ping["glyph_id"]

        print(f"Checking ETF suggestion for glyph {glyph_id}: entanglement_coeff={entanglement_coeff}, emotions={glyph_emotions}")

        # Suggest binding if entanglement coefficient is high
        if entanglement_coeff > 0.7:  # Threshold for high entanglement
            # Check for compatible rituals
            rituals = self.ritual_manager.load_rituals()
            for ritual in rituals:
                ritual_emotions = ritual.get("emotional_signature", [])
                if any(emotion in ritual_emotions for emotion in glyph_emotions):
                    # Check if glyph is already linked to a ritual
                    if not self.ritual_manager.is_glyph_linked_to_ritual(glyph_id):
                        print(f"ETF suggestion triggered: Suggest binding {glyph_id} to {ritual['name']}")
                        self.ui_updater.update_ui({
                            "etf_suggestion": {
                                "glyph_id": glyph_id,
                                "ritual_name": ritual["name"]
                            }
                        })
                        return
                    else:
                        print(f"Glyph {glyph_id} is already linked to a ritual. No ETF suggestion.")
        else:
            print(f"Entanglement coefficient {entanglement_coeff} below threshold (0.7). No ETF suggestion.")
        # Clear suggestion if no trigger
        print("Clearing ETF suggestion (no trigger conditions met).")
        self.ui_updater.update_ui({"etf_suggestion": None})

    def bind_new_ritual(self, name, ritual_type, participants, emotions, location, narrative, entanglement_boost, coherence_floor, visual_color):
        return self.ritual_manager.bind_new_ritual(name, ritual_type, participants, emotions, location, narrative, entanglement_boost, coherence_floor, visual_color)

    def attach_glyph_to_ritual(self, glyph_id, ritual_name):
        print(f"Attempting to attach glyph {glyph_id} to ritual {ritual_name}")
        success, message = self.ritual_manager.attach_glyph_to_ritual(glyph_id, ritual_name)
        print(f"Attach result: success={success}, message={message}")
        if success:
            # Refresh the UI to reflect the new linkage
            self.ui_updater.refresh_history()
        return success, message

    def save_observer_history(self, glyph_id, timestamp):
        """Save an observer history entry."""
        history_entry = {
            "timestamp": timestamp,
            "action": "glyph_cast",
            "details": f"Cast glyph {glyph_id} with coherence {self.coherence:.2f} and entanglement {self.entanglement:.2f}"
        }
        history_file = self.config["HISTORY_FILE"]
        if os.path.exists(history_file):
            with open(history_file, "r") as f:
                data = json.load(f)
        else:
            data = []
        data.append(history_entry)
        with open(history_file, "w") as f:
            json.dump(data, f, indent=2)

    def show_narrative_log(self):
        self.narrative_utils.show_narrative_log(self.ui, self.config)

    def reflect_on_journey(self):
        self.narrative_utils.reflect_on_journey(
            self.ui, self.config, self.last_ping, self.ui_updater.update_ui, self.process_chatgpt_response
        )

    def process_chatgpt_response(self, response_text):
        print(f"Processing ChatGPT response: {response_text}")
        try:
            coherence_match = re.search(r"coherence[:=]\s*(\d+\.\d+)", response_text)
            entanglement_match = re.search(r"entanglement[:=]\s*(\d+\.\d+)", response_text)
            coherence = float(coherence_match.group(1)) if coherence_match else self.coherence + 0.05
            entanglement = float(entanglement_match.group(1)) if entanglement_match else self.entanglement + 0.025
            self.coherence = coherence
            self.entanglement = entanglement
            self.last_p_proxy = round(self.coherence * 0.8 + self.last_p_proxy * 0.2, 5)
            try:
                narrative_match = re.search(r"narrative[:=]\s*(.+)", response_text, re.IGNORECASE | re.DOTALL)
                narrative_text = narrative_match.group(1).strip() if narrative_match else "No narrative provided."
            except Exception as e:
                narrative_text = f"Error parsing narrative: {e}"
            print(f"Parsed narrative: {narrative_text}")
            self.ui_updater.update_ui({
                "narrative_display": narrative_text,
                "observer_state_label": f"Coherence: {self.coherence:.2f} | Entanglement: {self.core.entanglement:.2f}",
                "pulse_label": f"Pulse Proxy: {self.last_p_proxy:.5f}"
            })
            self.update_portal_progress()
            print(f"last_ping exists: {self.last_ping is not None}")
            if self.last_ping:
                glyph_id = self.last_ping["glyph_id"]
            else:
                # Fallback: Use the most recent glyph ID based on the counter
                glyph_id = f"Glyph-{self.glyph_counter - 1:04d}" if self.glyph_counter > 1 else "Glyph-0001"
                print(f"No last_ping available. Using fallback glyph ID: {glyph_id}")
            timestamp = datetime.datetime.utcnow().isoformat()
            print(f"Saving narrative log for glyph {glyph_id} at {timestamp}")
            self.narrative_utils.save_narrative_log(
                glyph_id, timestamp, self.coherence, self.entanglement, narrative_text,
                self.last_ping or {"emotion_tags": {}}, self.config, self.ui_updater.refresh_narrative_history
            )
        except Exception as e:
            print(f"Error processing ChatGPT response: {e}")
            self.ui_updater.update_ui({"narrative_display": f"Error: {e}"})

    def mock_chatgpt_response(self):
        print("Generating mock ChatGPT response")
        if not self.last_ping:
            self.ui_updater.update_ui({"response_field": "No ping available for mock response."})
            return
        coherence = min(self.last_ping["observer_instruction"]["target_state"]["coherence_goal"] + random.uniform(0, 0.1), 1.0)
        entanglement = min(self.last_ping["observer_instruction"]["target_state"]["entanglement_goal"] + random.uniform(0, 0.05), 1.0)
        narrative = (
            f"The glyph pulses with {self.last_ping['intent']['destination']}’s energy. "
            f"A starlit portal outline shimmers, {int(coherence * 100)}% stable, glowing with Twilight’s magic."
        )
        response_text = f"coherence: {coherence:.2f}\nentanglement: {entanglement:.2f}\nnarrative: {narrative}"
        self.ui_updater.update_ui({"response_field": response_text})
        self.process_chatgpt_response(response_text)

    def filter_glyphs_by_emotion(self, emotion):
        """Filter glyphs by a specific emotion and update the UI."""
        print(f"Filtering glyphs by emotion: '{emotion}'")
        print(f"Original pulse_orbs: {self.pulse_orbs}")
        if not emotion:
            self.filtered_pulse_orbs = self.pulse_orbs
        else:
            self.filtered_pulse_orbs = [orb for orb in self.pulse_orbs if emotion in orb["tags"]]
        print(f"Filtered {len(self.filtered_pulse_orbs)} glyphs by emotion: {emotion}")
        print(f"Filtered pulse_orbs: {self.filtered_pulse_orbs}")
        self.ui_updater.refresh_gallery(self.filtered_pulse_orbs)
        # Update the Symbolic Echoes tab display
        self.ui.symbolic_echoes_tab.display_filtered_glyphs(self.filtered_pulse_orbs)

    def bind_glyph_to_suggested_ritual(self, glyph_id, ritual_name):
        success, message = self.attach_glyph_to_ritual(glyph_id, ritual_name)
        if success:
            print(f"Success: {message}")
            self.ui_updater.update_ui({"etf_suggestion": None})
        else:
            print(f"Error: {message}")

    def update_portal_progress(self):
        # Placeholder for portal progress update
        pass