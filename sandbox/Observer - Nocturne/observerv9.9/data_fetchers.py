import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from textblob import TextBlob
import swisseph as swe
from datetime import datetime
from xml.etree import ElementTree as ET  # Added missing import

class DataFetchers:
    def __init__(self):
        self.session = requests.Session()
        retries = Retry(total=2, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
        self.session.mount('http://', HTTPAdapter(max_retries=retries))
        self.session.mount('https://', HTTPAdapter(max_retries=retries))

    def fetch_gravitational_wave_strain(self):
        """Fetch recent gravitational wave strain data from GWOSC API."""
        try:
            url = "https://gwosc.org/eventapi/json/GWTC/"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            events = response.json()
            
            if "events" not in events:
                return 0.0
            event_list = events["events"]
            if not event_list:
                return 0.0
            
            event = next(iter(event_list.values()))
            strain = event.get("peak_luminosity_distance", 1e-21)
            normalized_strain = min(strain / 1e-20, 1.0)
            return normalized_strain
        except Exception as e:
            print(f"Error fetching gravitational wave data: {e}")
            return 0.0

    def fetch_solar_activity(self):
        """Fetch recent sunspot number from NOAA API."""
        try:
            url = "https://services.swpc.noaa.gov/json/sunspot_report.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data:
                return 0.0
            
            sunspot_number = data[-1].get("sunspot_number", 0)
            normalized_sunspot = min(sunspot_number / 300, 1.0)
            return normalized_sunspot
        except Exception as e:
            print(f"Error fetching solar activity data: {e}")
            return 0.0

    def fetch_belief_sentiment(self):
        """Fetch arXiv abstracts mentioning Equestria/Twilight Sparkle and compute sentiment."""
        try:
            query = 'all:"Equestria" OR all:"Twilight Sparkle"'
            url = f"http://export.arxiv.org/api/query?search_query={query}&start=0&max_results=10"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            abstracts = [entry.find("{http://www.w3.org/2005/Atom}summary").text for entry in root.findall("{http://www.w3.org/2005/Atom}entry")]
            
            if not abstracts:
                return 0.5
            
            sentiment_scores = []
            for abstract in abstracts:
                blob = TextBlob(abstract)
                sentiment = blob.sentiment.polarity
                sentiment_scores.append(sentiment)
            
            avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)
            belief_factor = (avg_sentiment + 1) / 2
            return belief_factor
        except Exception as e:
            print(f"Error fetching belief sentiment data: {e}")
            return 0.5

    def compute_cosmic_alignment(self, timestamp):
        """Compute cosmic alignment factor based on Sun-Moon angular separation."""
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60 + dt.second / 3600)
            
            sun_pos = swe.calc_ut(jd, swe.SUN)[0][0]
            moon_pos = swe.calc_ut(jd, swe.MOON)[0][0]
            
            angle = abs(sun_pos - moon_pos)
            if angle > 180:
                angle = 360 - angle
            
            cosmic_factor = 1 - (angle / 180)
            return cosmic_factor
        except Exception as e:
            print(f"Error computing cosmic alignment: {e}")
            return 0.5