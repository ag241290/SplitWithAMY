import React, { useMemo, useState, useEffect } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Navbar } from './Navbar'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { AdminPage } from '../pages/AdminPage'
import { Home } from '../pages/Home'
import { TrackerPage } from '../pages/Tracker'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function makeClient(headers?: Record<string, string>): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createClient('http://localhost', 'anon', { global: { headers } })
  }
  return createClient(supabaseUrl, supabaseAnonKey, { global: { headers } })
}

export const App: React.FC = () => {
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [trackerToken, setTrackerToken] = useState<string | null>(null)
  const [envOk, setEnvOk] = useState<boolean>(!!(supabaseUrl && supabaseAnonKey))
  const [trackers, setTrackers] = useState<any[]>([])
  const [openAdminLogin, setOpenAdminLogin] = useState(false)
  const [openTrackerLogin, setOpenTrackerLogin] = useState<{ open: boolean; tracker?: { id: string; name: string } }>({ open: false })

  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    console.log('App mounted. Env ok?', envOk, { supabaseUrl, hasKey: !!supabaseAnonKey })
  }, [envOk])

  const adminClient = useMemo(() => (adminToken ? makeClient({ 'x-admin-token': adminToken }) : makeClient()), [adminToken])
  const trackerClient = useMemo(() => (trackerToken ? makeClient({ 'x-tracker-token': trackerToken }) : makeClient()), [trackerToken])
  const publicClient = useMemo(() => makeClient(), [])

  async function loadAdminTrackers() {
    const { data, error } = await adminClient.from('trackers').select('id,name,description')
    if (error) return console.warn('Load trackers error:', error.message)
    setTrackers(data as any[])
  }

  async function loadPublicTrackers() {
    const { data, error } = await publicClient.from('trackers').select('id,name,description')
    if (error) return console.warn('Load public trackers error:', error.message)
    setTrackers(data as any[])
  }

  useEffect(() => {
    loadPublicTrackers()
  }, [])

  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">
      {!isHome && (
        <Navbar
          adminLoggedIn={!!adminToken}
          trackerLoggedIn={!!trackerToken}
          onAdminLogout={() => { setAdminToken(null); navigate('/') }}
          onTrackerLogout={() => { setTrackerToken(null); navigate('/') }}
        />
      )}

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6 flex-1">
        {!envOk && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong className="font-semibold">Environment variables missing.</strong>
            <div>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>ui/.env</code> and restart the dev server.</div>
          </div>
        )}

        <Routes>
          <Route path="/" element={
            <Home
              trackers={trackers}
              onClickAdmin={() => setOpenAdminLogin(true)}
              onSelectTracker={(t) => setOpenTrackerLogin({ open: true, tracker: t })}
            />
          } />

          <Route path="/admin" element={
            <AdminPage client={adminClient} onTrackerCreated={(t) => setTrackers((prev) => [t, ...prev])} />
          } />

          <Route path="/tracker/:slug" element={<TrackerRoute client={trackerClient} onToken={(t) => setTrackerToken(t)} />} />
        </Routes>
      </main>

      <footer className="mt-auto bg-green-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>App Developed by - <space> </space>
                      <a className="underline" href="https://wa.me/7276319578" target="_blank" rel="noopener noreferrer">Amit Gandhi</a></span>
        </div>
      </footer>

      <AdminLoginModal
        open={openAdminLogin}
        onClose={() => setOpenAdminLogin(false)}
        onLoggedIn={async (token) => { setAdminToken(token); setOpenAdminLogin(false); await loadAdminTrackers(); navigate('/admin') }}
        baseClient={adminClient}
      />

      <TrackerLoginModal
        open={openTrackerLogin.open}
        tracker={openTrackerLogin.tracker}
        onClose={() => setOpenTrackerLogin({ open: false })}
        onLoggedIn={async (_token) => {
          setOpenTrackerLogin({ open: false })
          navigate(`/tracker/${encodeURIComponent(openTrackerLogin.tracker!.name)}`)
        }}
        baseClient={trackerClient}
      />
    </div>
  )
}

const AdminLoginModal: React.FC<{ open: boolean; onClose: () => void; onLoggedIn: (token: string) => void; baseClient: SupabaseClient }> = ({ open, onClose, onLoggedIn, baseClient }) => {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('CHANGE_ME')
  const [msg, setMsg] = useState('')

  async function handleLogin() {
    setMsg('Logging in admin...')
    const { data, error } = await baseClient.rpc('admin_login', { p_username: username, p_password: password })
    if (error) return setMsg('Admin login error: ' + error.message)
    onLoggedIn(data as string)
  }

  return (
    <Modal open={open} title="Admin Login" onClose={onClose}>
      <div className="space-y-3">
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLogin}>Login</Button>
        </div>
        {msg && <p className="text-xs text-gray-600">{msg}</p>}
      </div>
    </Modal>
  )
}

const TrackerLoginModal: React.FC<{ open: boolean; tracker?: { id: string; name: string }; onClose: () => void; onLoggedIn: (token: string) => void; baseClient: SupabaseClient }> = ({ open, tracker, onClose, onLoggedIn, baseClient }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function handleLogin() {
    if (!tracker) return
    setMsg('Logging in tracker...')
    const { data, error } = await baseClient.rpc('tracker_login', { p_tracker_id: tracker.id, p_username: username, p_password: password })
    if (error) return setMsg('Tracker login error: ' + error.message)
    onLoggedIn(data as string)
  }

  return (
    <Modal open={open} title={`Login to ${tracker?.name ?? ''}`} onClose={onClose}>
      <div className="space-y-3">
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLogin}>Login</Button>
        </div>
        {msg && <p className="text-xs text-gray-600">{msg}</p>}
      </div>
    </Modal>
  )
}

const TrackerRoute: React.FC<{ client: SupabaseClient; onToken: (t: string) => void }> = ({ client, onToken }) => {
  const { slug } = useParams()
  const prefill = typeof slug === 'string' ? slug : ''
  return <TrackerPage client={client} trackerIdInitial={prefill} />
}
