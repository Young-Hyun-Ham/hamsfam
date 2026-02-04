// src/routes/api/youtube/picks/+server.ts
import { json } from "@sveltejs/kit";

export async function GET({ url }: any) {
  const channelUrl = url.searchParams.get("channelUrl") ?? "";

  if (!channelUrl) {
    return json({ ok: false, checkedAt: new Date().toISOString(), channelUrl, error: "channelUrl is required" }, { status: 400 });
  }

  // TODO(실구현):
  // 1) channelUrl -> channelId resolve
  // 2) 최근 24시간 업로드 영상 조회(YouTube Data API)
  // 3) 자막/스크립트 조회(공식 캡션 or transcript)
  // 4) AI 분석 -> 코스피/코스닥 종목 추출 -> Top 1~3 랭킹
  // 5) 결과 저장/캐시(Firestore) + 실시간 알림(FCM/웹푸시)

  // 더미 응답
  return json({
    ok: true,
    checkedAt: new Date().toISOString(),
    channelUrl,
    latestVideo: {
      title: "샘플 영상 (24시간 이내)",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    picks: [
      {
        market: "KOSPI",
        code: "005930",
        name: "삼성전자",
        reason: "영상에서 언급된 매크로/수급 포인트가 단기 모멘텀에 유리하다고 판단",
        confidence: 0.72,
      },
      {
        market: "KOSDAQ",
        code: "035420",
        name: "NAVER",
        reason: "실적/테마 언급과 함께 눌림 구간 재진입 시나리오가 제시됨",
        confidence: 0.64,
      },
    ],
  });
}
