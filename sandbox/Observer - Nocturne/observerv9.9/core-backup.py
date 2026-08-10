import json
from datetime import datetime, timezone
import os
import random
from math import sin, sqrt, cos, pi, exp
from PIL import Image, ImageDraw, ImageTk
import re
import simpleaudio as sa
import sanctum_anchor
import environment_fetcher
import pulse_infusion
import space_weather_fetcher
import harmonic_proxy
from utils import save_to_file, save_observer_history, dict_to_text
from config import CONFIG
import tkinter as tk
from tkinter import scrolledtext

class CoreLogic:
    def __init__(self, config, update_ui_callback):
        self.config = config
        self.update_ui = update_ui_callback
        self.sanctum = sanctum_anchor.load_sanctum()
        self.api_key = "35bde82b7249e2d0915a2796b4ce6015"
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
        self.ui = None
        self.timeline_data = []
        self.thumbnail_refs = []
        self.static_glyph_modal = None

    def set_ui(self, ui):
        """Set the UI instance for accessing UI elements."""
        self.ui = ui

    def load_banner_messages(self):
        """Load banner messages from JSON file."""
        try:
            with open(self.config["BANNER_FILE"], 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading banner messages: {e}")
            return ["✶ Universal Horizon: Twilight’s Magic ✶"]

    def initialize_counter(self):
        """Initialize glyph counter based on existing files."""
        os.makedirs(self.config["GLYPH_DIR"], exist_ok=True)
        existing_files = os.listdir(self.config["GLYPH_DIR"])
        glyph_nums = []
        for f in existing_files:
            match = re.match(r'Glyph-(\d+)', f)
            if match:
                glyph_nums.append(int(match.group(1)))
        return max(glyph_nums, default=0) + 1

    def refresh_initial_state(self):
        """Load initial state from history and refresh UI."""
        if os.path.exists(self.config["HISTORY_FILE"]):
            with open(self.config["HISTORY_FILE"], "r") as f:
                history = json.load(f)
            if history:
                latest_entry = history[-1]
                self.coherence = latest_entry["coherence"]
                self.entanglement = latest_entry["entanglement"]
                self.update_ui({"observer_state_label": f"Coherence: {self.coherence:.2f} | Entanglement: {self.entanglement:.2f}"})
        self.refresh_gallery()
        self.refresh_log()
        self.refresh_history()
        self.refresh_narrative_history()

    def get_selected_emotions(self):
        """Get selected emotions from the UI listbox."""
        return [self.ui.emotion_listbox.get(i) for i in self.ui.emotion_listbox.curselection()]

    def generate_auto_name(self, emotion, description):
        """Generate an automatic name for a glyph based on emotion and description."""
        style_prefix = {
            "Joy": "Laugh of", "Grief": "Echo of", "Curiosity": "Whisper toward",
            "Stillness": "Silence in", "Fear": "Shadow behind", "Love": "Light from",
            "Hope": "Promise within", "Doubt": "Fog before", "Determination": "Path of", "Awe": "Glimpse of"
        }
        if not emotion:
            return "Unnamed Glyph"
        base = random.choice(description.strip().split()) if description else "Resonance"
        prefix = style_prefix.get(emotion, "Mark of")
        return f"{prefix} {base.capitalize()}"

    def generate_auto_meaning(self, emotion, notes):
        """Generate an automatic meaning for a glyph."""
        return f"A glyph born of {emotion}, reflecting: {notes or 'unspoken energy'}."

    def play_emotion_sound(self, emotion):
        """Play the sound associated with an emotion."""
        try:
            file_path = os.path.join(self.config["SOUND_DIR"], f"{emotion.lower()}.wav")
            if os.path.exists(file_path):
                wave_obj = sa.WaveObject.from_wave_file(file_path)
                wave_obj.play()
        except Exception as e:
            print(f"Error playing sound for {emotion}: {e}")

    def update_portal_progress(self, coherence_raw):
        """Update UI elements with coherence and entanglement values."""
        self.update_ui({
            "observer_state_label": f"Coherence: {self.coherence:.2f} | Entanglement: {self.entanglement:.2f}",
            "confirmation": f"🌀 Coherence: {self.coherence:.2f} | Entanglement: {self.entanglement:.2f}"
        })

    def generate_world_shift_prompt(self, harmonic_index, tier):
        """Generate a world shift prompt based on harmonic index and tier."""
        if tier == "Legendary":
            return "A Legendary harmonic resonance ripples through Equestria. Describe how this inspires a new tradition or festival in Ponyville, reflecting Twilight's emotional growth."
        elif tier == "Common":
            return "A Common harmonic resonance causes subtle unrest in Equestria. Describe a societal tension or challenge that emerges, tied to Twilight's current emotional state."
        else:
            return f"A {tier} harmonic resonance influences Equestria. Describe a small environmental or societal change that reflects this energy, such as a shift in weather or community dynamics."

    def generate_chaos_event(self, harmonic_index):
        """Generate a chaos event prompt based on harmonic index."""
        if harmonic_index < 0.2:
            return "A low harmonic resonance attracts a villainous force in Equestria. Describe a new antagonist who exploits Twilight's emotional struggles, creating a personal challenge for her."
        elif harmonic_index >= 0.95:
            return "A Legendary harmonic resonance causes a chaotic magical surge in Equestria. Describe an unexpected disruption, such as a magical storm or artifact awakening, that challenges Twilight and her friends."
        return ""

    def generate_transformation_prompt(self, harmonic_index):
        """Generate a transformation prompt based on harmonic index."""
        if harmonic_index < 0.2:
            return "A low harmonic resonance causes a magical transformation. Describe Twilight temporarily losing her magic and the emotional struggle this creates, focusing on her identity and growth."
        elif harmonic_index >= 0.95:
            return "A Legendary harmonic resonance triggers a body swap between Twilight and one of her friends. Describe the emotional and relational impact as they navigate this change."
        elif 0.4 <= harmonic_index < 0.8:
            return "A mid-tier harmonic resonance introduces a narrative trope. Describe a mistaken identity scenario involving Twilight, exploring how it affects her relationships and emotional state."
        return ""

    def encode_text_to_number(self, text, max_sum=5000):
        """Encode a text string into a numerical value by summing ASCII values and normalizing."""
        if not text:
            return 0.0
        ascii_sum = sum(ord(char) for char in text)
        return min(ascii_sum / max_sum, 1.0)  # Normalize to 0-1

    def generate_cmbr_data(self):
        """Generate CMBR data with a simulated fluctuation."""
        mean_temperature = 2.72548  # Mean CMBR temperature in Kelvin
        fluctuation = random.uniform(-0.00003, 0.00003)  # Simulated fluctuation (±30 µK)
        temperature = mean_temperature + fluctuation
        # Normalize fluctuation to 0-1 (range: 2.72545 to 2.72551)
        normalized_fluctuation = (temperature - 2.72545) / 0.00006
        return {
            "mean_temperature_kelvin": mean_temperature,
            "fluctuation_kelvin": fluctuation,
            "normalized_fluctuation": normalized_fluctuation
        }

    def normalize_elevation(self, elevation, min_elevation=-430, max_elevation=8848):
        """Normalize elevation to a 0-1 range based on global min and max elevations."""
        return (elevation - min_elevation) / (max_elevation - min_elevation)

    def compute_time_delta(self, current_timestamp, previous_timestamp):
        """Compute the time difference in seconds between two ISO 8601 timestamps."""
        if not previous_timestamp:
            return 0.0
        try:
            current_dt = datetime.fromisoformat(current_timestamp.replace('Z', '+00:00')).astimezone(timezone.utc)
            previous_dt = datetime.fromisoformat(previous_timestamp.replace('Z', '+00:00')).astimezone(timezone.utc)
            delta = (current_dt - previous_dt).total_seconds()
            return max(0, delta)  # Ensure non-negative
        except Exception as e:
            print(f"Error computing time delta: {e}")
            return 0.0

    def nearest_fibonacci_number(self, n):
        """Find the nearest Fibonacci number to the given value."""
        fibs = [1, 1]
        while fibs[-1] < n:
            fibs.append(fibs[-1] + fibs[-2])
        return min(fibs, key=lambda x: abs(x - n))

    def calculate_quantum_factor(self, ping):
        """Calculate the quantum factor based on various penalties."""
        # Pull core values
        entropy = ping["source_data"].get("entropy_factor", 1.0)
        harmonic_index = ping["source_data"]["harmonic_proxy"].get("harmonic_proxy_index", 0.5)
        cmbr_fluct = ping["source_data"]["cmbr"].get("fluctuation_kelvin", 0.0)
        time_delta = ping.get("time_since_previous_cast", 0.0)
        
        # Emotion entropy: 0 for 1 emotion, ~0.2 for 3, up to ~0.4 for 5+
        emotion_list = ping.get("emotion_tags", {}).get("secondary_emotions", [])
        emotion_count = 1 + len(emotion_list)
        emotion_entropy = min(0.1 * (emotion_count - 1), 0.4)

        # Time delta penalty
        if time_delta < 120:
            time_penalty = 0.0
        elif time_delta < 600:
            time_penalty = 0.2
        else:
            time_penalty = 0.4

        # Normalize each sub-factor to a score between 0 and 1
        entropy_penalty = min(entropy * 0.15, 0.2)
        harmonic_penalty = abs(0.55 - harmonic_index) * 0.3
        cmbr_penalty = min(abs(cmbr_fluct * 1000) * 0.05, 0.2)

        # Calculate quantum factor
        penalties = [entropy_penalty, harmonic_penalty, cmbr_penalty, emotion_entropy, time_penalty]
        quantum_factor = max(0.0, min(1.0, 1.0 - sum(penalties) / len(penalties)))
        
        return round(quantum_factor, 6)

    def compute_deep_theory_metrics(self, ping):
        """Compute simplified DEEP Theory metrics for the glyph."""
        # Extract sanctum coordinates and timestamp
        latitude = self.sanctum['Sanctum_Anchor']['Coordinates']['Latitude']  # -90 to 90
        longitude = self.sanctum['Sanctum_Anchor']['Coordinates']['Longitude']  # -180 to 180
        elevation = self.sanctum['Sanctum_Anchor']['Coordinates']['Elevation']  # in meters
        timestamp = ping["timestamp_utc"]
        
        # Reference coordinates (sanctum inception)
        inception_time = "2025-04-27T14:27:00Z"
        ref_latitude = self.sanctum['Sanctum_Anchor']['Coordinates']['Latitude']
        ref_longitude = self.sanctum['Sanctum_Anchor']['Coordinates']['Longitude']
        ref_elevation = self.sanctum['Sanctum_Anchor']['Coordinates']['Elevation']
        
        # Normalize coordinates (x^mu)
        # Time: normalize relative to inception time, scale by 1 year (31536000 seconds)
        current_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).astimezone(timezone.utc)
        inception_dt = datetime.fromisoformat(inception_time.replace('Z', '+00:00')).astimezone(timezone.utc)
        t_norm = (current_dt - inception_dt).total_seconds() / 31536000  # 0 to 1 over 1 year
        x0_norm = (inception_dt - inception_dt).total_seconds() / 31536000  # 0
        
        # Spatial: normalize latitude, longitude, elevation
        lat_norm = (latitude + 90) / 180  # 0 to 1
        lon_norm = (longitude + 180) / 360  # 0 to 1
        elev_norm = self.normalize_elevation(elevation)  # 0 to 1
        ref_lat_norm = (ref_latitude + 90) / 180
        ref_lon_norm = (ref_longitude + 180) / 360
        ref_elev_norm = self.normalize_elevation(ref_elevation)
        
        # Compute perspective function P(x^mu, t)
        P_0 = ping["source_data"]["quantum_factor"]  # Use quantum_factor as initial perspective magnitude
        sigma = 0.1  # Normalized spatial scale (equivalent to ~1000 meters before normalization)
        lambda_val = 0.1
        spatial_term = exp(-((lat_norm - ref_lat_norm)**2 + (lon_norm - ref_lon_norm)**2 + (elev_norm - ref_elev_norm)**2) / (sigma**2))
        f_t = exp(-lambda_val * t_norm)
        P = P_0 * spatial_term * f_t
        
        # Simplified DEEP Ricci scalar
        R = 0.1  # Baseline curvature (approximation for flat spacetime)
        R_deep = R * (1 + P)
        
        # Simplified DEEP entropy
        log_W = ping["source_data"]["entropy_factor"]  # Proxy for log(W)
        S_deep = log_W * f_t
        
        return {
            "perspective_function": P,
            "deep_ricci_scalar": R_deep,
            "deep_entropy": S_deep
        }

    def full_cast(self):
        """Execute a full glyph cast operation."""
        def get_harmonic_index_color(index):
            if index < 0.40:
                return "#E6E6E6"
            elif index < 0.60:
                return "#27ae60"
            elif index < 0.80:
                return "#3498db"
            elif index < 0.95:
                return "#8e44ad"
            else:
                return "#f39c12"

        def get_harmonic_label_text(index):
            if index < 0.40:
                return "Common"
            elif index < 0.60:
                return "Uncommon"
            elif index < 0.80:
                return "Rare"
            elif index < 0.95:
                return "Epic"
            else:
                return "Legendary"

        desc = self.ui.input_field.get()
        try:
            value = float(self.ui.value_field.get())
        except ValueError:
            value = self.ui.value_field.get()
        notes = self.ui.notes_field.get()
        emotions = self.get_selected_emotions()
        if not emotions:
            emotions = ["Stillness"]
        primary_emotion = emotions[0]
        target_dimension = self.ui.target_field.get()

        try:
            env_data = environment_fetcher.fetch_environmental_data(
                self.sanctum['Sanctum_Anchor']['Coordinates']['Latitude'],
                self.sanctum['Sanctum_Anchor']['Coordinates']['Longitude'],
                self.api_key
            )
        except Exception as e:
            env_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "weather": "unknown",
                "temperature_celsius": 0,
                "resonance_status": "Unknown Song",
                "moon_phase": "Unknown"
            }
            print(f"Error fetching environmental data: {e}")

        try:
            pulse_data = pulse_infusion.generate_pulse_proxy(
                env_data['weather'], emotions, self.glyph_counter, env_data['moon_phase'],
                self.sanctum['Sanctum_Anchor']['Coordinates']['Latitude'],
                self.sanctum['Sanctum_Anchor']['Coordinates']['Longitude']
            )
            p_proxy = pulse_data["p_proxy"]
            entropy_factor = pulse_data["entropy_factor"]
            sanctum_factor = pulse_data["sanctum_factor"]
            time_factor = pulse_data["time_factor"]
        except Exception as e:
            p_proxy = 1.0
            entropy_factor = 1.0
            sanctum_factor = 1.0
            time_factor = 1.0
            print(f"Error generating pulse proxy: {e}")

        try:
            space_weather = space_weather_fetcher.fetch_kp_index()
            kp_index = space_weather['kp_index']
        except Exception as e:
            kp_index = -1
            print(f"Error fetching space weather data: {e}")

        try:
            harmonic_data = harmonic_proxy.generate_harmonic_proxy(
                env_data=env_data,
                emotions=emotions,
                desc=desc,
                notes=notes,
                last_cast_timestamp=self.last_ping["timestamp_utc"] if self.last_ping else None
            )
            freq_max = harmonic_data['frequency_max_hz']
            freq_min = harmonic_data['frequency_min_hz']
            freq_avg = harmonic_data['frequency_avg_hz']
            intention_entropy = harmonic_data['intention_entropy']
            harmonic_index = harmonic_data['harmonic_proxy_index']
        except Exception as e:
            freq_max = freq_min = freq_avg = -1
            intention_entropy = harmonic_index = -1
            print(f"Error generating harmonic proxy data: {e}")

        # Generate CMBR data
        cmbr_data = self.generate_cmbr_data()

        golden = (1 + sqrt(5)) / 2
        harmonic = sum(1 / i for i in range(1, 6))
        fib = 13  # Static Fibonacci number
        # Calculate dynamic Fibonacci number
        composite_score = harmonic * entropy_factor * time_factor
        fib_dynamic = self.nearest_fibonacci_number(composite_score)

        resonance_value = env_data.get("resonance_status", "Unknown Song")
        resonance_mod = {
            "Turbulent Field": 1.2, "Harmonic Calm": 0.8,
            "Veiled Stillness": 1.0, "Unknown Song": 1.0
        }.get(resonance_value, 1.0)
        chaos = [round(sin(i * random.random()) * resonance_mod, 5) for i in range(1, 12)]
        chaos = pulse_infusion.infuse_chaos_signature(chaos, p_proxy)
        chaos = [c * (1.0 + self.coherence * 0.2) for c in chaos]

        timestamp = datetime.utcnow().isoformat()
        # Compute time since previous cast
        previous_timestamp = self.last_ping["timestamp_utc"] if self.last_ping else None
        time_since_previous = self.compute_time_delta(timestamp, previous_timestamp)

        glyph_id = f"Glyph-{self.glyph_counter:04d}"
        auto_name = self.generate_auto_name(primary_emotion, desc)
        auto_meaning = self.generate_auto_meaning(primary_emotion, notes)

        emotion_tags = {
            "primary_emotion": primary_emotion,
            "secondary_emotions": emotions[1:] if len(emotions) > 1 else []
        }

        ping = {
            "glyph_id": glyph_id,
            "name": auto_name,
            "timestamp_utc": timestamp,
            "time_since_previous_cast": time_since_previous,
            "observer_node": "Universal Horizon Observer_GUI v9.9",
            "intent": {
                "source": "Earth",
                "destination": target_dimension,
                "portal_properties": {
                    "stability_goal": 0.99,
                    "diameter_meters": 2.0,
                    "dimensional_alignment": "harmonic_resonance"
                }
            },
            "description": desc,
            "source_data": {
                "golden_ratio": golden,
                "fibonacci": fib,
                "fibonacci_dynamic": fib_dynamic,
                "harmonic_sum": harmonic,
                "chaos_signature": chaos,
                "pulse_proxy": p_proxy,
                "entropy_factor": entropy_factor,
                "sanctum_factor": sanctum_factor,
                "time_factor": time_factor,
                "cmbr": cmbr_data,
                "observer_state": {
                    "coherence": self.coherence,
                    "entanglement": self.entanglement
                },
                "space_weather_context": {"kp_index": kp_index},
                "harmonic_proxy": {
                    "frequency_max_hz": freq_max,
                    "frequency_min_hz": freq_min,
                    "frequency_avg_hz": freq_avg,
                    "intention_entropy": intention_entropy,
                    "harmonic_proxy_index": harmonic_index
                },
            },
            "visual_artifact": f"{glyph_id}.png",
            "tags": emotions,
            "emotion_tags": emotion_tags,
            "meaning": auto_meaning,
            "parent_glyph_id": "",
            "evolution_stage": "Seed",
            "notes": notes,
            "resonance_effect": "Full glyphcast with pulse infusion recorded via single ritual interface.",
            "sanctum_context": self.sanctum['Sanctum_Anchor'],
            "environmental_context": env_data
        }

        # Calculate quantum factor dynamically
        quantum_factor = self.calculate_quantum_factor(ping)
        ping["source_data"]["quantum_factor"] = quantum_factor
        ping["quantum_factor_meaning"] = "Derived from entropy, harmony, cosmic fluctuation, emotional stability, and cast timing. Reflects overall resonance clarity."

        # Compute DEEP Theory metrics
        deep_metrics = self.compute_deep_theory_metrics(ping)
        ping["source_data"]["perspective_function"] = deep_metrics["perspective_function"]
        ping["source_data"]["deep_ricci_scalar"] = deep_metrics["deep_ricci_scalar"]
        ping["source_data"]["deep_entropy"] = deep_metrics["deep_entropy"]

        new_coherence_goal = self.coherence + 0.05
        new_entanglement_goal = self.entanglement + 0.025
        observer_instruction = {
            "action": "observe_portal_alignment",
            "target_state": {
                "coherence_goal": new_coherence_goal,
                "entanglement_goal": new_entanglement_goal
            },
            "prompt": (
                f"Observe this glyph and associated data as a quantum portal state "
                f"(current coherence: {self.coherence:.2f}, entanglement: {self.entanglement:.2f}). "
                f"Interpret its resonance alignment with {target_dimension}. "
                f"Report updated coherence (0.0-1.0) and entanglement (0.0-1.0) values, "
                f"and narrate the portal's manifestation progress."
            )
        }

        tier = get_harmonic_label_text(harmonic_index)
        world_shift_prompt = self.generate_world_shift_prompt(harmonic_index, tier)
        if world_shift_prompt:
            observer_instruction["prompt"] += f"\n{world_shift_prompt}"

        chaos_prompt = self.generate_chaos_event(harmonic_index)
        if chaos_prompt:
            observer_instruction["prompt"] += f"\n{chaos_prompt}"
        else:
            transform_prompt = self.generate_transformation_prompt(harmonic_index)
            if transform_prompt:
                observer_instruction["prompt"] += f"\n{transform_prompt}"

        ping["observer_instruction"] = observer_instruction

        os.makedirs(self.config["GLYPH_DIR"], exist_ok=True)
        with open(f"{self.config['GLYPH_DIR']}/{glyph_id}.json", 'w') as f:
            json.dump(ping, f, indent=2)

        with open(f"{self.config['GLYPH_DIR']}/{glyph_id}.txt", 'w') as f:
            f.write("\n".join(dict_to_text(ping)) + "\n")

        self.save_visual_sigil(chaos, f"{self.config['GLYPH_DIR']}/{glyph_id}.png", env_data, primary_emotion, ping)
        save_to_file({
            "timestamp": timestamp,
            "description": desc,
            "data_point": {
                "value": value,
                "notes": notes,
                "emotions": emotions,
                "environmental_context": env_data,
                "pulse_proxy": p_proxy,
                "entropy_factor": entropy_factor,
                "sanctum_factor": sanctum_factor,
                "time_factor": time_factor,
                "quantum_factor": quantum_factor
            }
        }, self.config["LOG_FILE"])
        self.play_emotion_sound(primary_emotion)
        self.last_ping = ping
        self.glyph_counter += 1
        self.update_ui({
            "confirmation": f"🌀 Resonance Captured at {self.sanctum['Sanctum_Anchor']['Name']}",
            "pulse_label": f"Pulse Proxy: {p_proxy} | Moon: {env_data.get('moon_phase', 'Unknown')}",
            "canvas_chaos": (chaos, env_data, primary_emotion)
        })

        color = get_harmonic_index_color(harmonic_index)
        tier = get_harmonic_label_text(harmonic_index)
        self.update_ui({
            "harmonic_index_label": f"Harmonic Index: {harmonic_index:.3f} ({tier})",
            "harmonic_color": color
        })
        if harmonic_index >= 0.95:
            self.update_ui({"legendary_glow": True})
        else:
            self.legendary_tick = 0

        self.last_p_proxy = p_proxy
        save_observer_history(glyph_id, timestamp, self.coherence, self.entanglement, self.config["HISTORY_FILE"])
        self.refresh_log()
        self.refresh_gallery()
        self.refresh_history()
        self.ui.input_field.delete(0, tk.END)
        self.ui.value_field.delete(0, tk.END)
        self.ui.notes_field.delete(0, tk.END)
        self.update_portal_progress(self.coherence)

    def save_visual_sigil(self, chaos, filepath, env_data, primary_emotion, ping):
        """Save a visual representation of a glyph with enhanced data usage, including CMBR, elevation, Fibonacci numbers, and DEEP Theory metrics."""
        size = 600  # Increased from 400 to 600 to accommodate glyph without clipping
        center = size // 2  # Now 300
        base_radius = 120

        # Extract additional data from ping
        pulse_proxy = ping["source_data"]["pulse_proxy"]
        harmonic_index = ping["source_data"]["harmonic_proxy"]["harmonic_proxy_index"]
        temperature = ping["environmental_context"]["temperature_celsius"]
        kp_index = ping["source_data"]["space_weather_context"]["kp_index"]
        freq_avg = ping["source_data"]["harmonic_proxy"]["frequency_avg_hz"]
        secondary_emotions = ping["emotion_tags"]["secondary_emotions"]
        cmbr_fluctuation = ping["source_data"]["cmbr"]["normalized_fluctuation"]
        elevation = ping["sanctum_context"]["Coordinates"]["Elevation"]
        fib_static = ping["source_data"]["fibonacci"]  # Static Fibonacci (13)
        fib_dynamic = ping["source_data"]["fibonacci_dynamic"]  # Dynamic Fibonacci
        perspective_function = ping["source_data"]["perspective_function"]
        deep_ricci_scalar = ping["source_data"]["deep_ricci_scalar"]
        deep_entropy = ping["source_data"]["deep_entropy"]

        # Normalize elevation
        normalized_elevation = self.normalize_elevation(elevation)

        # Encode text fields
        desc_value = self.encode_text_to_number(ping["description"])
        meaning_value = self.encode_text_to_number(ping["meaning"])
        notes_value = self.encode_text_to_number(ping["notes"])
        prompt_value = self.encode_text_to_number(ping["observer_instruction"]["prompt"])

        # Adjust radius with pulse_proxy, elevation, and perspective function
        radius = base_radius * (0.8 + 0.4 * pulse_proxy + 0.2 * normalized_elevation + 0.1 * perspective_function)

        # Adjust number of points with harmonic_index, CMBR fluctuation, and fibonacci_dynamic
        num_points = max(5, int(len(chaos) * (0.5 + harmonic_index + 0.3 * cmbr_fluctuation)) + fib_dynamic)

        # Adjust line color intensity with temperature (normalized to 0-1) and deep_ricci_scalar
        temp_norm = max(0, min(temperature / 30.0, 1.0))  # Normalize temperature (-30 to 30°C)
        line_intensity = int(255 * temp_norm * (0.8 + 0.2 * deep_ricci_scalar))
        line_color = f"#81{line_intensity:02x}ec"  # Adjust green channel for #81ecec

        image = Image.new("RGB", (size, size), color="#2d2d44")
        draw = ImageDraw.Draw(image)
        points = []
        fill_color = self.config["emotion_colors"].get(primary_emotion, "#a29bfe")
        
        # Adjust angle with frequency_avg (normalize freq_avg to a small offset)
        freq_offset = (freq_avg - 8.0) / (10.0 - 8.0)  # Normalize between 8-10 Hz to 0-1
        angle_offset = freq_offset * pi / 4  # Small angle offset (0 to pi/4)

        for i in range(num_points):
            try:
                value = chaos[i % len(chaos)]  # Cycle through chaos values if num_points > len(chaos)
                angle = (i / num_points) * 2 * pi + angle_offset
                r = radius * abs(value)
                x = center + r * cos(angle)
                y = center + r * sin(angle)
                points.append((x, y))
                draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=fill_color)
            except IndexError:
                continue

        # Draw lines with adjusted color, influenced by CMBR fluctuation
        cmbr_line_adjust = 0.8 + 0.4 * cmbr_fluctuation  # Adjust line intensity with CMBR
        line_intensity = int(line_intensity * cmbr_line_adjust)
        line_color = f"#81{line_intensity:02x}ec"

        for i in range(len(points)):
            x1, y1 = points[i]
            x2, y2 = points[(i + 1) % len(points)]
            draw.line((x1, y1, x2, y2), fill=line_color, width=2)

        # Outer ring with coherence, adjusted by encoded description
        if self.coherence >= 0.05:
            intensity = int(255 * min(self.coherence, 1.0))
            ring_color = f"#{intensity:02x}{intensity:02x}ff"
            ring_radius = 70 * (0.8 + 0.4 * desc_value)
            draw.ellipse((center-ring_radius, center-ring_radius, center+ring_radius, center+ring_radius), outline=ring_color, width=3)

        # Additional ring with entanglement, adjusted by elevation
        if self.entanglement >= 0.5:
            ring_offset = 80 * (0.9 + 0.2 * normalized_elevation)
            draw.ellipse((center-ring_offset, center-ring_offset, center+ring_offset, center+ring_offset), outline="#ff9ff3", width=2)

        # Star with coherence, adjusted by encoded meaning
        if self.coherence >= 0.1:
            star_points = []
            star_size = 60 * (0.8 + 0.4 * meaning_value)
            for i in range(5):
                outer_angle = (i * 2 * pi / 5) - (pi / 2)
                inner_angle = (i * 2 * pi / 5 + pi / 5) - (pi / 2)
                outer_x = center + star_size * cos(outer_angle)
                outer_y = center + star_size * sin(outer_angle)
                inner_x = center + (star_size / 2) * cos(inner_angle)
                inner_y = center + (star_size / 2) * sin(inner_angle)
                star_points.extend([(outer_x, outer_y), (inner_x, inner_y)])
            draw.polygon(star_points, fill="#ffffff", outline="#ff9ff3")

        # Random ellipses, adjusted by encoded notes, static fibonacci, and deep_entropy
        num_ellipses = int(5 + 5 * notes_value + fib_static // 2 + deep_entropy * 5)
        for _ in range(num_ellipses):
            x = random.uniform(center-60, center+60)
            y = random.uniform(center-60, center+60)
            draw.ellipse((x-2, y-2, x+2, y+2), fill="#ffffff")

        # Moon phase effect with additional ellipses
        moon_phase = env_data.get('moon_phase', 'Unknown')
        moon_colors = {
            "New Moon": "#E6E6FA",
            "Waxing Crescent": "#D3D3FA",
            "First Quarter": "#C0C0FA",
            "Waxing Gibbous": "#ADADFA",
            "Full Moon": "#9A9AFA",
            "Waning Gibbous": "#8787FA",
            "Last Quarter": "#7474FA",
            "Waning Crescent": "#6161FA",
            "Unknown": "#E6E6FA"
        }
        moon_color = moon_colors.get(moon_phase, "#E6E6FA")
        for _ in range(3):
            x = random.uniform(center-50, center+50)
            y = random.uniform(center-50, center+50)
            draw.ellipse((x-2, y-2, x+2, y+2), fill=moon_color)

        # Additional chaotic elements based on kp_index
        if kp_index > 0:
            num_kp_ellipses = int(kp_index)  # 1 ellipse per kp_index unit
            for _ in range(num_kp_ellipses):
                x = random.uniform(center-70, center+70)
                y = random.uniform(center-70, center+70)
                draw.ellipse((x-3, y-3, x+3, y+3), fill="#ff9ff3")

        # Additional stars based on secondary emotions
        num_stars = len(secondary_emotions)
        for i in range(num_stars):
            star_center_x = center + 50 * cos(i * 2 * pi / max(num_stars, 1))
            star_center_y = center + 50 * sin(i * 2 * pi / max(num_stars, 1))
            star_points = []
            star_size = 20  # Smaller stars
            for j in range(5):
                outer_angle = (j * 2 * pi / 5) - (pi / 2)
                inner_angle = (j * 2 * pi / 5 + pi / 5) - (pi / 2)
                outer_x = star_center_x + star_size * cos(outer_angle)
                outer_y = star_center_y + star_size * sin(outer_angle)
                inner_x = star_center_x + (star_size / 2) * cos(inner_angle)
                inner_y = star_center_y + (star_size / 2) * sin(inner_angle)
                star_points.extend([(outer_x, outer_y), (inner_x, inner_y)])
            draw.polygon(star_points, fill="#ffffff", outline="#ff9ff3")

        image.save(filepath)

    def refresh_log(self):
        """Refresh the log display in the UI."""
        log_content = ""
        if os.path.exists(self.config["LOG_FILE"]):
            with open(self.config["LOG_FILE"], 'r') as f:
                data = json.load(f)
            for entry in data:
                ts = entry["timestamp"]
                desc = entry["description"]
                val = entry["data_point"] if "data_point" in entry else "(no direct value)"
                log_content += f"[{ts}]\n{desc}:\n→ {val}\n\n"
        self.update_ui({"log_display": log_content})

    def refresh_history(self):
        """Refresh the history display in the UI."""
        history_content = ""
        if os.path.exists(self.config["HISTORY_FILE"]):
            with open(self.config["HISTORY_FILE"], 'r') as f:
                history = json.load(f)
            for entry in history:
                history_content += (
                    f"[{entry['timestamp']}]\nGlyph: {entry['glyph_id']}\n"
                    f"Coherence: {entry['coherence']:.2f}, Entanglement: {entry['entanglement']:.2f}\n\n"
                )
        self.update_ui({"history_display": history_content})

    def refresh_narrative_history(self):
        """Refresh the narrative history display in the UI."""
        narrative_content = ""
        if os.path.exists(self.config["NARRATIVE_LOG_FILE"]):
            try:
                with open(self.config["NARRATIVE_LOG_FILE"], 'r') as f:
                    logs = json.load(f)
                logs.sort(key=lambda x: x["timestamp"], reverse=True)
                for entry in logs:
                    emotion_info = entry.get("emotion_tags", {})
                    emotion_display = f"Primary Emotion: {emotion_info.get('primary_emotion', 'unknown')}"
                    if "secondary_emotions" in emotion_info and emotion_info["secondary_emotions"]:
                        emotion_display += f", Secondary: {', '.join(emotion_info['secondary_emotions'])}"
                    narrative_content += (
                        f"[{entry['timestamp']}]\nGlyph: {entry['glyph_id']}\n"
                        f"Coherence: {entry['coherence']:.2f} | Entanglement: {entry['entanglement']:.2f}\n"
                        f"{emotion_display}\n"
                        f"{entry['narrative']}\n\n"
                    )
            except Exception as e:
                narrative_content = f"Error loading narrative log: {e}"
        self.update_ui({"narrative_history_display": narrative_content})

    def refresh_gallery(self):
        """Refresh the glyph gallery in the UI."""
        for widget in self.ui.gallery_inner.winfo_children():
            widget.destroy()
        self.thumbnail_refs.clear()  # Clear old references
        active_filters = [k for k, v in self.ui.filter_vars.items() if v.get()]
        glyphs = sorted([f for f in os.listdir(self.config["GLYPH_DIR"]) if f.endswith(".png")])
        timestamps = []
        for glyph in glyphs:
            base = glyph.replace(".png", "")
            txt_path = os.path.join(self.config["GLYPH_DIR"], f"{base}.txt")
            json_path = os.path.join(self.config["GLYPH_DIR"], f"{base}.json")
            if active_filters:
                try:
                    with open(txt_path, 'r') as f:
                        txt = f.read()
                    if not any(tag in txt for tag in active_filters):
                        continue
                except:
                    continue
            try:
                with open(json_path, 'r') as f:
                    data = json.load(f)
                    timestamps.append((data["timestamp_utc"], glyph))
            except:
                continue
            img_path = os.path.join(self.config["GLYPH_DIR"], glyph)
            try:
                img = Image.open(img_path)
                img.thumbnail((100, 100))
                img_tk = ImageTk.PhotoImage(img)
                self.thumbnail_refs.append(img_tk)
                def make_click_handler(path=img_path):
                    return lambda e: self.open_glyph_modal(path)
                lbl = tk.Label(self.ui.gallery_inner, image=img_tk, bg="#2d2d44", cursor="hand2")
                lbl.image = img_tk
                lbl.bind("<Button-1>", make_click_handler())
                lbl.pack(pady=5, padx=0, anchor="center")
            except Exception as e:
                print(f"Error loading thumbnail for {glyph}: {e}")
        timestamps.sort()
        self.timeline_data = timestamps
        self.ui.timeline_scale.config(to=max(len(self.timeline_data) - 1, 0))
        self.update_pulse_orbs()

    def update_pulse_orbs(self):
        """Update pulse orbs for the left panel."""
        self.pulse_orbs.clear()
        display_orbs = self.timeline_data[-10:] if len(self.timeline_data) > 10 else self.timeline_data
        w = 180
        h = 680
        spacing = h // max(len(display_orbs), 1)
        for i, (ts, glyph_file) in enumerate(display_orbs):
            json_path = os.path.join(self.config["GLYPH_DIR"], glyph_file.replace(".png", ".json"))
            try:
                with open(json_path, 'r') as f:
                    data = json.load(f)
                tags = data.get("tags", [])
                base_size = 10 + len(tags) * 3
                cx = w // 2
                cy = spacing * i + spacing // 2
                primary = tags[0] if tags else None
                color = self.config["orb_colors"].get(primary, "#ffffff")
                self.pulse_orbs.append({
                    "cx": cx, "cy": cy, "base_size": base_size, "color": color,
                    "tags": tags, "glyph_id": glyph_file.replace(".png", "")
                })
            except Exception as e:
                print(f"Resonance Pulse error on {glyph_file}: {e}")

    def open_glyph_modal(self, img_path):
        """Open a modal window to display glyph details."""
        glyph_id = os.path.basename(img_path).replace(".png", "")
        txt_path = os.path.join(self.config["GLYPH_DIR"], f"{glyph_id}.txt")
        modal = tk.Toplevel(self.ui.root)
        modal.title(f"{glyph_id} — Detail View")
        modal.configure(bg=self.config["bg_color"])
        modal.geometry("600x700")
        try:
            img = Image.open(img_path)
            img_tk = ImageTk.PhotoImage(img)
            panel = tk.Label(modal, image=img_tk, bg=self.config["bg_color"])
            panel.image = img_tk
            panel.pack(pady=10)
        except Exception as e:
            tk.Label(modal, text=f"Failed to load image: {e}", fg="red").pack()
        text_output = tk.Text(modal, wrap=tk.WORD, bg="#2d2d44", fg="#E6E6FA",
                              font=("Raleway", 9))
        text_output.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        if os.path.exists(txt_path):
            with open(txt_path, 'r') as f:
                content = f.read()
                text_output.insert(tk.END, content)
        else:
            text_output.insert(tk.END, "No .txt metadata found for this glyph.")
        close_btn = tk.Button(modal, text="Close", command=modal.destroy, bg="#ff7675",
                              fg="#ffffff", font=("Poppins", 10, "bold"), relief="flat")
        close_btn.pack(pady=5)

    def process_chatgpt_response(self, response_text):
        """Process a ChatGPT response and update state."""
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
            self.update_ui({"narrative_display": narrative_text})
            self.update_portal_progress(self.coherence)
            if self.last_ping:
                glyph_id = self.last_ping["glyph_id"]
                timestamp = datetime.utcnow().isoformat()
                self.save_narrative_log(
                    glyph_id=glyph_id,
                    timestamp=timestamp,
                    coherence=self.coherence,
                    entanglement=self.entanglement,
                    narrative=narrative_text,
                )
        except Exception as e:
            print(f"Error processing ChatGPT response: {e}")
            self.update_ui({"narrative_display": f"Error: {e}"})

    def mock_chatgpt_response(self):
        """Generate a mock ChatGPT response for testing."""
        if not self.last_ping:
            self.update_ui({"response_field": "No ping available for mock response."})
            return
        coherence = min(self.last_ping["observer_instruction"]["target_state"]["coherence_goal"] + random.uniform(0, 0.1), 1.0)
        entanglement = min(self.last_ping["observer_instruction"]["target_state"]["entanglement_goal"] + random.uniform(0, 0.05), 1.0)
        narrative = (
            f"The glyph pulses with {self.last_ping['intent']['destination']}’s energy. "
            f"A starlit portal outline shimmers, {int(coherence * 0.1 * 100)}% stable, glowing with Twilight’s magic."
        )
        response_text = f"coherence: {coherence:.2f}\nentanglement: {entanglement:.2f}\nnarrative: {narrative}"
        self.update_ui({"response_field": response_text})
        self.process_chatgpt_response(response_text)

    def reflect_on_journey(self):
        """Reflect on the narrative journey based on past logs."""
        if not os.path.exists(self.config["NARRATIVE_LOG_FILE"]):
            self.update_ui({"narrative_display": "No narrative history to reflect on."})
            return
        with open(self.config["NARRATIVE_LOG_FILE"], "r") as f:
            logs = json.load(f)
        if not logs:
            self.update_ui({"narrative_display": "No narrative history to reflect on."})
            return
        past_entry = max(logs, key=lambda x: x["coherence"])
        emotion_info = past_entry.get("emotion_tags", {})
        emotion_display = f"Primary Emotion: {emotion_info.get('primary_emotion', 'unknown')}"
        if "secondary_emotions" in emotion_info and emotion_info["secondary_emotions"]:
            emotion_display += f", Secondary: {', '.join(emotion_info['secondary_emotions'])}"
        reflection_prompt = (
            f"Twilight reflects on a past moment with coherence {past_entry['coherence']:.2f} and entanglement {past_entry['entanglement']:.2f}. "
            f"She recalls the emotions ({emotion_display}) "
            f"and the narrative: {past_entry['narrative'][:100]}... "
            f"Describe her thoughts on how this experience shaped her journey toward Equestria, focusing on her emotional growth and relationships."
        )
        self.update_ui({"response_field": reflection_prompt})
        self.process_chatgpt_response(reflection_prompt)

    def save_narrative_log(self, glyph_id, timestamp, coherence, entanglement, narrative):
        """Save a narrative log entry."""
        log_entry = {
            "glyph_id": glyph_id,
            "timestamp": timestamp,
            "coherence": round(coherence, 3),
            "entanglement": round(entanglement, 3),
            "narrative": narrative,
            "emotion_tags": self.last_ping["emotion_tags"]
        }
        if os.path.exists(self.config["NARRATIVE_LOG_FILE"]):
            with open(self.config["NARRATIVE_LOG_FILE"], "r") as f:
                data = json.load(f)
        else:
            data = []
        data.append(log_entry)
        with open(self.config["NARRATIVE_LOG_FILE"], "w") as f:
            json.dump(data, f, indent=2)
        self.refresh_narrative_history()

    def show_narrative_log(self):
        """Display the narrative log in a new window."""
        if not os.path.exists(self.config["NARRATIVE_LOG_FILE"]):
            return
        window = tk.Toplevel(self.ui.root)
        window.title("Narrative Log by Glyph")
        window.geometry("700x600")
        window.configure(bg=self.config["bg_color"])
        tk.Label(window, text="Narrative Log by Glyph", font=("Poppins", 10),
                 fg=self.config["glow_color"], bg=self.config["bg_color"]).pack(pady=5)
        text_area = scrolledtext.ScrolledText(window, wrap=tk.WORD, bg="#2d2d44", fg=self.config["text_color"], font=("Raleway", 9))
        text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        try:
            with open(self.config["NARRATIVE_LOG_FILE"], 'r') as f:
                data = json.load(f)
        except Exception as e:
            text_area.insert(tk.END, f"Error loading narrative log: {e}")
            return
        by_glyph = {}
        for entry in data:
            glyph = entry["glyph_id"]
            by_glyph.setdefault(glyph, []).append(entry)
        for glyph_id, entries in by_glyph.items():
            text_area.insert(tk.END, f"🌟 {glyph_id}:\n")
            for e in entries:
                ts = e["timestamp"]
                coh = e["coherence"]
                ent = e["entanglement"]
                narrative = e["narrative"]
                emotion_info = e.get("emotion_tags", {})
                emotion_display = f"Primary Emotion: {emotion_info.get('primary_emotion', 'unknown')}"
                if "secondary_emotions" in emotion_info and emotion_info["secondary_emotions"]:
                    emotion_display += f", Secondary: {', '.join(emotion_info['secondary_emotions'])}"
                text_area.insert(tk.END, f"  • [{ts}] C:{coh} E:{ent}\n    Emotions: {emotion_display}\n    ↳ {narrative}\n\n")

    def handle_timeline_scroll(self, idx):
        """Handle timeline scroll events."""
        idx = int(idx)
        if 0 <= idx < len(self.timeline_data):
            _, glyph_file = self.timeline_data[idx]
            img_path = os.path.join(self.config["GLYPH_DIR"], glyph_file)
            self.update_static_glyph_modal(img_path)

    def update_static_glyph_modal(self, img_path):
        """Update the static glyph modal with new content."""
        if not self.static_glyph_modal or not self.static_glyph_modal.winfo_exists():
            self.static_glyph_modal = tk.Toplevel(self.ui.root)
            self.static_glyph_modal.title("Glyph Viewer - Timeline Mode")
            self.static_glyph_modal.configure(bg=self.config["bg_color"])
            self.static_glyph_modal.geometry("600x700")
            self.modal_img_label = tk.Label(self.static_glyph_modal, bg=self.config["bg_color"])
            self.modal_img_label.pack(pady=10)
            self.modal_text_output = tk.Text(self.static_glyph_modal, wrap=tk.WORD, bg="#2d2d44", fg=self.config["text_color"],
                                             font=("Raleway", 9))
            self.modal_text_output.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
            close_btn = tk.Button(self.static_glyph_modal, text="Close", command=self.static_glyph_modal.destroy,
                                  bg="#ff7675", fg="#ffffff", font=("Poppins", 10, "bold"), relief="flat")
            close_btn.pack(pady=5)
        try:
            img = Image.open(img_path)
            img = img.resize((400, 400))
            img_tk = ImageTk.PhotoImage(img)
            self.modal_img_label.config(image=img_tk)
            self.modal_img_label.image = img_tk
            glyph_id = os.path.basename(img_path).replace(".png", "")
            txt_path = os.path.join(self.config["GLYPH_DIR"], f"{glyph_id}.txt")
            self.modal_text_output.delete(1.0, tk.END)
            if os.path.exists(txt_path):
                with open(txt_path, 'r') as f:
                    content = f.read()
                    self.modal_text_output.insert(tk.END, content)
            else:
                self.modal_text_output.insert(tk.END, "No .txt metadata found for this glyph.")
        except Exception as e:
            print(f"[MODAL ERROR] Failed to update static glyph modal: {e}")