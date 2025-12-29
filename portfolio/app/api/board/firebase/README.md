
# Board 패키지 구조 Endpoint (Firebase용)
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