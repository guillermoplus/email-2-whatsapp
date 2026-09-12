import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import ProtectedRoute from './ProtectedRoute'

const Secreto = () => <p>contenido protegido</p>
// Imita a pages/Login: tras autenticar navega explicitamente a la ruta destino
const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <p>pantalla de login</p>
      <button
        onClick={() => {
          login(['admin:fullAccess'])
          navigate('/privado', { replace: true })
        }}
      >
        entrar
      </button>
    </>
  )
}

const renderApp = (requiredPermissions?: string[]) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route
            path="/privado"
            element={
              <ProtectedRoute requiredPermissions={requiredPermissions}>
                <Secreto />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>raiz</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )

describe('ProtectedRoute', () => {
  it('manda al login cuando no hay sesion', () => {
    renderApp()
    expect(screen.getByText('pantalla de login')).toBeInTheDocument()
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument()
  })

  it('deja pasar tras iniciar sesion', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'entrar' }))
    expect(screen.getByText('contenido protegido')).toBeInTheDocument()
  })

  it('bloquea cuando faltan permisos requeridos', async () => {
    renderApp(['admin:superAccess'])
    await userEvent.click(screen.getByRole('button', { name: 'entrar' }))
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument()
    expect(screen.getByText('raiz')).toBeInTheDocument()
  })
})
