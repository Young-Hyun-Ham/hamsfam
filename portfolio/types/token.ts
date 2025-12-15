
type useTokenInput = {
  userId: string,                           // 로그인한 사용자 uid
  amount: number,                           // 계산된 사용 토큰 수
  usageType: "llm" | "builder" | "board",   // 용도: llm사용, 빌더사용, 게시판사용
  source: "chatbot" | "builder" | "board",  // 시스템: chatbot메뉴, builder메뉴, 게시판메뉴
  sessionId: string,                        // ex) 채팅 방 sessionid: session-1765153859736
  messageId: string,                        // 해당 시스템 id: ex) welcome-1765153859736
  memo: string,                             // 내용: ex) 챗봇 대화 1턴 사용
}

export type {
  useTokenInput,
};