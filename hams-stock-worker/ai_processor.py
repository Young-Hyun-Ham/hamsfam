# ai_processor.py
import os
import time
from typing import Any, Dict, Optional, List

from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from openai import OpenAI
from pydantic import BaseModel, Field

from telegram_notifier import TelegramNotifier

class StockPick(BaseModel):
    code: Optional[str] = Field(default=None, description="한국 주식 코드(가능하면 6자리). 불명확하면 null")
    name: str = Field(description="종목명 또는 회사/티커")
    reason: str = Field(description="스크립트 근거 요약(핵심 문장/맥락 중심)")
    confidence: float = Field(ge=0, le=1, description="0~1 신뢰도")


class PicksResult(BaseModel):
    stocks: List[StockPick] = Field(description="1~3개 추천. 확신 없으면 0개 가능")
    summary: str = Field(description="전체 요약 1~3문장")
    risk_notes: Optional[str] = Field(default=None, description="리스크/주의사항(선택)")


class AiProcessor:
    """
    signals(status=stt_done) -> LLM -> stocks[] 저장 -> status=ai_done
    """

    def __init__(self):
        self.signals_collection = os.getenv("SIGNALS_COLLECTION", "signals")

        self.input_status = os.getenv("AI_INPUT_STATUS", "stt_done")
        self.processing_status = os.getenv("AI_PROCESSING_STATUS", "ai_processing")
        self.done_status = os.getenv("AI_DONE_STATUS", "ai_done")
        self.error_status = os.getenv("AI_ERROR_STATUS", "ai_error")

        self.max_batch = int(os.getenv("AI_MAX_BATCH", "1"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.max_chars = int(os.getenv("AI_TRANSCRIPT_MAX_CHARS", "18000"))
        self.temperature = float(os.getenv("AI_TEMPERATURE", "0.2"))

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing. load_dotenv() should run in worker.py (top).")

        self.client = OpenAI(api_key=api_key)
        self.tg = TelegramNotifier()

    def _claim(self, db: firestore.Client, doc_ref: firestore.DocumentReference) -> bool:
        tx = db.transaction()

        @firestore.transactional
        def _txn(t: firestore.Transaction):
            snap = doc_ref.get(transaction=t)
            if not snap.exists:
                return False
            data = snap.to_dict() or {}
            if data.get("status") != self.input_status:
                return False

            t.update(doc_ref, {
                "status": self.processing_status,
                "updatedAt": firestore.SERVER_TIMESTAMP,
                "aiStartedAt": firestore.SERVER_TIMESTAMP,
                "ai": {
                    "model": self.model,
                    "temperature": self.temperature,
                },
            })
            return True

        return _txn(tx)

    def _build_prompt(self, transcript: str) -> List[Dict[str, str]]:
        system = (
            "너는 한국 주식 투자 분석가다. "
            "아래 유튜브 대화/스크립트를 바탕으로 수익성이 있을 가능성이 있는 종목을 1~3개 제시하라. "
            "근거는 반드시 스크립트에 기반해 요약하고, 과장/추정은 리스크로 분리하라."
        )
        user = (
            "다음 스크립트에서 '언급되었거나 강하게 암시되는' 수익성 있는 종목 후보를 뽑아줘.\n\n"
            "- 가능한 경우 한국 종목코드(6자리)를 code로 넣어줘. 확실치 않으면 null.\n"
            "- stocks는 0~3개.\n"
            "- 각 종목은 reason(근거)와 confidence(0~1)를 포함.\n\n"
            f"[SCRIPT]\n{transcript}\n"
        )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def _run_llm(self, transcript: str) -> PicksResult:
        t = transcript.strip()
        if self.max_chars > 0 and len(t) > self.max_chars:
            t = t[: self.max_chars] + "\n…(truncated)"

        messages = self._build_prompt(t)

        resp = self.client.responses.parse(
            model=self.model,
            input=messages,
            text_format=PicksResult,
            temperature=self.temperature,
        )
        return resp.output_parsed  # type: ignore

    async def process_batch(self, db: firestore.Client, uid: Optional[str] = None, telegram_notify: Optional[bool] = False) -> int:
        """
        uid를 넘기면 해당 uid의 stt_done만 처리 (테스트/운영 편의)
        """
        q = db.collection(self.signals_collection).where(
            filter=FieldFilter("status", "==", self.input_status)
        )

        if uid:
            q = q.where(filter=FieldFilter("uid", "==", uid))

        q = q.order_by("createdAt").limit(self.max_batch)

        docs = q.get()
        if not docs:
            print(f"[AI] no docs status={self.input_status} uid={uid or '*'}")
            return 0

        processed = 0

        for snap in docs:
            ref = snap.reference

            # claim 먼저
            if not self._claim(db, ref):
                continue

            # claim 이후 최신 내용 다시 읽기(안전)
            latest = ref.get().to_dict() or {}
            transcript = (latest.get("transcript") or "").strip()

            if not transcript:
                ref.update({
                    "status": self.error_status,
                    "aiError": "transcript missing",
                    "aiErrorAt": firestore.SERVER_TIMESTAMP,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                })
                print(f"[AI_ERROR] {self.signals_collection}/{snap.id} transcript missing")
                continue

            t0 = time.time()
            try:
                result = self._run_llm(transcript)
                elapsed = time.time() - t0

                stocks_payload = [
                    {
                        "code": s.code,
                        "name": s.name,
                        "reason": s.reason,
                        "confidence": s.confidence,
                    }
                    for s in result.stocks
                ]

                ref.update({
                    "status": self.done_status,
                    "stocks": stocks_payload,
                    "aiSummary": result.summary,
                    "aiRiskNotes": result.risk_notes,
                    "ai": {
                        "model": self.model,
                        "temperature": self.temperature,
                        "stockCount": len(stocks_payload),
                        "elapsedSec": round(elapsed, 3),
                        "inputChars": len(transcript),
                    },
                    "aiDoneAt": firestore.SERVER_TIMESTAMP,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                })

                if telegram_notify:
                  # 텔레그램 알림
                  latest2 = ref.get().to_dict() or {}

                  # 이미 전송했으면 스킵
                  telegram = (latest2.get("telegram") or {})
                  if telegram.get("sentAt"):
                      print(f"[TG_SKIP] {self.signals_collection}/{snap.id} already sent")
                  else:
                      try:
                          msg = self.tg.format_message(signal_id=snap.id, doc=latest2)
                          resp = self.tg.send(msg)

                          ref.update({
                              "telegram": {
                                  "sentAt": firestore.SERVER_TIMESTAMP,
                                  "ok": True,
                                  "messageId": (resp.get("result") or {}).get("message_id"),
                              },
                              "updatedAt": firestore.SERVER_TIMESTAMP,
                          })
                          print(f"[TG_DONE] {self.signals_collection}/{snap.id}")

                      except Exception as te:
                          ref.update({
                              "telegram": {
                                  "errorAt": firestore.SERVER_TIMESTAMP,
                                  "ok": False,
                                  "error": repr(te)[:1500],
                              },
                              "updatedAt": firestore.SERVER_TIMESTAMP,
                          })
                          print(f"[TG_ERROR] {self.signals_collection}/{snap.id} err={repr(te)}")

                print(f"[AI_DONE] {self.signals_collection}/{snap.id} stocks={len(stocks_payload)}")
                processed += 1

            except Exception as e:
                elapsed = time.time() - t0
                ref.update({
                    "status": self.error_status,
                    "aiError": repr(e)[:1500],
                    "aiErrorAt": firestore.SERVER_TIMESTAMP,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                    "ai": {
                        "model": self.model,
                        "temperature": self.temperature,
                        "elapsedSec": round(elapsed, 3),
                    },
                })
                print(f"[AI_ERROR] {self.signals_collection}/{snap.id} err={repr(e)}")

        return processed
