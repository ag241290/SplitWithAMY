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
    <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-gradient-to-r from-indigo-500/85 via-purple-500/85 to-pink-500/85 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow">
      {/* Decorative subtle radial overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
      <div className="relative mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
          <img src="/logo.png" alt="Split-with-AMY" className="h-6 w-12 sm:h-6 sm:w-12 rounded-md object-contain shadow-sm" />
          <span className="text-base sm:text-lg font-extrabold tracking-tight drop-shadow-sm">
            Split-with-AMY
          </span>
        </button>
        <div className="flex items-center gap-2">
          {adminLoggedIn && (
            <Button variant="ghost" onClick={onAdminLogout} className="text-white/90 hover:text-white">Logout</Button>
          )}
          {trackerLoggedIn && (
            <Button variant="ghost" onClick={onTrackerLogout} className="text-white/90 hover:text-white">Logout</Button>
          )}
        </div>
      </div>
    </header>
  )
}
