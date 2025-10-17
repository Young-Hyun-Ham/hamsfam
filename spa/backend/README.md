# mac homebrew
  - python을 사용 하기 위해 가상환경을 설정 한다.

# 가상환경 띄우기
## 1. 프로젝트 루트에서 가상환경 생성
python3 -m venv .venv
## 2. 가상환경 활성화 (Mac)
source .venv/bin/activate
## 3. 패키지 설치
pip install -r requirements.txt
## 참고
가상환경 나가기 명령어 - deactivate

# 의존성 설치
```bash
pip install fastapi uvicorn "python-jose[cryptography]" google-auth google-auth-transport-requests psycopg2-binary google-auth-oauthlib google-auth-httplib2
```

# Google Cloud Console로 이동
https://console.cloud.google.com/apis/credentials

# 허용된 자바스크립트 원본(Authorized JavaScript origins) 수정
현재 Vite 개발서버 주소를 추가 ex) http://localhost:5173 - 끝에 슬래시 / 는 붙이지 말아야 합니다.

# 재시작
uvicorn main:app --reload --port 8000