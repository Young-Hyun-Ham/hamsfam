import os
import time
import feedparser
import httpx
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

# --- Firebase Admin init ---
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.environ["FIREBASE_PROJECT_ID"],
    "private_key_id": os.environ["FIREBASE_PRIVATE_KEY_ID"],
    "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
    "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
    "client_id": os.environ["FIREBASE_CLIENT_ID"],
    "token_uri": "https://oauth2.googleapis.com/token",
})
firebase_admin.initialize_app(cred)
db = firestore.client()

POLL_SEC = int(os.getenv("POLL_SEC", "60"))

def youtube_feed_url(channel_id: str) -> str:
    return f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"

def parse_video_id(entry) -> str:
    # entry.link: https://www.youtube.com/watch?v=VIDEOID
    link = entry.get("link", "")
    if "watch?v=" in link:
        return link.split("watch?v=")[1].split("&")[0]
    # fallback: entry.id may include "yt:video:VIDEOID"
    eid = entry.get("id", "")
    if "yt:video:" in eid:
        return eid.split("yt:video:")[1]
    return ""

def already_processed(video_id: str) -> bool:
    doc = db.collection("yt_events").document(video_id).get()
    return doc.exists

def save_event(video_id: str, channel_id: str, title: str, link: str, published: str, picks: list, transcript_len: int):
    db.collection("yt_events").document(video_id).set({
        "videoId": video_id,
        "channelId": channel_id,
        "title": title,
        "link": link,
        "publishedAt": published,
        "status": "done",
        "picks": picks,
        "transcriptLen": transcript_len,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }, merge=True)

def send_telegram(text: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    httpx.post(url, json={"chat_id": chat_id, "text": text})

# --- TODO: 여기에 너의 STT/AI 로직을 붙이면 됨 ---
def stt_transcribe(video_id: str) -> str:
    # 1) 영상 오디오 다운로드
    # 2) whisper 등으로 transcript 생성
    # 지금은 자리만.
    return f"[stub transcript for {video_id}]"

def ai_pick_stocks(transcript: str) -> list:
    # OpenAI/Gemini 등으로 1~3개 종목 추출
    # 지금은 자리만.
    return [
        {"market": "KOSPI", "code": "005930", "name": "삼성전자", "reason": "예시 근거", "confidence": 0.6}
    ]

def fetch_enabled_channels():
    qs = db.collection("yt_subscriptions").where("enabled", "==", True).stream()
    out = []
    for d in qs:
        data = d.to_dict()
        # 문서 id를 channelId로 쓰는 구조면 d.id가 channelId
        channel_id = data.get("channelId") or d.id
        out.append(channel_id)
    return out

def loop():
    while True:
        try:
            channels = fetch_enabled_channels()
            for cid in channels:
                feed = feedparser.parse(youtube_feed_url(cid))
                if not feed.entries:
                    continue

                # 최신 1개만 감지(원하면 여러개 처리 가능)
                e = feed.entries[0]
                video_id = parse_video_id(e)
                if not video_id:
                    continue
                if already_processed(video_id):
                    continue

                title = e.get("title", "")
                link = e.get("link", "")
                published = e.get("published", "")

                transcript = stt_transcribe(video_id)
                picks = ai_pick_stocks(transcript)

                save_event(
                    video_id=video_id,
                    channel_id=cid,
                    title=title,
                    link=link,
                    published=published,
                    picks=picks,
                    transcript_len=len(transcript),
                )

                # 텔레그램 메시지
                msg_lines = [f"📺 새 영상 감지: {title}", link, ""]
                for p in picks[:3]:
                    msg_lines.append(f"✅ {p['name']}({p['code']}) - {p['reason']}")
                send_telegram("\n".join(msg_lines))

                # (옵션) 구독 문서에 lastSeenVideoId 갱신
                db.collection("yt_subscriptions").document(cid).set({
                    "lastSeenVideoId": video_id,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                }, merge=True)

        except Exception as e:
            print("worker error:", e)

        time.sleep(POLL_SEC)

if __name__ == "__main__":
    loop()
