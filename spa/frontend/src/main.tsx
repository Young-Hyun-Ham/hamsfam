import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import Todos from './pages/Todos'
import Settings from './pages/Settings'

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
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
