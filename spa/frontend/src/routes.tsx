// src/routers.tsx

import { createBrowserRouter } from 'react-router-dom'
import RequireAuth from './login/RequireAuth'
import App from './App'

import Login from './login/Login'
import Todos from './todos/Todos'
import Chat from './pages/Chat'
import Home from './pages/Home'
import Settings from './pages/Settings'

const routes = createBrowserRouter([
  { path: '/login', element: <Login /> },  // 공개
  {
    path: '/',
    element: <App />,
    children: [
      {
        element: <RequireAuth />,              // 보호 구간
        children: [
          { index: true, element: <Home /> },
          { path: 'todos', element: <Todos /> },
          { path: 'settings', element: <Settings /> },
          { path: 'chat', element: <Chat /> },
        ],
      },
    ],
  }
]);

export default routes;