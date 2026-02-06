# worker.py
from dotenv import load_dotenv
load_dotenv()

import os
import time
import asyncio
from typing import Optional, Dict, Any, List
import xml.etree.ElementTree as ET

import httpx
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from stt_processor import SttProcessor
from ai_processor import AiProcessor


POLL_SECONDS = int(os.getenv("POLL_SECONDS", "60"))  # 1분마다
UID_FALLBACK = os.getenv("DEFAULT_UID", "demo")

# 서비스 계정 JSON 경로(권장)
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")


def init_firestore():
    if firebase_admin._apps:
        return firestore.client()

    if GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
        cred = credentials.Certificate(GOOGLE_APPLICATION_CREDENTIALS)
        firebase_admin.initialize_app(cred)
    else:
        # Cloud Run/GCE 등에서는 ADC(기본자격증명)로도 동작 가능
        firebase_admin.initialize_app()

    return firestore.client()


def parse_latest_from_rss(xml_text: str) -> Optional[Dict[str, Any]]:
    """
    YouTube RSS: https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx
    최신 entry 1개에서 videoId/title/published/link 뽑음
    """
    root = ET.fromstring(xml_text)

    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "yt": "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/",
    }

    entry = root.find("atom:entry", ns)
    if entry is None:
        return None

    video_id_el = entry.find("yt:videoId", ns)
    title_el = entry.find("atom:title", ns)
    published_el = entry.find("atom:published", ns)
    link_el = entry.find("atom:link", ns)

    video_id = video_id_el.text.strip() if video_id_el is not None and video_id_el.text else None
    title = title_el.text.strip() if title_el is not None and title_el.text else ""
    published = published_el.text.strip() if published_el is not None and published_el.text else ""
    link = link_el.get("href") if link_el is not None else ""

    if not video_id:
        return None

    return {
        "videoId": video_id,
        "title": title,
        "publishedAt": published,
        "videoUrl": link or f"https://www.youtube.com/watch?v={video_id}",
    }


async def fetch_latest_video(channel_id: str) -> Optional[Dict[str, Any]]:
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, headers={"User-Agent": "hams-stock-worker/1.0"})
        if r.status_code != 200:
            return None
        return parse_latest_from_rss(r.text)


async def signal_exists(db, uid: str, video_id: str) -> bool:
    q = (
        db.collection("signals")
        .where(filter=FieldFilter("uid", "==", uid))
        .where(filter=FieldFilter("videoId", "==", video_id))
        .limit(1)
    )
    docs = q.get()
    return len(docs) > 0


