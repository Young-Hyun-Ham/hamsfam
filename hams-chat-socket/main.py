import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # 서버에서만 사용 (절대 프론트에 노출 금지)

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()

    # (선택) 토큰 검증: 클라이언트가 헤더로 Authorization: Bearer <jwt> 보내는 방식 권장
    # token = ws.headers.get("authorization", "").replace("Bearer ", "").strip()
    # 여기서 Supabase JWT 검증 로직을 추가할 수 있음 (JWKS로 검증하거나, 서버에서 supabase auth API 이용)

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)

            # 예: { "room_id": "r1", "user_id": "u1", "text": "hello" }
            room_id = data.get("room_id")
            user_id = data.get("user_id")
            text = (data.get("text") or "").strip()

            if not text:
                await ws.send_text(json.dumps({"type": "error", "message": "empty"}))
                continue

            # 1) Supabase(Postgres)에 저장
            sb.table("chat_messages").insert({
                "room_id": room_id,
                "user_id": user_id,
                "content": text,
            }).execute()

            # 2) 간단 에코 (실서비스는 룸 브로드캐스트/멀티커넥션 관리)
            await ws.send_text(json.dumps({"type": "ack", "room_id": room_id, "text": text}))

    except WebSocketDisconnect:
        return
