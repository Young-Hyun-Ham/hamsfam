
# Board 패키지 구조 Endpoint (사용자 / Firebase용)
```bash
app/api/board/firebase/
├── board/
│   ├── route.ts                  # 게시글 목록 조회 / 등록 (GET, POST)
│   ├── [id]/
│   │   └── route.ts              # 게시글 단건 조회 / 수정 / 삭제 (GET, PATCH, DELETE)
│   ├── replies/
│   │   ├── route.ts              # 댓글 목록 조회 / 등록 (GET, POST)
│   │   └── _utils.ts             # 댓글 관련 공통 유틸
├── category/
│   ├── route.ts                  # 카테고리 목록 조회
│   └── [slug]/
│       └── route.ts              # 특정 카테고리(slug) 메타/권한 조회
└── faq/
    └── route.ts                  # FAQ 게시판 전용 엔드포인트
```

### Board API 개요
- `/api/board/firebase/board`
  - 게시글 목록 조회 (검색, 페이징)
  - 게시글 등록

- `/api/board/firebase/board/[id]`
  - 게시글 단건 조회
  - 게시글 수정
  - 게시글 삭제

- `/api/board/firebase/board/replies`
  - 댓글 목록 조회
  - 댓글 등록 / 삭제

- `/api/board/firebase/board/category`
  - 게시판 카테고리 목록 조회

- `/api/board/firebase/board/category/[slug]`
  - 카테고리 권한/메타 정보 조회
  - (읽기/쓰기/댓글 권한 판단용)

- `/api/board/firebase/board/faq`
  - FAQ 전용 게시글 조회 엔드포인트