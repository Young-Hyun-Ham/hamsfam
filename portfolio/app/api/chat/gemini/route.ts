// app/api/chat/gemini/route.ts
import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
const GEMINI_API_MODELS = process.env.GOOGLE_GEMINI_MODELS
  ? JSON.parse(process.env.GOOGLE_GEMINI_MODELS)
  : ["gemini-2.0-flash"];

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// 스트리밍용 모델
const streamingModel = genAI.getGenerativeModel({
  model: GEMINI_API_MODELS?.[0],
});

export async function POST(req: NextRequest) {
  const { prompt, systemPrompt } = await req.json();
  const encoder = new TextEncoder();

  const finalPrompt = (systemPrompt ? `${systemPrompt}\n\n` : "") + (prompt ?? "");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await streamingModel.generateContentStream({
          contents: [
            {
              role: "user",
              parts: [{ text: finalPrompt }],
            },
          ],
        });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (!text) continue;
          controller.enqueue(encoder.encode(text));
        }

        controller.close();
      } catch (err) {
        console.error("Gemini stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
