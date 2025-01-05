import React from 'react'
import { RouterProvider } from 'react-router'

import ErrorBoundary from './components/ErrorBoundary'
import router from './router'

import 'primereact/resources/themes/lara-light-indigo/theme.css' // Tema de PrimeReact
import 'primereact/resources/primereact.min.css' // Estilos principales de PrimeReact
import 'primeicons/primeicons.css' // Íconos de PrimeIcons

const App: React.FC = () => (
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>
)
App.displayName = 'App'
export default App
