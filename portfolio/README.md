# Nextjs + React + TypeScript + Zustand + VITE + Pnpm + firebase + Figma

## 1. pnpm 설치
설치확인: 
```bash
pnpm -v
```
설치가 되어 있지 않다면 아래 명령어 실행
```bash
npm install -g pnpm
```

## 2. 프로젝트 생성 
```bash
pnpm create next-app [프로젝트명]
```

## 1. 의존성설치 (package.json) 및 기본 css 적용
```json
{
  "name": "basic",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@hello-pangea/dnd": "^18.0.1",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "next": "16.0.0",
    "firebase": "^12.2.1",
    "axios": "^1.11.0",
    "jose": "^6.0.13",
    "jwt-decode": "^4.0.0",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.0.0"
  }
}
```
```bash 
pnpm install
```

<details>
<summary>공통 css(index.css)</summary>
<pre>
???
</pre>
</details>

🧠 참고사항
<pre>
Next.js 프로젝트에 pnpm이 좋을까?
Next.js + React 환경에서는 빌드, 의존성, 워크스페이스가 많기 때문에 pnpm이 특히 유리함.
</pre>

✅ 이점 정리:
<pre>
빌드 속도 향상 — npm보다 2~3배 빠름
저장공간 절약 — 패키지 캐시를 재활용
워크스페이스 관리 쉬움 — frontend, backend 등 여러 패키지 한 번에 관리
CI/CD 속도 향상 — GitHub Actions 등에서 설치 시간 단축
의존성 충돌 방지 — 각 모듈이 자기 버전을 명확히 가짐
</pre>


# Category 패키지 구조(표준 준수)
<details>
<summary>app/(sidebar-header)/admin/category/</summary>
<pre>
app/(sidebar-header)/admin/category/
├── components/
│   ├── BoardCategoryListPanel.tsx
│   ├── BoardCategoryDetailPanel.tsx
│   └── modal/
│       ├── BoardCategoryUpsertModal.tsx
│       └── BoardCategoryDeleteModal.tsx
├── store/
│   └── index.ts
├── types/
│   └── index.ts
└── page.tsx
</pre>
</details>

# Board 패키지 구조 (표준 준수)
<details>
<summary>📦 Front</summary>
<pre>
app/(content-header)/board/[slug]/
├── components/
│   ├── BoardListPanel.tsx
│   ├── BoardDetailPanel.tsx
│   ├── BoardSearchBar.tsx
│   └── modal/
│       ├── BoardUpsertModal.tsx
│       └── BoardDeleteModal.tsx
├── store/
│   └── index.ts
├── types/
│   └── index.ts
└── page.tsx
</pre>
</details>
