# space_weather_fetcher.py
# Universal Horizon Observer - Space Weather Module
# Feature: Geomagnetic Kp Index Fetcher
# Version: v1.0

import requests
from datetime import datetime

def fetch_kp_index():
    try:
        url = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        kp_data = response.json()

        if not kp_data:
            raise ValueError("No Kp data received.")

        latest_entry = kp_data[-1]

        return {
            "timestamp": latest_entry.get("time_tag", datetime.utcnow().isoformat()),
            "kp_index": latest_entry.get("kp_index", 0)
        }
    except Exception as e:
        print(f"[Space Weather Fetcher] Error fetching Kp Index: {e}")
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "kp_index": -1
        }
