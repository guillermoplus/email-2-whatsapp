import React from 'react'
import { RouterProvider } from 'react-router'

import ErrorBoundary from './components/ErrorBoundary'
import router from './router/router'

import 'primeicons/primeicons.css'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/tailwind-light/theme.css'
import { AuthProvider } from '@/router/AuthProvider'

const App: React.FC = () => (
  <ErrorBoundary>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </ErrorBoundary>
)
App.displayName = 'App'
export default App
