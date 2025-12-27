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
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <img src="/images/SplitWithAMY_Logo.png" alt="SplitWithAMY" className="h-20 w-20 rounded" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {adminLoggedIn && (
            <Button variant="ghost" onClick={onAdminLogout}>Logout Admin</Button>
          )}
          {trackerLoggedIn && (
            <Button variant="ghost" onClick={onTrackerLogout}>Logout Tracker</Button>
          )}
        </div>
      </div>
    </header>
  )
}
