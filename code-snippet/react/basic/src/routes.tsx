// src/routers.tsx

import { createBrowserRouter } from 'react-router-dom'
import RequireAuth from './login/RequireAuth'
import App from './App'

import Home from './Home';
import Login from './login/Login'

const routes = createBrowserRouter([
  { path: '/login', element: <Login /> },     // 공개
  {
    path: '/',
    element: <Home />,
    children: [
      {
        element: <RequireAuth />,              // 보호 구간
        children: [
          { index: true, element: <App /> },
          // { path: '/deshboard', element: <DeshBoard /> },
        ],
      },
    ],
  }
]);

export default routes;