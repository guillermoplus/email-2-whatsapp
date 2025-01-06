import React, { createContext, useContext, useState } from 'react'

interface AuthContextProps {
  isAuthenticated: boolean
  permissions: string[] // Lista de permisos del usuario
  login: (permissions: string[]) => void // Permite iniciar sesión con permisos
  logout: () => void
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])

  const login = (userPermissions: string[]) => {
    console.log('login', userPermissions)
    setIsAuthenticated(true)
    setPermissions(userPermissions)
  }

  const logout = () => {
    setIsAuthenticated(false)
    setPermissions([])
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, permissions, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
