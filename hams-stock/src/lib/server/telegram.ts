// src/lib/server/telegram.ts
import { TELEGRAM_BOT_TOKEN } from "$env/static/private";
import { TELEGRAM_CHAT_ID } from "$env/static/private";

export async function sendTelegram(text: string) {
  const token = TELEGRAM_BOT_TOKEN;
  const chatId = TELEGRAM_CHAT_ID;

  if (!token || !chatId) throw new Error("Telegram env missing");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) throw new Error(`Telegram send failed: ${res.status} ${await res.text()}`);
}
