import React from 'react'
import { Button } from './ui/Button'
import { useNavigate } from 'react-router-dom'

export const Navbar: React.FC<{
  adminLoggedIn: boolean
  trackerLoggedIn: boolean
  onAdminLogout: () => void
  onTrackerLogout: () => void
}> = ({ adminLoggedIn, trackerLoggedIn, onAdminLogout, onTrackerLogout }) => {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <img src="/logo.png" alt="Split-with-AMY" className="h-5 w-12 sm:h-5 sm:w-12 rounded" />
            <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Split-with-AMY</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {adminLoggedIn && (
            <Button variant="ghost" onClick={onAdminLogout}>Logout</Button>
          )}
          {trackerLoggedIn && (
            <Button variant="ghost" onClick={onTrackerLogout}>Logout</Button>
          )}
        </div>
      </div>
    </header>
  )
}
