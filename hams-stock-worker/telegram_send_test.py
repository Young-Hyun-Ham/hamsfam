import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

token = os.getenv("TELEGRAM_BOT_TOKEN")
chat_id = os.getenv("TELEGRAM_CHAT_ID")

print("CWD =", os.getcwd())
print("BOT_TOKEN startswith =", (token or "")[:10])
print("CHAT_ID =", chat_id)

if not token or not chat_id:
    raise SystemExit("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")

url = f"https://api.telegram.org/bot{token}/sendMessage"
payload = {"chat_id": chat_id, "text": "ping from python", "disable_web_page_preview": True}

r = requests.post(url, json=payload, timeout=30)
print("HTTP =", r.status_code)
print("BODY =", r.text)
r.raise_for_status()
