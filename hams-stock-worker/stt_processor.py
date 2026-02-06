# stt_processor.py
# Step4(STT) 전용 로직을 클래스로 분리.
# worker.py는 그대로 run 진입점 유지, 루프에서 await stt.process_batch(db)만 호출하면 됨.
#
# 필요:
#   pip install faster-whisper yt-dlp firebase-admin
#   + ffmpeg PATH 등록

import os
import time
import tempfile
import subprocess
from typing import Any, Dict, Optional, List

from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from faster_whisper import WhisperModel


class SttProcessor:
    def __init__(self):
        # Firestore 컬렉션/상태값
        self.signals_collection = os.getenv("SIGNALS_COLLECTION", "signals")
        self.input_status = os.getenv("STT_INPUT_STATUS", "queued")
        self.processing_status = os.getenv("STT_PROCESSING_STATUS", "stt_processing")
        self.done_status = os.getenv("STT_DONE_STATUS", "stt_done")
        self.error_status = os.getenv("STT_ERROR_STATUS", "stt_error")

        # 한 번 폴링당 처리 수(기본 1개)
        self.max_batch = int(os.getenv("STT_MAX_BATCH", "1"))

        # Firestore 문서 과대 방지용
        self.transcript_max_chars = int(os.getenv("TRANSCRIPT_MAX_CHARS", "60000"))
        self.preview_chars = int(os.getenv("TRANSCRIPT_PREVIEW_CHARS", "4000"))
        self.max_segments = int(os.getenv("STT_MAX_SEGMENTS", "500"))

        # Whisper 설정
        self.model_size = os.getenv("STT_MODEL_SIZE", "small")     # tiny/base/small/medium/large-v3
        self.device = os.getenv("STT_DEVICE", "cpu")               # cpu | cuda
        self.compute_type = os.getenv("STT_COMPUTE_TYPE", "int8")  # cpu=int8 권장 / cuda=float16 가능

        self._model: Optional[WhisperModel] = None

    # ---------- 내부 유틸 ----------

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
        return self._model

    def _run_cmd(self, cmd: List[str]) -> None:
        p = subprocess.run(cmd, capture_output=True, text=True)
        if p.returncode != 0:
            msg = (p.stderr or p.stdout or "").strip()
            raise RuntimeError(msg[:2000])

    def _pick_video_url(self, data: Dict[str, Any]) -> str:
        """
        Step3에서 signals에 넣는 필드를 기준으로 URL을 결정.
        기본: videoUrl 우선, 없으면 videoId로 유튜브 URL 생성.
        """
        v = data.get("videoUrl")
        if isinstance(v, str) and v.strip():
            return v.strip()

        vid = data.get("videoId")
        if isinstance(vid, str) and vid.strip():
            return f"https://www.youtube.com/watch?v={vid.strip()}"

        # 혹시 다른 필드명 사용 중이면 여기에 추가
        alt = data.get("url") or data.get("youtubeUrl")
        if isinstance(alt, str) and alt.strip():
            return alt.strip()

        return ""

    def _download_audio_mp3(self, video_url: str, out_dir: str) -> str:
        """
        yt-dlp로 오디오만 추출해서 mp3 생성.
        ffmpeg가 PATH에 있어야 함.
        """
        out_tpl = os.path.join(out_dir, "%(id)s.%(ext)s")
        cmd = [
            "yt-dlp",
            "-f", "bestaudio/best",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "-o", out_tpl,
            video_url,
        ]
        self._run_cmd(cmd)

        for fn in os.listdir(out_dir):
            if fn.lower().endswith(".mp3"):
                return os.path.join(out_dir, fn)

        raise RuntimeError("yt-dlp succeeded but mp3 not found")

    def _transcribe(self, audio_path: str) -> Dict[str, Any]:
        model = self._get_model()

        segments, info = model.transcribe(
            audio_path,
            vad_filter=True,  # 무음 제거
        )

        segs = []
        texts = []
        for s in segments:
            txt = (s.text or "").strip()
            if txt:
                texts.append(txt)
            segs.append({
                "start": float(s.start),
                "end": float(s.end),
                "text": txt,
            })

        transcript = "\n".join(texts).strip()
        if self.transcript_max_chars > 0 and len(transcript) > self.transcript_max_chars:
            transcript = transcript[: self.transcript_max_chars] + "\n…(truncated)"

        return {
            "transcript": transcript,
            "segments": segs,
            "language": getattr(info, "language", None),
            "duration": float(getattr(info, "duration", 0.0) or 0.0),
        }

    def _claim(
        self,
        db: firestore.Client,
        doc_ref: firestore.DocumentReference,
        video_url: str,
    ) -> Optional[Dict[str, Any]]:
        """
        트랜잭션 선점:
        status == input_status 문서만 processing_status로 바꿔서 중복 처리 방지.
        + stt 메타 기본값(모델/디바이스 등)도 기록
        """
        tx = db.transaction()

        @firestore.transactional
        def _txn(t: firestore.Transaction):
            snap = doc_ref.get(transaction=t)
            if not snap.exists:
                return None
            data = snap.to_dict() or {}
            if data.get("status") != self.input_status:
                return None

            # stt 기본 메타를 선점 단계에서도 남겨둠(운영/디버깅 도움)
            t.update(doc_ref, {
                "status": self.processing_status,
                "updatedAt": firestore.SERVER_TIMESTAMP,
                "sttStartedAt": firestore.SERVER_TIMESTAMP,
                "stt": {
                    "model": self.model_size,
                    "device": self.device,
                    "computeType": self.compute_type,
                    "videoUrl": video_url,
                },
            })
            return data

        return _txn(tx)

    # ---------- 외부에서 호출 ----------

    async def process_batch(self, db: firestore.Client) -> int:
        """
        worker.py의 루프에서 주기적으로 호출.
        queued 문서를 max_batch개까지 처리하고 stt_done으로 바꿈.
        """
        q = (
            db.collection(self.signals_collection)
            .where(filter=FieldFilter("status", "==", self.input_status))
            .order_by("createdAt")
            .limit(self.max_batch)
        )

        docs = q.get()
        if not docs:
            return 0

        processed = 0

        for snap in docs:
            ref = snap.reference

            # 먼저 URL을 뽑아둬야 claim 단계에서 기록 가능
            raw = snap.to_dict() or {}
            video_url = self._pick_video_url(raw)

            if not video_url:
                ref.update({
                    "status": self.error_status,
                    "sttError": "videoUrl/videoId missing",
                    "sttErrorAt": firestore.SERVER_TIMESTAMP,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                    "stt": {
                        "model": self.model_size,
                        "device": self.device,
                        "computeType": self.compute_type,
                    },
                })
                continue

            # 선점(락)
            data = self._claim(db, ref, video_url=video_url)
            if not data:
                continue

            t0 = time.time()
            try:
                with tempfile.TemporaryDirectory(prefix="hams_stt_") as td:
                    # download
                    t_dl0 = time.time()
                    print(f"[STT] downloading... doc={snap.id} url={video_url}")
                    mp3_path = self._download_audio_mp3(video_url, td)
                    download_sec = time.time() - t_dl0

                    # transcribe
                    t_tr0 = time.time()
                    print(f"[STT] transcribing... doc={snap.id} mp3={os.path.basename(mp3_path)}")
                    result = self._transcribe(mp3_path)
                    print(f"[STT] saving... doc={snap.id} chars={len(result.get('transcript') or '')}")
                    transcribe_sec = time.time() - t_tr0

                elapsed_sec = time.time() - t0

                transcript = result.get("transcript") or ""
                segments = result.get("segments") or []
                stored_segments = segments[: self.max_segments]

                ref.update({
                    "status": self.done_status,
                    "transcript": transcript,
                    "transcriptPreview": transcript[: self.preview_chars],
                    "segments": stored_segments,
                    "stt": {
                        "model": self.model_size,
                        "device": self.device,
                        "computeType": self.compute_type,
                        "videoUrl": video_url,
                        "language": result.get("language"),
                        "durationSec": result.get("duration"),
                        "segmentCount": len(segments),
                        "segmentsStored": len(stored_segments),
                        "transcriptChars": len(transcript),
                        "downloadSec": round(download_sec, 3),
                        "transcribeSec": round(transcribe_sec, 3),
                        "elapsedSec": round(elapsed_sec, 3),
                    },
                    "sttDoneAt": firestore.SERVER_TIMESTAMP,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                })

                print(f"[STT_DONE] {self.signals_collection}/{snap.id} url={video_url}")
                processed += 1

            except Exception as e:
                elapsed_sec = time.time() - t0
                ref.update({
                    "status": self.error_status,
                    "sttError": repr(e)[:1500],
                    "sttErrorAt": firestore.SERVER_TIMESTAMP,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                    "stt": {
                        "model": self.model_size,
                        "device": self.device,
                        "computeType": self.compute_type,
                        "videoUrl": video_url,
                        "elapsedSec": round(elapsed_sec, 3),
                    },
                })
                print(f"[STT_ERROR] {self.signals_collection}/{snap.id} err={repr(e)}")

        return processed
