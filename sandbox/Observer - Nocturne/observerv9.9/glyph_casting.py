import os
import json
import datetime
import random
import math
from sigil_sync import SigilSync

class GlyphCasting:
    def __init__(self, config, sanctum, api_key, data_fetchers, glyph_calculations, glyph_visuals, narrative_utils, evolution_utils, ritual_binding_loader, core, ui_updater):
        self.config = config
        self.sanctum = sanctum
        self.api_key = api_key
        self.data_fetchers = data_fetchers
        self.glyph_calculations = glyph_calculations
        self.glyph_visuals = glyph_visuals
        self.narrative_utils = narrative_utils
        self.evolution_utils = evolution_utils
        self.ritual_binding_loader = ritual_binding_loader
        self.core = core
        self.ui_updater = ui_updater
        self.sigil_sync = SigilSync(config["GLYPH_DIR"])  # Initialize SigilSync

    def full_cast(self, ui):
        desc = ui.input_field.get()
        try:
            value = float(ui.value_field.get())
        except ValueError:
            value = ui.value_field.get()
        notes = ui.notes_field.get()
        narrative_thread = ui.narrative_intention_field.get()
        emotions = [ui.emotion_listbox.get(i) for i in ui.emotion_listbox.curselection()]
        if not emotions:
            emotions = ["Stillness"]
        primary_emotion = emotions[0]
        target_dimension = ui.target_field.get()

        # Initialize ping structure
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        glyph_id = f"Glyph-{self.core.glyph_counter:04d}"
        auto_name = f"{primary_emotion}-{target_dimension}-{self.core.glyph_counter}"
        auto_meaning = f"Represents {primary_emotion} channeled towards {target_dimension}"

        # Fetch environmental data using available DataFetchers methods
        gravitational_strain = self.data_fetchers.fetch_gravitational_wave_strain()
        solar_activity = self.data_fetchers.fetch_solar_activity()
        belief_sentiment = self.data_fetchers.fetch_belief_sentiment()
        cosmic_alignment = self.data_fetchers.compute_cosmic_alignment(timestamp)
        
        # Construct env_data in the expected format
        frequencies = [
            gravitational_strain,
            solar_activity,
            belief_sentiment
        ]
        if cosmic_alignment < 0.25:
            moon_phase = "New Moon"
        elif cosmic_alignment < 0.5:
            moon_phase = "Waxing Crescent"
        elif cosmic_alignment < 0.75:
            moon_phase = "Waxing Gibbous"
        else:
            moon_phase = "Full Moon"
        
        env_data = {
            "frequencies": frequencies,
            "moon_phase": moon_phase
        }
        print(f"Constructed env_data: {env_data}")

        # Generate harmonic proxy
        harmonic_proxy = self.narrative_utils.generate_harmonic_proxy(
            env_data=env_data,
            emotions=emotions,
            desc=desc,
            notes=notes,
            last_cast_timestamp=self.core.last_ping["timestamp_utc"] if self.core.last_ping else timestamp
        )

        # Calculate chaos signature (restored to match original logic)
        harmonic_index = harmonic_proxy["harmonic_proxy_index"]
        chaos = []
        for i in range(11):  # Match the original 11-element chaos signature
            base_amplitude = math.sin(i * 0.1 + harmonic_index) * 0.5
            chaos.append(base_amplitude + random.uniform(-0.5, 0.5))
        print(f"Generated chaos signature: {chaos[:5]}... (length: {len(chaos)})")

        # Evolution calculations using EvolutionUtils
        parent_glyph = self.evolution_utils.select_parent_glyph(self.config)
        if parent_glyph:
            parent_id = parent_glyph["glyph_id"]
            generation = parent_glyph.get("generation", 0) + 1
        else:
            parent_id = "None"
            generation = 1
        evolution_stage, _ = self.evolution_utils.determine_evolution_stage(generation)

        # Update emotion history and compute emotional color
        emotion_history = self.evolution_utils.load_emotion_history()
        emotion_history = self.evolution_utils.update_emotion_history(emotion_history, emotions)
        emotional_color = self.evolution_utils.compute_emotional_color(primary_emotion, emotion_history, self.config)

        # Ritual binding loader
        active_rituals = self.ritual_binding_loader.get_active_ritual_modifiers(emotions, timestamp)
        ritual_modifiers = [{"name": name, **modifiers} for name, modifiers in active_rituals]

        # Build ping structure
        ping = {
            "glyph_id": glyph_id,
            "name": auto_name,
            "timestamp_utc": timestamp,
            "observer_instruction": {
                "target_dimension": target_dimension,
                "target_state": {
                    "coherence_goal": self.core.coherence + random.uniform(0.05, 0.1),
                    "entanglement_goal": self.core.entanglement + random.uniform(0.02, 0.05)
                },
                "ritual_binding": ritual_modifiers
            },
            "description": desc,
            "source_data": {
                "space_weather_context": {
                    "gravitational_wave_strain": gravitational_strain,
                    "solar_factor": solar_activity,
                    "belief_factor": belief_sentiment,
                    "cosmic_alignment": cosmic_alignment
                },
                "harmonic_proxy": harmonic_proxy,
                "entropy_factor": harmonic_proxy["intention_entropy"],
                "cmbr": {"fluctuation_kelvin": 0.0},
                "chaos_signature": chaos,
                "observer_state": {
                    "coherence": self.core.coherence,
                    "entanglement": self.core.entanglement
                }
            },
            "visual_artifact": f"{glyph_id}.png",  # Placeholder, will be updated below
            "visual_artifact_a": "",  # Placeholder, will be updated below
            "visual_artifact_b": "",  # Placeholder, will be updated below
            "tags": emotions,
            "emotion_tags": {
                "secondary_emotions": emotions[1:] if len(emotions) > 1 else [],
                "primary_emotion": primary_emotion
            },
            "meaning": auto_meaning,
            "parent_glyph_id": parent_id,
            "generation": generation,
            "evolution_stage": evolution_stage,
            "notes": notes,
            "resonance_effect": "Full glyphcast with pulse infusion recorded via single ritual interface.",
            "computed_fill_color": emotional_color,
            "ritual_modifiers": ritual_modifiers,
            "harmonic_proxy": harmonic_proxy,
            "narrative_thread": narrative_thread
        }

        # Compute metrics that depend on ping
        ping["source_data"]["quantum_factor"] = self.glyph_calculations.calculate_quantum_factor(ping)
        ping["source_data"].update({
            "golden_ratio": 1.618033988749895,
            "fibonacci": 55,
            "deep_theory_metrics": self.glyph_calculations.compute_deep_theory_metrics(ping, self.sanctum),
            "entanglement_coefficient": self.glyph_calculations.compute_entanglement_coefficient(ping),
            "frequency_match": self.glyph_calculations.compute_frequency_match(chaos, harmonic_index, len(emotions)),
            "brainwave_frequency": self.glyph_calculations.simulate_brainwave_frequency(primary_emotion, harmonic_index)
        })

        # Write JSON file *before* saving and validating the visual sigils
        glyph_dir = self.config["GLYPH_DIR"]
        os.makedirs(glyph_dir, exist_ok=True)
        json_path = os.path.join(glyph_dir, f"{glyph_id}.json")
        print(f"Writing JSON file to: {json_path}")
        try:
            with open(json_path, 'w') as f:
                json.dump(ping, f, indent=2)
            print(f"Successfully wrote JSON file: {json_path}")
        except Exception as e:
            print(f"Error writing JSON file {json_path}: {e}")
            raise

        # Save the visual sigil (both A and B versions)
        png_path = os.path.join(glyph_dir, f"{glyph_id}.png")
        print(f"Before saving visual sigil, ping['source_data'] contains: {ping['source_data'].keys()}")
        filepath_a, filepath_b = self.glyph_visuals.save_visual_sigil(chaos, png_path, env_data, primary_emotion, ping, self.config, ritual_modifiers)
        print(f"Saved glyph images: Style A at {filepath_a}, Style B at {filepath_b}")

        # Update ping with both visual artifact paths
        ping["visual_artifact"] = os.path.basename(filepath_a)  # e.g., "Glyph-0016-A.png"
        ping["visual_artifact_a"] = os.path.basename(filepath_a) if filepath_a else f"{glyph_id}-A.png"
        ping["visual_artifact_b"] = os.path.basename(filepath_b) if filepath_b else f"{glyph_id}-B.png"

        # Re-save the JSON file with updated visual artifact paths
        print(f"Re-writing JSON file with updated visual artifacts: {json_path}")
        try:
            with open(json_path, 'w') as f:
                json.dump(ping, f, indent=2)
            print(f"Successfully re-wrote JSON file: {json_path}")
        except Exception as e:
            print(f"Error re-writing JSON file {json_path}: {e}")
            raise

        # Validate the glyph visuals using SigilSync
        validation_report_a = self.sigil_sync.validate_glyph(glyph_id, style="A")
        print(f"SigilSync validation for Style A ({glyph_id}-A.png): {validation_report_a}")
        validation_report_b = self.sigil_sync.validate_glyph(glyph_id, style="B")
        print(f"SigilSync validation for Style B ({glyph_id}-B.png): {validation_report_b}")

        # Write TXT file
        txt_path = os.path.join(glyph_dir, f"{glyph_id}.txt")
        print(f"Writing TXT file to: {txt_path}")
        try:
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write("\n".join(self.dict_to_text(ping)) + "\n")
            print(f"Successfully wrote TXT file: {txt_path}")
        except Exception as e:
            print(f"Error writing TXT file {txt_path}: {e}")
            raise

        # Update core state
        self.core.last_ping = ping
        self.core.coherence = max(0.0, min(ping["observer_instruction"]["target_state"]["coherence_goal"], 1.0))
        self.core.entanglement = max(0.0, min(ping["observer_instruction"]["target_state"]["entanglement_goal"], 1.0))
        self.core.last_p_proxy = harmonic_proxy["harmonic_proxy_index"]
        # Avoid duplicates in pulse_orbs by checking glyph_id
        if not any(orb["glyph_id"] == glyph_id for orb in self.core.pulse_orbs):
            self.core.pulse_orbs.append({
                "cx": 90,
                "cy": 50 + len(self.core.pulse_orbs) * 60,
                "base_size": 20,
                "tags": emotions,
                "glyph_id": glyph_id
            })
        self.core.glyph_counter += 1

        # Update UI elements
        self.ui_updater.update_ui({
            "confirmation": f"Glyph cast successful: {glyph_id}",
            "observer_state_label": f"Coherence: {self.core.coherence:.2f} | Entanglement: {self.core.entanglement:.2f}",
            "pulse_label": f"Pulse Proxy: {self.core.last_p_proxy:.5f}",
            "harmonic_index_label": f"Harmonic Index: {harmonic_proxy['harmonic_proxy_index']:.5f}",
            "narrative_infusion": f"Narrative Thread Infused: {narrative_thread}" if narrative_thread else "",
            "canvas_chaos": (chaos, env_data, primary_emotion)
        })

        # Check for ETF (Entanglement Trigger Factor)
        self.ui_updater.update_ui({"etf_suggestion": None})

        # Save observer history
        self.core.save_observer_history(glyph_id, timestamp)

        # Refresh UI
        self.ui_updater.refresh_history()
        self.ui_updater.refresh_narrative_history()
        self.ui_updater.refresh_gallery(self.core.pulse_orbs)

        # Play emotion sound
        self.glyph_visuals.play_emotion_sound(primary_emotion, harmonic_proxy["frequency_avg_hz"], self.config)

    def dict_to_text(self, d, indent=0):
        """Convert a dictionary to a list of text lines for TXT file output."""
        lines = []
        for key, value in d.items():
            if isinstance(value, dict):
                lines.append(f"{'  ' * indent}{key}:")
                lines.extend(self.dict_to_text(value, indent + 1))
            elif isinstance(value, list):
                lines.append(f"{'  ' * indent}{key}:")
                for item in value:
                    if isinstance(item, dict):
                        lines.extend(self.dict_to_text(item, indent + 1))
                    else:
                        lines.append(f"{'  ' * (indent + 1)}{item}")
            else:
                lines.append(f"{'  ' * indent}{key}: {value}")
        return lines