async def process_target(db, t: Dict[str, Any]):
    target_id = t["id"]
    uid = t.get("uid") or UID_FALLBACK
    enabled = t.get("enabled", False)

    if not enabled:
        return

    channel_id = t.get("channelId")
    if not channel_id:
        # MVP에서는 channelId 없는 케이스는 스킵(프론트에서 저장하도록 유도)
        print(f"[SKIP] watch_targets/{target_id} channelId missing")
        return

    latest = await fetch_latest_video(channel_id)
    if not latest:
        print(f"[WARN] RSS fetch failed channelId={channel_id}")
        return

    latest_video_id = latest["videoId"]
    last_video_id = t.get("lastVideoId")

    # 새 영상 여부(가장 단순한 기준)
    if last_video_id == latest_video_id:
        return

    # 혹시 lastVideoId가 비어있으면 "최초 동기화"로만 처리할지,
    # 아니면 queued 생성할지 선택 가능. MVP는 queued 생성해도 됨.
    # 여기서는 "비어있어도 queued 생성"으로 통일.
    if await signal_exists(db, uid, latest_video_id):
        print(f"[DEDUP] already exists uid={uid} videoId={latest_video_id}")
    else:
        doc = {
            "uid": uid,
            "channelId": channel_id,
            "channelUrl": t.get("channelUrl", ""),
            "videoId": latest_video_id,
            "videoUrl": latest.get("videoUrl", f"https://www.youtube.com/watch?v={latest_video_id}"),
            "title": latest.get("title", ""),
            "publishedAt": latest.get("publishedAt", ""),
            "status": "queued",
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
        db.collection("signals").add(doc)
        print(f"[QUEUED] uid={uid} channelId={channel_id} videoId={latest_video_id}")

    # watch_targets에 lastVideoId 갱신(중복 방지 핵심)
    db.collection("watch_targets").document(target_id).update(
        {
            "lastVideoId": latest_video_id,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
    )


def load_watch_targets(db) -> List[Dict[str, Any]]:
    # enabled == true 만
    q = db.collection("watch_targets").where(filter=FieldFilter("enabled", "==", True))
    docs = q.get()
    out = []
    for d in docs:
        v = d.to_dict() or {}
        v["id"] = d.id
        out.append(v)
    return out


async def main_loop():
    db = init_firestore()
    stt = SttProcessor() # ✅ STT 클래스 인스턴스 생성
    ai = AiProcessor()   # ✅ AI 클래스 인스턴스 생성
    print("[WORKER] started")

    while True:
        try:
            targets = load_watch_targets(db)
            if targets:
                await asyncio.gather(*(process_target(db, t) for t in targets))
            
            # queued -> stt_done
            await stt.process_batch(db)
            # stt_done -> ai_done
            await ai.process_batch(db, telegram_notify=True)
        except Exception as e:
            print("[ERROR]", repr(e))

        await asyncio.sleep(POLL_SECONDS)



# 테스트 용 유틸리티 함수
import argparse

def create_test_signal(db, uid: str, channel_id: str, video_id: str):
    doc = {
        "uid": uid,
        "channelId": channel_id,
        "channelUrl": "",
        "videoId": video_id,
        "videoUrl": f"https://www.youtube.com/watch?v={video_id}",
        "title": "[TEST] manual queued",
        "publishedAt": "",
        "status": "queued",
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    db.collection("signals").add(doc)
    print(f"[TEST-QUEUED] uid={uid} channelId={channel_id} videoId={video_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="hams-stock worker"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # ======================
    # run: 실제 워커 실행
    # ======================
    run_parser = sub.add_parser("run", help="run worker loop")

    # ======================
    # test-queued: signals 강제 생성
    # ======================
    tq = sub.add_parser("test-queued", help="create test queued signal")
    tq.add_argument("--uid", default=os.getenv("DEFAULT_UID", "demo"))
    tq.add_argument("--channelId", required=True)
    tq.add_argument("--videoId", required=True)

    # ======================
    # test-stt: queued 생성 + STT 1회
    # ======================
    ts = sub.add_parser("test-stt", help="create queued signal and run STT once")
    ts.add_argument("--uid", default=os.getenv("DEFAULT_UID", "demo"))
    ts.add_argument("--channelId", required=True)
    ts.add_argument("--videoId", required=True)

    # ======================
    # test-ai: AI만 1회 (stt_done 문서가 있어야 함)
    # ======================
    ta = sub.add_parser("test-ai", help="run AI once for stt_done signals")
    ta.add_argument("--uid", default=os.getenv("DEFAULT_UID", "demo"))

    # ======================
    # test-all: queued 생성 + STT + AI 한 방
    # ======================
    tall = sub.add_parser("test-all", help="create queued + run STT + run AI once")
    tall.add_argument("--uid", default=os.getenv("DEFAULT_UID", "demo"))
    tall.add_argument("--channelId", required=True)
    tall.add_argument("--videoId", required=True)

    args = parser.parse_args()

    if args.command == "run":
        asyncio.run(main_loop())
        
    elif args.command == "test-queued":
        print(f"[TEST-QUEUED] uid={args.uid} channelId={args.channelId} videoId={args.videoId}")
        db = init_firestore()
        create_test_signal(
            db=db,
            uid=args.uid,
            channel_id=args.channelId,
            video_id=args.videoId,
        )
        
    elif args.command == "test-stt":
        print(f"[TEST-STT] uid={args.uid} channelId={args.channelId} videoId={args.videoId}")
        db = init_firestore()
        stt = SttProcessor()
        asyncio.run(stt.process_batch(db))

    elif args.command == "test-ai":
        print(f"[TEST-AI] uid={args.uid}")
        db = init_firestore()
        ai = AiProcessor()
        asyncio.run(ai.process_batch(db, uid=args.uid, telegram_notify=True))

    elif args.command == "test-all":
        print(f"[TEST] uid={args.uid} channelId={args.channelId} videoId={args.videoId}")
        db = init_firestore()
        create_test_signal(
            db=db,
            uid=args.uid,
            channel_id=args.channelId,
            video_id=args.videoId,
        )
        stt = SttProcessor()
        asyncio.run(stt.process_batch(db))
        ai = AiProcessor()
        asyncio.run(ai.process_batch(db, uid=args.uid, telegram_notify=True))
    else: 
        print("Unknown command")
