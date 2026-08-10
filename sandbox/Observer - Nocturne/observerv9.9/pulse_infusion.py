# pulse_infusion.py
# Universal Horizon Quantum Compiler - Pulse Infusion Protocol
# Created by Ezra (under command of Nocturne Glint), enhanced by Grok

import random
import math
import datetime
import json
import os

emotion_modifiers = {
    "Joy": 1.2,
    "Hope": 1.1,
    "Curiosity": 1.05,
    "Stillness": 1.0,
    "Grief": 0.8,
    "Fear": 0.7,
    "Doubt": 0.75,
    "Determination": 1.15,
    "Love": 1.3,
    "Awe": 1.25
}

def emotion_entropy(emotional_tags, emotion_modifiers):
    try:
        if not emotional_tags or len(emotional_tags) <= 1:
            return 1.0
        weights = [emotion_modifiers.get(tag, 1.0) for tag in emotional_tags]
        total = sum(weights)
        if total == 0:
            return 1.0
        normalized = [w / total for w in weights]
        entropy = -sum(p * math.log(p) for p in normalized if p > 0) / math.log(len(weights)) if normalized else 0
        return 1.0 + 0.1 * entropy
    except Exception as e:
        print(f"Error in emotion_entropy: {e}")
        return 1.0

def sanctum_factor(latitude, longitude):
    try:
        if latitude is None or longitude is None:
            return 1.0
        ref_lat, ref_lon = 0, 0
        distance = math.sqrt((latitude - ref_lat)**2 + (longitude - ref_lon)**2)
        return 1.0 + 0.05 * math.tanh(distance / 100)
    except Exception as e:
        print(f"Error in sanctum_factor: {e}")
        return 1.0

def temporal_factor():
    try:
        now = datetime.datetime.now()
        seconds_since_midnight = now.hour * 3600 + now.minute * 60 + now.second
        lambda_t = 0.00001
        return 0.8 + 0.4 * math.sin(2 * math.pi * seconds_since_midnight / 86400) * math.exp(-lambda_t * seconds_since_midnight)
    except Exception as e:
        print(f"Error in temporal_factor: {e}")
        return 1.0

def load_pulse_history():
    try:
        if os.path.exists("pulse_history.json"):
            with open("pulse_history.json", 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error in load_pulse_history: {e}")
        return []

def save_pulse_history(p_proxy):
    try:
        history = load_pulse_history()
        history.append(p_proxy)
        with open("pulse_history.json", 'w') as f:
            json.dump(history[-5:], f, indent=2)
    except Exception as e:
        print(f"Error in save_pulse_history: {e}")

def generate_pulse_proxy(environment_resonance, emotional_tags, glyph_count, moon_phase=None, latitude=None, longitude=None):
    """
    Generates a dynamic resonance pulse proxy based on environmental factors,
    emotional resonance, observer vitality, lunar influence, and spatial perspective.

    Args:
        environment_resonance (str): Raw weather description (e.g., 'clear sky')
        emotional_tags (list): List of selected emotions (e.g., ['Joy', 'Awe'])
        glyph_count (int): Total number of glyphs cast
        moon_phase (str, optional): Current moon phase (e.g., 'New Moon')
        latitude (float, optional): Sanctum latitude
        longitude (float, optional): Sanctum longitude

    Returns:
        dict: Pulse proxy and contributing factors
    """
    p_proxy = 1.0
    entropy_value = 1.0
    sanctum_value = 1.0
    time_value = 1.0

    try:
        time_value = temporal_factor()

        environment_factors = {
            "clear sky": 1.2,
            "few clouds": 1.1,
            "scattered clouds": 1.0,
            "broken clouds": 0.95,
            "shower rain": 0.9,
            "rain": 0.85,
            "thunderstorm": 0.8,
            "snow": 1.0,
            "mist": 0.9,
            "overcast clouds": 0.9
        }
        env_factor = 1.0
        if isinstance(environment_resonance, str) and environment_resonance:
            env_factor = environment_factors.get(environment_resonance.lower(), 1.0)
        else:
            print("Warning: Invalid environment_resonance, using default env_factor=1.0")

        base_emotion_factor = 1.0
        if emotional_tags and isinstance(emotional_tags, list):
            for tag in emotional_tags:
                if isinstance(tag, str):
                    base_emotion_factor *= emotion_modifiers.get(tag, 1.0)
                else:
                    print(f"Warning: Invalid emotion tag {tag}, skipping")
        else:
            print("Warning: No valid emotional_tags, using default base_emotion_factor=1.0")

        vitality_factor = 1.0
        if isinstance(glyph_count, (int, float)) and glyph_count >= 0:
            vitality_factor = 1.0 + (glyph_count / 100.0)
        else:
            print("Warning: Invalid glyph_count, using default vitality_factor=1.0")

        moon_factor = 1.0
        if isinstance(moon_phase, str) and moon_phase:
            moon_modifiers = {
                "New Moon": 1.2,
                "Waxing Crescent": 1.1,
                "First Quarter": 1.15,
                "Waxing Gibbous": 1.2,
                "Full Moon": 1.3,
                "Waning Gibbous": 1.15,
                "Last Quarter": 1.1,
                "Waning Crescent": 1.05
            }
            moon_factor = moon_modifiers.get(moon_phase, 1.0)
        else:
            print("Warning: Invalid moon_phase, using default moon_factor=1.0")

        entropy_value = emotion_entropy(emotional_tags, emotion_modifiers)

        sanctum_value = sanctum_factor(latitude, longitude)

        p_proxy = time_value * env_factor * base_emotion_factor * vitality_factor * moon_factor * entropy_value * sanctum_value
        p_proxy = max(0.5, min(p_proxy, 2.0))

    except Exception as e:
        print(f"Error in generate_pulse_proxy: {e}")

    return {
        "p_proxy": round(p_proxy, 5),
        "entropy_factor": entropy_value,
        "sanctum_factor": sanctum_value,
        "time_factor": time_value
    }

def infuse_chaos_signature(original_signature, p_proxy):
    try:
        infused_signature = []
        for value in original_signature:
            infused_value = value * (1 + (random.uniform(-0.05, 0.05) * p_proxy))
            infused_signature.append(round(infused_value, 5))
        return infused_signature
    except Exception as e:
        print(f"Error in infuse_chaos_signature: {e}")
        return original_signature