import requests
import time
import json

API_URL = "https://anime-search-api-4.onrender.com/api/v1/search/"
PAYLOAD = {"query": "baruto"}
INTERVAL_SECONDS = 7 * 60  # 7 minutes

def send_api_request():
    try:
        response = requests.post(API_URL, json=PAYLOAD)
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
        print(f"API request successful at {time.ctime()}. Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"API request failed at {time.ctime()}. Error: {e}")

if __name__ == "__main__":
    print(f"Starting API pinger. Sending requests every {INTERVAL_SECONDS / 60} minutes.")
    while True:
        send_api_request()
        time.sleep(INTERVAL_SECONDS)
