import os
import json

class NarrativeUtils:
    def __init__(self):
        pass

    def compute_intention_entropy(self, desc, notes):
        combined_text = (desc + " " + notes).lower()
        word_count = len(combined_text.split())
        unique_words = len(set(combined_text.split()))
        if word_count == 0:
            return 0.0
        entropy = unique_words / word_count
        return round(entropy, 3)

    def generate_harmonic_proxy(self, env_data, emotions, desc, notes, last_cast_timestamp):
        """Generate harmonic proxy data for glyph casting."""
        freq_max = sum(env_data["frequencies"]) + len(emotions) * 0.01
        freq_min = min(env_data["frequencies"]) - len(emotions) * 0.005
        freq_avg = sum(env_data["frequencies"]) / len(env_data["frequencies"])

        intention_entropy = self.compute_intention_entropy(desc, notes)

        harmonic_index = (freq_max + freq_min) / 2 + intention_entropy * 0.1
        harmonic_index = round(harmonic_index, 5)

        return {
            "frequency_max_hz": freq_max,
            "frequency_min_hz": freq_min,
            "frequency_avg_hz": freq_avg,
            "intention_entropy": intention_entropy,
            "harmonic_proxy_index": harmonic_index
        }

    def show_narrative_log(self, ui, config):
        ui.narrative_display.setPlainText("Narrative log display not implemented.")

    def reflect_on_journey(self, ui, config, last_ping, update_ui_callback, process_response_callback):
        if not last_ping:
            update_ui_callback({"narrative_display": "No previous ping to reflect on."})
            return
        prompt = f"Reflect on the journey: {last_ping['description']} with emotions {last_ping['tags']}"
        ui.narrative_display.setPlainText(f"Reflecting on: {prompt}")
        # Placeholder for actual reflection logic
        response = f"coherence: 0.75\nentanglement: 0.65\nnarrative: A journey of {last_ping['tags'][0]} unfolds."
        process_response_callback(response)

    def save_narrative_log(self, glyph_id, timestamp, coherence, entanglement, narrative_text, last_ping, config, refresh_callback):
        log_entry = {
            "glyph_id": glyph_id,
            "timestamp": timestamp,
            "coherence": coherence,
            "entanglement": entanglement,
            "narrative": narrative_text
        }
        narrative_log_file = config["NARRATIVE_LOG_FILE"]
        if os.path.exists(narrative_log_file):
            with open(narrative_log_file, "r") as f:
                data = json.load(f)
        else:
            data = []
        data.append(log_entry)
        with open(narrative_log_file, "w") as f:
            json.dump(data, f, indent=2)
        refresh_callback()