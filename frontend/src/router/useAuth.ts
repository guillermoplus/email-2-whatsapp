import { createContext, useContext } from 'react'

export interface AuthContextProps {
  isAuthenticated: boolean
  permissions: string[] // Lista de permisos del usuario
  login: (permissions: string[]) => void // Permite iniciar sesión con permisos
  logout: () => void
}

// Vive fuera de AuthProvider.tsx para que ese archivo exporte solo el
// componente: es lo que necesita el fast refresh de React.
export const AuthContext = createContext<AuthContextProps | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
