# Board 패키지 구조 Front
```bash
app/(content-header)/board/
├── README.md                    # Board Front 문서 (이 파일)
└── [slug]/
    ├── components/
    │   ├── BoardDetailPanel.tsx # 게시글 상세 패널
    │   ├── BoardListPanel.tsx   # 게시글 목록 패널
    │   ├── BoardSearchBar.tsx   # 검색/필터 UI
    │   └── modal/
    │       ├── BoardDeleteModal.tsx  # 게시글 삭제(강력 경고) 모달
    │       └── BoardUpsertModal.tsx  # 게시글 등록/수정 모달
    ├── store/
    │   └── index.ts             # Board 전용 Zustand Store
    ├── types/
    │   └── index.ts             # Board 관련 TypeScript 타입 정의
    └── page.tsx                 # Board 메인 페이지 (카테고리 slug 기반)
```

### Front 구조 개요
- `app/(content-header)/board`
  - Board 도메인의 Front 진입점
  - README.md를 통해 패키지 구조 및 동작 설명
- `[slug]/page.tsx`
  - 게시판 카테고리 단위 페이지
  - URL 예: `/board/notice`, `/board/faq`
- `components/`
  - 게시글 목록 / 상세 / 검색 UI 컴포넌트
  - modal 하위에 등록/수정/삭제 모달 구성
- `store/`
  - Zustand 기반 상태 관리
  - 게시글, 선택 상태, 권한, 로딩 상태 관리
- `types/`
  - BoardPost, BoardCategory 등 공통 타입 정의