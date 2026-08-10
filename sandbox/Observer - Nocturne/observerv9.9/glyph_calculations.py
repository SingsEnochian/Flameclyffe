import numpy as np
from math import exp
from datetime import datetime, timezone

class GlyphCalculations:
    def calculate_quantum_factor(self, ping):
        """Calculate the quantum factor based on various penalties."""
        entropy = ping["source_data"].get("entropy_factor", 1.0)
        harmonic_index = ping["source_data"]["harmonic_proxy"].get("harmonic_proxy_index", 0.5)
        cmbr_fluct = ping["source_data"]["cmbr"].get("fluctuation_kelvin", 0.0)
        time_delta = ping.get("time_since_previous_cast", 0.0)
        
        emotion_list = ping.get("emotion_tags", {}).get("secondary_emotions", [])
        emotion_count = 1 + len(emotion_list)
        emotion_entropy = min(0.1 * (emotion_count - 1), 0.4)

        if time_delta < 120:
            time_penalty = 0.0
        elif time_delta < 600:
            time_penalty = 0.2
        else:
            time_penalty = 0.4

        entropy_penalty = min(entropy * 0.15, 0.2)
        harmonic_penalty = abs(0.55 - harmonic_index) * 0.3
        cmbr_penalty = min(abs(cmbr_fluct * 1000) * 0.05, 0.2)

        penalties = [entropy_penalty, harmonic_penalty, cmbr_penalty, emotion_entropy, time_penalty]
        quantum_factor = max(0.0, min(1.0, 1.0 - sum(penalties) / len(penalties)))
        
        return round(quantum_factor, 6)

    def compute_deep_theory_metrics(self, ping, sanctum, dark_energy_density=0.68):
        """Compute simplified DEEP Theory metrics for the glyph, enhanced with new data."""
        latitude = sanctum['Sanctum_Anchor']['Coordinates']['Latitude']
        longitude = sanctum['Sanctum_Anchor']['Coordinates']['Longitude']
        elevation = sanctum['Sanctum_Anchor']['Coordinates']['Elevation']
        timestamp = ping["timestamp_utc"]
        
        inception_time = "2025-04-27T14:27:00Z"
        ref_latitude = sanctum['Sanctum_Anchor']['Coordinates']['Latitude']
        ref_longitude = sanctum['Sanctum_Anchor']['Coordinates']['Longitude']
        ref_elevation = sanctum['Sanctum_Anchor']['Coordinates']['Elevation']
        
        current_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).astimezone(timezone.utc)
        inception_dt = datetime.fromisoformat(inception_time.replace('Z', '+00:00')).astimezone(timezone.utc)
        t_norm = (current_dt - inception_dt).total_seconds() / 31536000
        x0_norm = (inception_dt - inception_dt).total_seconds() / 31536000
        
        lat_norm = (latitude + 90) / 180
        lon_norm = (longitude + 180) / 360
        elev_norm = (elevation - (-430)) / (8848 - (-430))
        ref_lat_norm = (ref_latitude + 90) / 180
        ref_lon_norm = (ref_longitude + 180) / 360
        ref_elev_norm = (ref_elevation - (-430)) / (8848 - (-430))
        
        grav_strain = ping["source_data"]["space_weather_context"]["gravitational_wave_strain"]
        belief_factor = ping["source_data"]["space_weather_context"]["belief_factor"]
        
        P_0 = ping["source_data"]["quantum_factor"]
        sigma = 0.1
        lambda_val = 0.1
        spatial_term = exp(-((lat_norm - ref_lat_norm)**2 + (lon_norm - ref_lon_norm)**2 + (elev_norm - ref_elev_norm)**2) / (sigma**2))
        f_t = exp(-lambda_val * t_norm)
        P_base = P_0 * spatial_term * f_t
        P = P_base * (1 + grav_strain) * belief_factor * (1 + dark_energy_density)
        
        R = 0.1
        R_deep = R * (1 + P)
        
        log_W = ping["source_data"]["entropy_factor"]
        S_deep = log_W * f_t
        
        return {
            "perspective_function": P,
            "deep_ricci_scalar": R_deep,
            "deep_entropy": S_deep
        }

    def compute_entanglement_coefficient(self, ping):
        """Compute a quantum entanglement correlation coefficient."""
        quantum_factor = ping["source_data"]["quantum_factor"]
        belief_factor = ping["source_data"]["space_weather_context"]["belief_factor"]
        emotion_list = ping.get("emotion_tags", {}).get("secondary_emotions", [])
        emotion_count = 1 + len(emotion_list)
        emotion_entropy = min(0.1 * (emotion_count - 1), 0.4)
        entanglement_coeff = quantum_factor * belief_factor * (1 - emotion_entropy)
        return max(0.0, min(1.0, entanglement_coeff))

    def compute_frequency_match(self, chaos, harmonic_index, emotion_count):
        """Compute frequency matching factor between chaos signature and Equestria's theoretical frequency."""
        fft_result = np.fft.fft(chaos)
        frequencies = np.fft.fftfreq(len(chaos))
        magnitudes = np.abs(fft_result)
        dominant_freq = abs(frequencies[np.argmax(magnitudes[1:]) + 1])
        equestria_freq = harmonic_index * (1 + 0.1 * (emotion_count - 1))
        max_freq = max(abs(frequencies))
        freq_match = 1 - abs(dominant_freq - equestria_freq) / max_freq if max_freq > 0 else 0.5
        return max(0.0, min(1.0, freq_match))

    def simulate_brainwave_frequency(self, primary_emotion, harmonic_index):
        """Simulate brainwave frequency based on emotion and harmonic index."""
        alpha_emotions = ["Joy", "Love", "Hope", "Awe"]
        theta_emotions = ["Curiosity", "Stillness", "Determination"]
        beta_emotions = ["Grief", "Fear", "Doubt"]
        
        if primary_emotion in alpha_emotions:
            base_freq = 8
            freq_range = 4
        elif primary_emotion in theta_emotions:
            base_freq = 4
            freq_range = 4
        else:
            base_freq = 12
            freq_range = 18
        
        frequency = base_freq + freq_range * harmonic_index
        normalized_freq = frequency / 30
        return normalized_freq