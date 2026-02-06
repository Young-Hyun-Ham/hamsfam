import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("TELEGRAM_BOT_TOKEN")
if not token:
    raise SystemExit("TELEGRAM_BOT_TOKEN missing")

url = f"https://api.telegram.org/bot{token}/getUpdates"
r = requests.get(url, timeout=30)
r.raise_for_status()
data = r.json()

print("ok =", data.get("ok"))
result = data.get("result") or []
print("updates =", len(result))

# 최근 5개만 보여주기
for u in result[-5:]:
    msg = u.get("message") or u.get("channel_post") or {}
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    chat_type = chat.get("type")
    title = chat.get("title") or chat.get("username") or ""
    text = msg.get("text") or ""
    print(f"- chat_id={chat_id} type={chat_type} title={title} text={text}")
