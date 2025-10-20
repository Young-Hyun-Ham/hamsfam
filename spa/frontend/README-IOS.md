## 1. IOS 프로젝트 만들기
```bash
# 원하는 폴더에서
mkdir ios-webapp-shell && cd ios-webapp-shell

# npm 초기화
npm init -y

# Capacitor 의존성
npm i @capacitor/core
npm i -D @capacitor/cli

# Capacitor 초기화 (앱 이름/번들ID는 원하는 걸로)
npx cap init "Hams WebApp" "com.hamsfam.webapp" --web-dir=dist

# web-dir이 비어있으면 Capacitor가 싫어하니 최소 파일 하나 만들어 둡니다
mkdir dist
cat > dist/index.html <<'EOF'
<!doctype html><html><head><meta charset="utf-8"><title>Loading…</title></head>
<body><p>Launching remote web app…</p></body></html>
EOF
```

## 2. Vercel 주소 연결 (진짜 핵심)
```ts
capacitor.config.timport { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hamsfam.webapp',        // 위에서 넣은 번들ID와 동일
  appName: 'Hams WebApp',
  webDir: 'dist',
  server: {
    // 여기에 당신의 Vercel URL
    url: 'https://xxx.vercel.app',
    cleartext: false,
    allowNavigation: [ // webview 안에서 허용 할 도메인 목록 (최소한의 도메인만, 와이드카드(*) 허용 안함)
      'xxx.vercel.app',
      // OAuth 쓰면 필요한 리다이렉트/동의 화면 도메인 추가
      'https://accounts.google.com',
      'https://auth.googleusercontent.com',
    ],
  },
};

export default config;
```

## 3. iOS 플랫폼 추가 & Xcode 열기
```bash
# iOS 플랫폼 설치
npm i @capacitor/ios

# 플랫폼 추가
npx cap add ios

# (변경이 있을 때마다) 동기화
npx cap sync ios

# Xcode 열기
npx cap open ios
```