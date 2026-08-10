# display_banner_messages.py
import json

def display_banners():
    try:
        with open("banner_messages.json", "r") as f:
            banners = json.load(f)
        
        print("\n--- Current Banner Messages ---")
        for idx, message in enumerate(banners, 1):
            print(f"{idx}. {message}")
        print("--------------------------------\n")
    
    except FileNotFoundError:
        print("No banner_messages.json file found.")
    except json.JSONDecodeError:
        print("Error reading banner_messages.json (corrupted or empty file).")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    display_banners()
