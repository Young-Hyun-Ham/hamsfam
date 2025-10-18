import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import Todos from './pages/Todos'
import Settings from './pages/Settings'

import { StatusBar, Style } from '@capacitor/status-bar';

(async () => {
  // 상태바를 WebView 위에 ‘겹치지 않게’ (= WebView를 아래로 밀기)
  await StatusBar.setOverlaysWebView({ overlay: false });

  // 다크 배경이면 아이콘 밝게
  await StatusBar.setStyle({ style: Style.Dark });
})();

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,              // 공통 레이아웃
    children: [
      { index: true, element: <Home /> },
      { path: 'todos', element: <Todos /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
