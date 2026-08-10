import requests
from datetime import datetime
import math

def get_moon_phase():
    """Calculate the moon phase based on the current date."""
    now = datetime.utcnow()
    year, month, day = now.year, now.month, now.day
    c = e = jd = 0.0
    days_into_month = day

    if month <= 2:
        year -= 1
        month += 12

    a = year // 100
    b = a // 4
    c = 2 - a + b
    e = 365.25 * (year + 4716)
    f = 30.6001 * (month + 1)
    jd = c + days_into_month + e + f - 1524.5

    days_since_new = jd - 2451549.5
    new_moons = days_since_new / 29.53
    phase = (new_moons % 1) * 8
    phase_index = int(phase)

    phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
              "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"]
    return phases[phase_index]

def fetch_environmental_data(latitude, longitude, api_key):
    """Fetch weather and moon phase data, translating to resonance concepts."""
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={api_key}&units=metric"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        weather_description = data['weather'][0]['description'].lower()
        temperature = data['main']['temp']
        timestamp = datetime.utcnow().isoformat()

        # Resonance translation
        if any(x in weather_description for x in ["storm", "rain", "thunder"]):
            resonance_status = "Turbulent Field"
        elif "clear" in weather_description:
            resonance_status = "Harmonic Calm"
        elif any(x in weather_description for x in ["cloud", "overcast"]):
            resonance_status = "Veiled Stillness"
        else:
            resonance_status = "Unknown Song"

        moon_phase = get_moon_phase()

        return {
            "timestamp": timestamp,
            "weather": weather_description,
            "temperature_celsius": temperature,
            "resonance_status": resonance_status,
            "moon_phase": moon_phase
        }
    except Exception as e:
        print(f"Environmental fetch error: {e}")
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "weather": "unknown",
            "temperature_celsius": 0,
            "resonance_status": "Unknown Song",
            "moon_phase": "Unknown"
        }