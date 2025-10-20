import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hamsfam.appweb',
  appName: 'appweb',
  webDir: 'dist',
  server: {
    // 여기에 당신의 Vercel URL
    url: 'https://spa-opal-pi.vercel.app',
    cleartext: false,
    allowNavigation: [ // webview 안에서 허용 할 도메인 목록 (최소한의 도메인만, 와이드카드(*) 허용 안함)
      'spa-opal-pi.vercel.app',
      // OAuth 쓰면 필요한 리다이렉트/동의 화면 도메인 추가
      'https://accounts.google.com',
      'https://auth.googleusercontent.com',
      "https://www.googleapis.com",
    ],
  },
};

export default config;
