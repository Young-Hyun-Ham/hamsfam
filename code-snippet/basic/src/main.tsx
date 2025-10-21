import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { AuthProvider } from './login/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

import routes from './routes';

async function setupStatusBar() {
  // 웹(PWA/브라우저)에서는 실행하지 않음
  if (!Capacitor.isNativePlatform()) return

  // 플러그인 가용성도 체크 (안전)
  if (!Capacitor.isPluginAvailable('StatusBar')) return

  // 네이티브에서만 동적 import (번들 최적화 + 웹 예외 방지)
  const { StatusBar, Style } = await import('@capacitor/status-bar')

  try {
    // 상태바를 WebView 위에 겹치지 않게 → WebView를 아래로 내림
    await StatusBar.setOverlaysWebView({ overlay: false })

    // 다크 배경이면 아이콘 밝게
    await StatusBar.setStyle({ style: Style.Dark })
  } catch (e) {
    // 네이티브 장치별 미구현/권한 이슈 대비
    console.warn('[StatusBar]', e)
  }
}

// 앱 시작 시 1회 실행
setupStatusBar();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID!}>
      <AuthProvider>
        <RouterProvider router={routes} />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)
