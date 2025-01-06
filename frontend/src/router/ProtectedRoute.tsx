import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/router/AuthProvider'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[] // Permisos necesarios para acceder a la ruta
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
}) => {
  const { isAuthenticated, permissions } = useAuth()

  // Redirige al login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirige si el usuario no tiene los permisos necesarios
  if (
    requiredPermissions &&
    !requiredPermissions.every((perm) => permissions.includes(perm))
  ) {
    return <Navigate to="/" replace /> // Redirige a una página sin acceso
  }

  // Renderiza el contenido si pasa todas las verificaciones
  return <>{children}</>
}

export default ProtectedRoute
