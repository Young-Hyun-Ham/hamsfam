// capacitor.config
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.kr.hamsfam.app',
  appName: 'hamsfam-app',
  webDir: 'build',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com']   // 구글 로그인만 사용
    }
  }
};

export default config;
