import json
import random
import os  # Added missing import
from datetime import datetime, timezone

def save_to_file(data, filename):
    """Save data to a JSON file."""
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            existing_data = json.load(f)
    else:
        existing_data = []
    existing_data.append(data)
    with open(filename, 'w') as f:
        json.dump(existing_data, f, indent=2)

def save_observer_history(glyph_id, timestamp, coherence, entanglement, filename):
    """Save observer history to a JSON file."""
    entry = {
        "glyph_id": glyph_id,
        "timestamp": timestamp,
        "coherence": coherence,
        "entanglement": entanglement
    }
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            history = json.load(f)
    else:
        history = []
    history.append(entry)
    with open(filename, 'w') as f:
        json.dump(history, f, indent=2)

def dict_to_text(d, indent=0):
    """Convert a dictionary to a text representation."""
    lines = []
    for key, value in d.items():
        if isinstance(value, dict):
            lines.append(f"{'  ' * indent}{key}:")
            lines.extend(dict_to_text(value, indent + 1))
        elif isinstance(value, list):
            lines.append(f"{'  ' * indent}{key}:")
            for item in value:
                if isinstance(item, dict):
                    lines.extend(dict_to_text(item, indent + 1))
                else:
                    lines.append(f"{'  ' * (indent + 1)}- {item}")
        else:
            lines.append(f"{'  ' * indent}{key}: {value}")
    return lines

def encode_text_to_number(text, max_sum=5000):
    """Encode a text string into a numerical value by summing ASCII values and normalizing."""
    if not text:
        return 0.0
    ascii_sum = sum(ord(char) for char in text)
    return min(ascii_sum / max_sum, 1.0)

def normalize_elevation(elevation, min_elevation=-430, max_elevation=8848):
    """Normalize elevation to a 0-1 range based on global min and max elevations."""
    return (elevation - min_elevation) / (max_elevation - min_elevation)

def compute_time_delta(current_timestamp, previous_timestamp):
    """Compute the time difference in seconds between two ISO 8601 timestamps."""
    if not previous_timestamp:
        return 0.0
    try:
        current_dt = datetime.fromisoformat(current_timestamp.replace('Z', '+00:00')).astimezone(timezone.utc)
        previous_dt = datetime.fromisoformat(previous_timestamp.replace('Z', '+00:00')).astimezone(timezone.utc)
        delta = (current_dt - previous_dt).total_seconds()
        return max(0, delta)
    except Exception as e:
        print(f"Error computing time delta: {e}")
        return 0.0

def nearest_fibonacci_number(n):
    """Find the nearest Fibonacci number to the given value."""
    fibs = [1, 1]
    while fibs[-1] < n:
        fibs.append(fibs[-1] + fibs[-2])
    return min(fibs, key=lambda x: abs(x - n))

def generate_cmbr_data():
    """Generate CMBR data with a simulated fluctuation."""
    mean_temperature = 2.72548
    fluctuation = random.uniform(-0.00003, 0.00003)
    temperature = mean_temperature + fluctuation
    normalized_fluctuation = (temperature - 2.72545) / 0.00006
    return {
        "mean_temperature_kelvin": mean_temperature,
        "fluctuation_kelvin": fluctuation,
        "normalized_fluctuation": normalized_fluctuation
    }

def generate_auto_name(emotion, description):
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

def generate_auto_meaning(emotion, notes):
    """Generate an automatic meaning for a glyph."""
    return f"A glyph born of {emotion}, reflecting: {notes or 'unspoken energy'}."