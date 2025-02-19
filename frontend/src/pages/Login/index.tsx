import React, { memo } from 'react'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Button } from 'primereact/button'
import { useAuth } from '@/router/AuthProvider'
import { useNavigate } from 'react-router'

const LoginPage: React.FC = memo(() => {
  const navigate = useNavigate()
  const { login } = useAuth()

  // TODO: Testing purposes
  const loginAsAdmin = ($event: React.MouseEvent<HTMLButtonElement>) => {
    $event.preventDefault()
    login(['admin:fullAccess'])
    navigate('/dashboard', { replace: true })
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-center text-2xl font-semibold mb-4">
          Iniciar Sesión
        </h2>
        <form className="space-y-4">
          {/* Campo de Usuario */}
          <div className="field">
            <label htmlFor="username" className="block text-sm font-medium">
              Usuario
            </label>
            <InputText
              id="username"
              type="text"
              placeholder="Ingrese su usuario"
              className="p-inputtext-sm w-full mt-1"
            />
          </div>
          {/* Campo de Contraseña */}
          <div className="field">
            <label htmlFor="password" className="block text-sm font-medium">
              Contraseña
            </label>
            <Password
              id="password"
              toggleMask
              feedback={false}
              placeholder="Ingrese su contraseña"
              className="w-full mt-1"
              inputClassName="w-full"
            />
          </div>
          {/* Botón de Iniciar Sesión */}
          <div className="flex justify-center">
            <Button
              onClick={loginAsAdmin}
              label="Iniciar Sesión"
              icon="pi pi-sign-in"
              className="w-full"
            />
          </div>
        </form>
        {/* Botones adicionales */}
        <div className="flex flex-col items-center mt-4 space-y-2">
          <Button link label="Registrarse" className="p-button-text" />
          <Button
            link
            label="¿Olvidó su contraseña?"
            className="p-button-text"
          />
        </div>
      </div>
    </div>
  )
})

LoginPage.displayName = 'LoginPage'

export default LoginPage
