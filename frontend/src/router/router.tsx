import { createBrowserRouter, Navigate } from 'react-router'

import Layout from '../components/Layout/Layout'
import Notfound from '../pages/Notfound'
import LoginPage from '@/pages/Login'
import ProtectedRoute from '@/router/ProtectedRoute'
import Dashboard from '@/pages/Dashboard'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={'/dashboard'} replace={true} />,
  },
  {
    path: '/dashboard',
    element: (
      <Layout>
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '*',
    element: (
      <Layout>
        <Notfound />
      </Layout>
    ),
  },
])

export default router
