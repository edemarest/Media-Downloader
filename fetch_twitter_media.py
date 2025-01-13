import os
import requests
from urllib.parse import urlparse
from dotenv import load_dotenv
import time

# Load environment variables from .env file
load_dotenv()

# Twitter API Bearer Token from the .env file
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_API_KEY")
if not TWITTER_BEARER_TOKEN:
    raise ValueError("Missing TWITTER_API_KEY in .env file.")

# Function to extract Tweet ID from URL
def extract_tweet_id(url):
    try:
        parsed_url = urlparse(url)
        if "twitter.com" in parsed_url.netloc or "x.com" in parsed_url.netloc:
            path_parts = parsed_url.path.split("/")
            if "status" in path_parts:
                return path_parts[path_parts.index("status") + 1]
    except Exception as e:
        print(f"Error extracting Tweet ID: {e}")
    return None

# Function to fetch media links from Twitter API with retry logic
def fetch_twitter_media_with_retry(tweet_id, retries=3, backoff_factor=15):
    api_url = f"https://api.twitter.com/2/tweets/{tweet_id}"
    params = {
        "expansions": "attachments.media_keys",
        "media.fields": "media_key,type,url,preview_image_url,variants",
    }
    headers = {
        "Authorization": f"Bearer {TWITTER_BEARER_TOKEN}"
    }

    for attempt in range(retries):
        try:
            print(f"Attempt {attempt + 1}: Requesting media from Twitter...")
            response = requests.get(api_url, headers=headers, params=params)
            response.raise_for_status()  # Raise error for HTTP codes >= 400

            # Log rate-limit headers
            print("Rate Limit Remaining:", response.headers.get("x-rate-limit-remaining"))
            print("Rate Limit Reset:", response.headers.get("x-rate-limit-reset"))

            return response.json()
        except requests.exceptions.HTTPError as e:
            if response.status_code == 429:
                retry_after = int(response.headers.get("retry-after", backoff_factor))
                print(f"Rate limit reached. Retrying after {retry_after} seconds...")
                time.sleep(retry_after)
            else:
                print(f"HTTP error: {e}")
                break
        except Exception as e:
            print(f"Unexpected error: {e}")
            break
    return None


# Function to extract media links from the API response
def extract_media_links(api_response):
    media = api_response.get("includes", {}).get("media", [])
    if not media:
        print("No media found in the API response.")
        return []

    media_links = []
    for item in media:
        if item["type"] in ["video", "animated_gif"]:
            best_variant = max(
                item["variants"],
                key=lambda v: v.get("bit_rate", 0),
                default=None
            )
            if best_variant and best_variant["content_type"] == "video/mp4":
                media_links.append(best_variant["url"])
        elif item["type"] == "photo":
            media_links.append(item["url"])

    return media_links

# Main function to process user input
def main():
    twitter_url = input("Enter a Twitter URL: ").strip()
    tweet_id = extract_tweet_id(twitter_url)

    if not tweet_id:
        print("Invalid Twitter URL. Please provide a valid Tweet link.")
        return

    print(f"Extracted Tweet ID: {tweet_id}")
    api_response = fetch_twitter_media_with_retry(tweet_id)

    if api_response:
        media_links = extract_media_links(api_response)
        if media_links:
            print("✅ Media found! Here are the links:")
            for link in media_links:
                print(link)
        else:
            print("❌ No media found in the provided Tweet.")
    else:
        print("❌ Failed to fetch media from Twitter API.")

if __name__ == "__main__":
    main()
