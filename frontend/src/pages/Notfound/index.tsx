import React, { memo } from 'react'

const Notfound: React.FC = memo(() => (
  <div className="min-h-screen">
    <h1 className="text-6xl leading-none">404: Page Not Found</h1>
  </div>
))
Notfound.displayName = 'Notfound'

export default Notfound
