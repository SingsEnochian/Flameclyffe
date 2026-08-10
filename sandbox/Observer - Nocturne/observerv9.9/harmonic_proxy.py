import random
from datetime import datetime
import math

def generate_harmonic_proxy(env_data, emotions, desc, notes, last_cast_timestamp=None):
    # === Base Frequency ===
    base_freq = 7.83  # Fundamental Schumann resonance

    # === Moon Phase Modifier ===
    moon_phase = env_data.get("moon_phase", "Unknown").lower()
    moon_mod = {
        "new moon": 0.0,
        "waxing crescent": 0.05,
        "first quarter": 0.1,
        "waxing gibbous": 0.15,
        "full moon": 0.2,
        "waning gibbous": 0.15,
        "last quarter": 0.1,
        "waning crescent": 0.05
    }.get(moon_phase, 0.0)

    # === Weather Modifier ===
    weather = env_data.get("weather", "clear").lower()
    weather_mod = {
        "thunderstorm": 0.3,
        "rain": 0.2,
        "snow": 0.1,
        "fog": -0.05,
        "cloudy": 0.05,
        "clear": 0.0
    }.get(weather, 0.0)

    # === Emotion Modifier ===
    emotion_mods = {
        "joy": 0.1,
        "curiosity": 0.05,
        "hope": 0.08,
        "grief": -0.1,
        "fear": -0.05,
        "determination": 0.07,
        "stillness": 0.0,
        "love": 0.1,
        "awe": 0.06,
        "doubt": -0.03
    }
    emotion_shift = sum(emotion_mods.get(e.lower(), 0.0) for e in emotions)

    # === Intention Entropy ===
    desc_entropy = len(desc.split()) * 0.01 if desc else 0.0
    emotion_entropy = len(emotions) * 0.05
    time_entropy = 0.0
    if last_cast_timestamp:
        try:
            last_time = datetime.fromisoformat(last_cast_timestamp)
            delta = (datetime.utcnow() - last_time).total_seconds()
            time_entropy = min(delta * 0.001, 1.0)
        except Exception:
            pass
    intention_entropy = desc_entropy + emotion_entropy + time_entropy

    # === Harmonic Drift (Chaos) ===
    harmonic_drift = random.uniform(-0.5, 0.5)

    # === Calculate Average ===
    freq_avg = base_freq + moon_mod + weather_mod + emotion_shift + intention_entropy + harmonic_drift
    freq_avg = max(6.0, min(freq_avg, 10.0))

    # === Calculate Min/Max ===
    freq_min = max(5.5, freq_avg - random.uniform(0.4, 1.0))
    freq_max = min(11.0, freq_avg + random.uniform(0.4, 1.0))

    harmonic_proxy_index = round((freq_avg - 6.0) / 4.0, 3)  # Normalize to 0.0 - 1.0

    print("DEBUG ::")
    print(f"  desc_entropy: {desc_entropy}")
    print(f"  emotion_entropy: {emotion_entropy}")
    print(f"  time_entropy: {time_entropy}")
    print(f"  intention_entropy: {intention_entropy}")
    print(f"  moon_shift (mod): {moon_mod}")
    print(f"  weather_shift (mod): {weather_mod}")
    print(f"  emotion_shift (sum): {emotion_shift}")
    print(f"  drift: {harmonic_drift:.3f}")
    print(f"  harmonic_index: {harmonic_proxy_index:.3f}")



    return {
        "frequency_avg_hz": round(freq_avg, 3),
        "frequency_min_hz": round(freq_min, 3),
        "frequency_max_hz": round(freq_max, 3),
        "intention_entropy": round(intention_entropy, 3),
        "harmonic_proxy_index": harmonic_proxy_index
    }
