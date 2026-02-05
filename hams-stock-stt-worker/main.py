# stt-worker/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import os
import whisper

TMP_DIR = "./tmp"
os.makedirs(TMP_DIR, exist_ok=True)

app = FastAPI(title="Local YouTube STT Worker")

model = whisper.load_model("base")  # tiny / base / small / medium / large

class SttRequest(BaseModel):
    videoId: str

class SttResponse(BaseModel):
    transcript: str
    duration: float | None = None

def download_audio(video_id: str) -> str:
    out = os.path.join(TMP_DIR, f"{video_id}.%(ext)s")
    url = f"https://www.youtube.com/watch?v={video_id}"

    cmd = [
        "yt-dlp",
        "-f", "bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--no-playlist",
        "-o", out,
        url,
    ]

    # stdout/stderr 캡쳐해서 실패 원인을 그대로 확인
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            "yt-dlp failed\n"
            f"cmd: {' '.join(cmd)}\n"
            f"stdout: {proc.stdout[-2000:]}\n"
            f"stderr: {proc.stderr[-2000:]}\n"
        )

    mp3_path = os.path.join(TMP_DIR, f"{video_id}.mp3")
    if not os.path.exists(mp3_path):
        raise RuntimeError(f"mp3 not created: {mp3_path}")
    return mp3_path

@app.post("/stt/youtube", response_model=SttResponse)
def stt_youtube(req: SttRequest):
    try:
        audio_path = download_audio(req.videoId)
        result = model.transcribe(audio_path, language="ko")
        text = (result.get("text") or "").strip()

        if not text:
            raise HTTPException(status_code=422, detail="empty transcript")

        return {"transcript": text, "duration": result.get("duration")}
    except HTTPException:
        raise
    except Exception as e:
        # 원인 그대로 전달 (개발용)
        raise HTTPException(status_code=500, detail=str(e))
