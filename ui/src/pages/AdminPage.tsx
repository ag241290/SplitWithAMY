import React, { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Card, CardBody, CardHeader } from '../modules/ui/Card'
import { Input } from '../modules/ui/Input'
import { Button } from '../modules/ui/Button'

export const AdminPage: React.FC<{ client: SupabaseClient; onTrackerCreated: (t: any) => void }> = ({ client, onTrackerCreated }) => {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [credUser, setCredUser] = useState('')
  const [credPass, setCredPass] = useState('')
  const [participantCount, setParticipantCount] = useState(1)
  const [participantNames, setParticipantNames] = useState<string[]>(['', ''])
  const [log, setLog] = useState('')

  function handleCountChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const n = Math.max(1, Math.min(10, Number(e.target.value) || 1))
    setParticipantCount(n)
    setParticipantNames((prev) => {
      const next = prev.slice(0, n)
      while (next.length < n) next.push('')
      return next
    })
  }

  function handleParticipantNameChange(idx: number, value: string) {
    setParticipantNames((prev) => prev.map((v, i) => (i === idx ? value : v)))
  }

  async function createTracker() {
    // Required field checks
    const missing: string[] = []
    if (!name.trim()) missing.push('Tracker name')
    if (!credUser.trim()) missing.push('Tracker login username')
    if (!credPass.trim()) missing.push('Tracker login password')
    if (!participantCount || participantCount < 1) missing.push('Number of participants')

    const trimmedNames = participantNames.slice(0, participantCount).map((n) => n.trim())
    const emptyNameIndexes = trimmedNames.map((n, i) => ({ n, i })).filter((x) => !x.n)
    if (emptyNameIndexes.length > 0) missing.push('Participant name(s)')

    if (missing.length > 0) {
      setLog('Missing required: ' + missing.join(', '))
      return
    }

    setLog('Creating tracker...')
    const { data, error } = await client.rpc('create_tracker', { p_name: name, p_description: desc })
    if (error) return setLog('Create tracker error: ' + error.message)
    const tracker = data as any
    onTrackerCreated(tracker)
    setLog('Tracker created: ' + tracker.id + '\nAdding credentials...')

    const { error: credErr } = await client.rpc('add_tracker_credentials', {
      p_tracker: tracker.id,
      p_username: credUser,
      p_password: credPass,
    })
    if (credErr) return setLog('Add credentials error: ' + credErr.message)

    const namesPayload = trimmedNames.map((n) => ({ name: n }))

    if (namesPayload.length > 0) {
      setLog((l) => l + '\nAdding participants...')
      const { error: partErr } = await client.rpc('add_participants', { p_tracker: tracker.id, p_participants: namesPayload })
      if (partErr) return setLog('Add participants error: ' + partErr.message)
      setLog((l) => l + `\nParticipants added (${namesPayload.length}).`)
    }

    setLog((l) => l + '\nDone.')
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Create Tracker</h2>
        <p className="text-xs text-gray-500">Create a new expense tracker project, set login credentials, and participants.</p>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Tracker name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Tracker description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Tracker login username *" value={credUser} onChange={(e) => setCredUser(e.target.value)} />
            <Input label="Tracker login password *" type="password" value={credPass} onChange={(e) => setCredPass(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Number of participants *</label>
            <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={participantCount} onChange={handleCountChange}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {participantNames.slice(0, participantCount).map((val, idx) => (
              <Input key={idx} label={`Participant ${idx + 1} name *`} value={val} onChange={(e) => handleParticipantNameChange(idx, e.target.value)} />
            ))}
          </div>

          <Button onClick={createTracker}>Create tracker</Button>
          <pre className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">{log}</pre>
        </div>
      </CardBody>
    </Card>
  )
}
