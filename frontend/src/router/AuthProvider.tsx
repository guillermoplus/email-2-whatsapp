import React, { useState } from 'react'

import { AuthContext } from './useAuth'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])

  const login = (userPermissions: string[]) => {
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
