# AI Chat 패키지 구조 Front
```bash
app/(content-header)/ai-chat/
├── README.md                    # AI Chat Front 문서 (이 파일)
├── page.tsx                     # 라우트 엔트리(페이지) - 채팅 화면 조립/렌더
├── index.ts                     # export 모음(옵션)
├── types.ts                     # ChatMessage 등 타입 정의
├── store/
│   └── index.ts                 # UI/세션/선택 상태(zustand) 등 스토어
└── components/
    ├── ChatShell.tsx            # 전체 레이아웃(좌측 리스트 + 우측 채팅창)
    ├── LeftRail.tsx             # 좌측 레일(아이콘/토글/네비)
    ├── ListPanel.tsx            # 좌측 패널(친구/채팅 리스트 영역 컨테이너)
    ├── FriendList.tsx           # 친구 리스트 UI
    ├── ChatList.tsx             # 채팅방 리스트 UI
    ├── ListItem.tsx             # 리스트 공통 아이템(채팅방/친구 등)
    ├── ChatWindow.tsx           # 우측 채팅창(헤더/메시지/입력)
    ├── ChatHeader.tsx           # 채팅 상단 헤더(상대/액션/메뉴)
    ├── ChatMessageList.tsx      # 메시지 리스트 래퍼(스크롤/정렬)
    ├── ChatMessageBubble.tsx    # 메시지 버블(내/상대/AI 스타일)
    └── ChatComposer.tsx         # 하단 입력창(텍스트 입력/전송/토글/메뉴)
```
---

## Front 구조 개요
AI Chat 프론트는 “좌측(리스트) + 우측(채팅)” 2패널 구조로, Next.js App Router의 (content-header) 레이아웃 영역 안에서 동작한다.

### 화면 레이아웃 구성
- page.tsx
  - 라우트 진입점
  - 보통 ChatShell을 렌더링하여 전체 UI를 구성

- components/ChatShell.tsx
  - 전체 2컬럼 레이아웃 담당
  - 좌측: LeftRail + ListPanel
  - 우측: ChatWindow

- components/LeftRail.tsx
  - 좌측 아이콘 레일 / 패널 토글 버튼 등
  - “리스트 숨김/토글” 같은 UI 상태를 store로 관리하는 흐름과 연결됨

- components/ListPanel.tsx
  - 좌측 패널 컨테이너
  - 내부에 FriendList, ChatList 등을 배치

- components/FriendList.tsx, components/ChatList.tsx, components/ListItem.tsx
  - 좌측에서 “친구 목록/채팅방 목록”을 보여줌
  - 특정 채팅방 클릭 시 **selectedRoomId(또는 선택 상태)**를 store로 변경 → 우측 채팅창이 해당 방을 렌더링

### 채팅 창 구성(우측)
- components/ChatWindow.tsx
  - 우측 채팅 영역 전체 컨테이너
  - 상단 ChatHeader
  - 중앙 ChatMessageList
  - 하단 ChatComposer
  - 메시지 스크롤 하단 고정 등의 UX 처리(예: 새 메시지 올 때 자동 스크롤)

- components/ChatHeader.tsx
  - 상대 정보(이름/상태) 및 액션 버튼(검색/통화/메뉴 등) 렌더링

- components/ChatMessageList.tsx
  - 메시지 배열을 받아 리스트로 렌더링
  - 개별 메시지는 ChatMessageBubble로 출력

- components/ChatMessageBubble.tsx
  - role(내/상대/AI)에 따른 말풍선 스타일 적용
  - (추가 구현 시) quickReplies(슬롯/브랜치 선택 버튼)도 메시지 하단에 렌더링 가능

- components/ChatComposer.tsx
  - 텍스트 입력/전송 버튼
  - “chatbot 메뉴/토글” 같은 UI 이벤트 제공
  - chatbotEnabled 상태를 localStorage로 유지(현재 구조)

### 상태 관리(Store) 방식

- store/index.ts (Zustand)
  - 좌측 리스트 선택/토글 등 UI 상태
  - 예: selectedRoomId, 패널 숨김 여부 등
  - 메시지 배열(messages)을 store에서 관리하고
  - ChatWindow → ChatMessageList가 store의 messages를 직접 구독(selector) 해서 렌더링하는 구조가 되어야 함
  - 포인트: Zustand에서 getRoom() 같은 함수 결과를 selector로 쓰면 리렌더가 안 걸릴 수 있으니,
  - state.rooms[roomId].messages처럼 상태를 직접 selector로 구독하는 방식이 안전함.

### 타입 정의
- types.ts
  - 예: ChatMessage 타입( id, role, text, time, meta 등 )
  - role 예시: "me" | "other" | "other-ai"
