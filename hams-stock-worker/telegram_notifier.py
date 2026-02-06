# telegram_notifier.py
import os
import requests
from typing import Any, Dict, List, Optional


class TelegramNotifier:
    def __init__(self):
        self.enabled = os.getenv("TELEGRAM_ENABLED", "1") == "1"
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID", "")

        if self.enabled and (not self.bot_token or not self.chat_id):
            raise RuntimeError("Telegram enabled but TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing")

        self.base = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else ""

    def _post(self, method: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base}/{method}"
        r = requests.post(url, json=payload, timeout=30)
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text}

        if r.status_code != 200:
            raise RuntimeError(f"Telegram HTTP {r.status_code}: {data}")

        if not data.get("ok"):
            raise RuntimeError(f"Telegram API error: {data}")
        return data

    def format_message(self, signal_id: str, doc: Dict[str, Any]) -> str:
        stocks: List[Dict[str, Any]] = doc.get("stocks") or []
        summary = (doc.get("aiSummary") or "").strip()
        risk = (doc.get("aiRiskNotes") or "").strip()

        video_id = doc.get("videoId")
        video_url = doc.get("videoUrl") or (f"https://www.youtube.com/watch?v={video_id}" if video_id else "")
        channel_id = doc.get("channelId") or ""

        lines = []
        lines.append("📈 *AI 시그널 감지*")
        if channel_id:
            lines.append(f"• 채널: `{channel_id}`")
        if video_url:
            lines.append(f"• 영상: {video_url}")
        lines.append(f"• signalId: `{signal_id}`")
        lines.append("")

        if stocks:
            lines.append("✅ *탑픽(1~3)*")
            for i, s in enumerate(stocks[:3], 1):
                name = (s.get("name") or "").strip()
                code = s.get("code")
                conf = s.get("confidence")
                reason = (s.get("reason") or "").strip()

                head = f"{i}. {name}"
                if code:
                    head += f" ({code})"
                if isinstance(conf, (int, float)):
                    head += f"  _conf {conf:.2f}_"
                lines.append(head)
                if reason:
                    # 텔레그램 메시지 길이/가독성용으로 1~2줄만
                    short = reason.strip()
                    if len(short) > 300:
                        short = short[:300] + "…"
                    lines.append(f"   - {short}")
            lines.append("")
        else:
            lines.append("⚠️ 이번 스크립트에서는 확실한 종목 후보를 찾지 못했어요.")
            lines.append("")

        if summary:
            lines.append("🧾 *요약*")
            lines.append(summary if len(summary) <= 600 else summary[:600] + "…")
            lines.append("")

        if risk:
            lines.append("⚠️ *리스크/주의*")
            lines.append(risk if len(risk) <= 600 else risk[:600] + "…")
            lines.append("")

        # MarkdownV2는 escaping이 귀찮아서 Markdown 사용(기본)
        return "\n".join(lines).strip()

    def send(self, text: str) -> Dict[str, Any]:
        if not self.enabled:
            return {"ok": True, "skipped": True}

        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False,
        }
        return self._post("sendMessage", payload)
