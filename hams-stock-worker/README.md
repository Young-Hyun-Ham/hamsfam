# Python Worker MVP  
YouTube 업로드 감지 → Firestore `signals`에 `queued` 생성

이 단계는 **유튜브 채널의 새 영상 업로드를 감지**하고,  
분석 파이프라인의 시작점인 `signals(status="queued")` 문서를  
Firestore에 생성하는 **백엔드 워커(MVP)** 를 구현한다.

---

## ✅ 목표

- `watch_targets(enabled=true)` 를 주기적으로 조회
- 채널별 **최신 업로드 영상 1개** 확인 (YouTube RSS 사용)
- 새 영상이면 `signals` 컬렉션에 `status="queued"` 문서 생성
- 중복 방지를 위해 `watch_targets.lastVideoId` 갱신
- 프론트는 Firestore `onSnapshot` 으로 자동 반영

---

## 🗂 Firestore 컬렉션 구조 (MVP)

### `watch_targets/{id}`
```json
{
  "uid": "demo",
  "channelUrl": "https://www.youtube.com/@xxxx",
  "channelId": "UCxxxxxxxx",
  "enabled": true,
  "lastVideoId": "abcd1234",
  "createdAt": "...",
  "updatedAt": "..."
}
```
### `watch_targets/{id}`
```json
{
  "uid": "demo",
  "channelId": "UCxxxxxxxx",
  "channelUrl": "https://www.youtube.com/@xxxx",
  "videoId": "nmXfQW-vgKE",
  "videoUrl": "https://www.youtube.com/watch?v=nmXfQW-vgKE",
  "title": "영상 제목",
  "publishedAt": "2026-02-06T03:12:34+00:00",
  "status": "queued",
  "createdAt": "..."
}
```

---

## 🔐 Service Account Key 발급
  - Firebase Service Account Key(JSON)
  - Firebase Console
    → 프로젝트 설정
    → 서비스 계정
    → 새 비공개 키 생성
  - 예시: 
    ```json
    {
      "type": "service_account",
      "project_id": "hams-stock",
      "private_key_id": "...",
      "private_key": "-----BEGIN PRIVATE KEY-----...",
      "client_email": "...@iam.gserviceaccount.com",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
    ```

---

## ⚙️ 실행 방법 (Windows / PowerShell 기준)
  - 프로젝트 이동 
  - 가상환경 생성 (권장)
  ```bash
    python -m venv .venv
    .venv\Scripts\Activate.ps1
  ```
  - 의존성 설치
  ```bash
    pip install firebase-admin httpx
  ```
  - 환경변수 설정
  ```bash
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\workspace\hamsfam\hams-stock\serviceAccountKey.json"
    $env:POLL_SECONDS="60"
    $env:DEFAULT_UID="demo"
  ```
  확인:
  ```bash
    echo $env:GOOGLE_APPLICATION_CREDENTIALS
  ```
  - 워커 실행
  ```bash
    python worker.py run
  ```

---

## 정상 실행 로그
  - 시작 시
  ```bash
    [WORKER] started
  ```
  - 새 영상 감지 시
  ```bash
    [QUEUED] uid=demo channelId=UCxxxx videoId=abcd1234
  ```

--- 

## 테스트용 (yt-dlp로 메타만 뽑기 (다운로드 없이))
```bash
yt-dlp -J "[youtube주소]" | ConvertFrom-Json | Select-Object id,title,channel,channel_id,uploader,uploader_id
```
  - id → videoId
  - channel_id → ✅ channelId
  - title → 영상 제목

## 테스트용 실행
  - queued 테스트
  ```bash
    python worker.py test-queued `
    --uid demo `
    --channelId UCI6C5V4J8FWRcLcOdh1yElw `
    --videoId bPxNmdsGlFQ
  ```
  - stt 테스트
  ```bash
    python worker.py test-stt `
    --uid demo `
    --channelId UCI6C5V4J8FWRcLcOdh1yElw `
    --videoId bPxNmdsGlFQ
  ```
  - ai 테스트
  ```bash
    python worker.py test-ai --uid demo
  ```
  - queued 와 stt 와 ai 테스트
  ```bash
    python worker.py test-all `
    --uid demo `
    --channelId UCI6C5V4J8FWRcLcOdh1yElw `
    --videoId bPxNmdsGlFQ
  ```


