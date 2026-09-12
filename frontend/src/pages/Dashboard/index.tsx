import React, { memo } from 'react'
import { Button } from 'primereact/button'

import { useAuth } from '@/router/useAuth'

const Dashboard: React.FC = memo(() => {
  const { permissions, logout } = useAuth()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="text-base">
        Sesión iniciada con permisos: <code>{permissions.join(', ') || 'ninguno'}</code>
      </p>
      <div>
        <Button label="Cerrar sesión" icon="pi pi-sign-out" onClick={logout} />
      </div>
    </div>
  )
})
Dashboard.displayName = 'Dashboard'

export default Dashboard
