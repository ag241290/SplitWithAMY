import React, { useEffect, useMemo, useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Card, CardBody, CardHeader } from '../modules/ui/Card'
import { Input } from '../modules/ui/Input'
import { Button } from '../modules/ui/Button'
import { Modal } from '../modules/ui/Modal'

function formatAuditTimestamp(value: string | number | Date): string {
  const d = new Date(value)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const mon = months[d.getMonth()]
  const hrs = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}-${mon} ${hrs}:${mins}`
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export const TrackerPage: React.FC<{ client: SupabaseClient; trackerIdInitial?: string }> = ({ client, trackerIdInitial }) => {
  const [trackerId, setTrackerId] = useState(trackerIdInitial ?? '')
  const [trackerName, setTrackerName] = useState<string>('')
  const [log, setLog] = useState('')
  const [participants, setParticipants] = useState<any[]>([])

  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')

  const [splitBy, setSplitBy] = useState<'blank' | 'equal' | 'custom'>('blank')
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [balances, setBalances] = useState<any[] | null>(null)
  const [showBalanceModal, setShowBalanceModal] = useState(false)

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentBy, setPaymentBy] = useState('')
  const [paymentTo, setPaymentTo] = useState('')
  const [paymentsLog, setPaymentsLog] = useState<{ amount: number; byId: string; toId: string; created_at: string }[]>([])

  // Audit modal state
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditExpenses, setAuditExpenses] = useState<{ description: string | null; amount: number; paid_by: string; created_at: string }[]>([])

  const totalCustomSplit = useMemo(() => Object.values(customSplits).reduce((sum, v) => sum + (Number(v) || 0), 0), [customSplits])
  const equalShare = useMemo(() => {
    const amt = Number(amount)
    return participants.length > 0 && amt ? (amt / participants.length) : 0
  }, [amount, participants])

  useEffect(() => {
    async function resolveTracker() {
      if (!trackerId) return
      if (isUuid(trackerId)) {
        const { data } = await client.from('trackers').select('name').eq('id', trackerId).limit(1).maybeSingle()
        if (data && (data as any).name) setTrackerName((data as any).name)
        return
      }
      const { data } = await client.from('trackers').select('id,name').eq('name', trackerId).limit(1).maybeSingle()
      if (data && (data as any).id) {
        setTrackerId((data as any).id)
        setTrackerName((data as any).name)
      }
    }
    resolveTracker()
  }, [client, trackerId])

  useEffect(() => {
    async function loadParticipants() {
      if (!trackerId || !isUuid(trackerId)) return
      const { data, error } = await client.from('participants').select('id,name').eq('tracker_id', trackerId)
      if (error) { setLog('Load participants error: ' + error.message); return }
      setParticipants(data as any[])
      if (data && data.length > 0) {
        setPaidBy((data[0] as any).id)
        const init: Record<string, string> = {}
        for (const p of data as any[]) init[p.id] = ''
        setCustomSplits(init)
        // Prefill payment modal selects
        setPaymentBy((data[0] as any).id)
        setPaymentTo(data.length > 1 ? (data[1] as any).id : '')
      }
    }
    loadParticipants()
  }, [client, trackerId])

  function setCustomSplitAmount(participantId: string, value: string) {
    setCustomSplits((prev) => ({ ...prev, [participantId]: value }))
  }

  function validateCommonRequired(): string[] {
    const missing: string[] = []
    if (!trackerId) missing.push('Tracker')
    if (!desc.trim()) missing.push('Description')
    if (!amount.trim()) missing.push('Amount')
    if (!paidBy) missing.push('Paid By')
    if (participants.length === 0) missing.push('Participants')
    if (splitBy === 'blank') missing.push('Split By')
    return missing
  }

  async function addExpenseEqualSplit() {
    const missing = validateCommonRequired()
    if (missing.length > 0) return setLog('Missing required: ' + missing.join(', '))

    const payer = participants.find((p) => p.id === paidBy) ?? participants[0]

    const { data: expense, error: expErr } = await client
      .from('expenses')
      .insert({ tracker_id: trackerId, description: desc, amount: Number(amount), paid_by: payer.id })
      .select()
      .single()
    if (expErr) return setLog('Insert expense error: ' + expErr.message)

    const share = Number(amount) / participants.length
    const splits = participants.map((p) => ({ expense_id: (expense as any).id, participant_id: p.id, share_amount: share }))
    const { error: splitErr } = await client.from('expense_splits').insert(splits)
    if (splitErr) return setLog('Insert splits error: ' + splitErr.message)

    setLog('Expense and splits added: ' + (expense as any).id)
  }

  async function addExpenseCustomSplit() {
    const missing = validateCommonRequired()
    if (missing.length > 0) return setLog('Missing required: ' + missing.join(', '))

    const emptyFor = participants.filter((p) => !String(customSplits[p.id] ?? '').trim()).map((p) => p.name)
    if (emptyFor.length > 0) return setLog('Missing custom split amount for: ' + emptyFor.join(', '))

    const total = totalCustomSplit
    const amt = Number(amount)
    if (total > amt + 0.0001) return setLog(`Custom split total (${total.toFixed(2)}) cannot exceed amount (${amt.toFixed(2)})`)
    if (Math.abs(total - amt) > 0.001) return setLog(`Custom split total (${total.toFixed(2)}) must equal amount (${amt.toFixed(2)})`)

    const payer = participants.find((p) => p.id === paidBy) ?? participants[0]

    const { data: expense, error: expErr } = await client
      .from('expenses')
      .insert({ tracker_id: trackerId, description: desc, amount: amt, paid_by: payer.id })
      .select()
      .single()
    if (expErr) return setLog('Insert expense error: ' + expErr.message)

    const splits = participants.map((p) => ({ expense_id: (expense as any).id, participant_id: p.id, share_amount: Number(customSplits[p.id]) }))
    const { error: splitErr } = await client.from('expense_splits').insert(splits)
    if (splitErr) return setLog('Insert splits error: ' + splitErr.message)

    setLog('Expense and custom splits added: ' + (expense as any).id)
  }

  async function showBalances() {
    const { data, error } = await client.from('tracker_balances').select('*').eq('tracker_id', trackerId)
    if (error) return setLog('Balances error: ' + error.message)
    setBalances(data as any[])
    setShowBalanceModal(true)
  }

  async function handleSubmit() {
    if (splitBy === 'equal') return addExpenseEqualSplit()
    if (splitBy === 'custom') return addExpenseCustomSplit()
    setLog('Missing required: Split By')
  }

  function handleOpenPayment() {
    setShowPaymentModal(true)
  }

  function handleSubmitPayment() {
    const missing: string[] = []
    if (!paymentAmount.trim()) missing.push('Amount')
    if (!paymentBy) missing.push('Paid By')
    if (!paymentTo) missing.push('Paid To')
    if (paymentBy && paymentTo && paymentBy === paymentTo) missing.push('Paid To must differ from Paid By')
    if (missing.length > 0) {
      setLog('Payment: Missing required: ' + missing.join(', '))
      return
    }
    const amtNum = Number(paymentAmount)
    setPaymentsLog((prev) => [...prev, { amount: amtNum, byId: paymentBy, toId: paymentTo, created_at: new Date().toISOString() }])

    // Update in-memory balances if loaded
    setBalances((prev) => {
      if (!prev) return prev
      const updated = prev.map((b) => ({ ...b }))
      const payer = updated.find((b) => b.participant_id === paymentBy)
      const payee = updated.find((b) => b.participant_id === paymentTo)
      if (payer) {
        const tp = Number(payer.total_paid || 0) + amtNum
        const to = Number(payer.total_owed || 0)
        payer.total_paid = tp
        payer.net_balance = tp - to
      }
      if (payee) {
        const tp = Number(payee.total_paid || 0)
        const to = Math.max(0, Number(payee.total_owed || 0) - amtNum)
        payee.total_owed = to
        payee.net_balance = tp - to
      }
      return updated as any
    })

    setLog(`Payment submitted: amount=${paymentAmount}, by=${participants.find(p=>p.id===paymentBy)?.name||paymentBy}, to=${participants.find(p=>p.id===paymentTo)?.name||paymentTo}`)
    setShowPaymentModal(false)
  }

  async function openAudit() {
    // Load expenses for audit
    if (!trackerId || !isUuid(trackerId)) return setShowAuditModal(true)
    const { data, error } = await client
      .from('expenses')
      .select('description,amount,paid_by,created_at')
      .eq('tracker_id', trackerId)
      .order('created_at', { ascending: false })
    if (error) setLog('Audit load error: ' + error.message)
    else setAuditExpenses((data ?? []) as any)
    setShowAuditModal(true)
  }

  const totalExpense = useMemo(() => {
    if (!balances) return 0
    return balances.reduce((sum, b: any) => sum + Number(b.total_owed || 0), 0)
  }, [balances])

  const settlements = useMemo(() => {
    if (!balances) return [] as { from: string; to: string; amount: number }[]
    const creditors: { id: string; name: string; amount: number }[] = []
    const debtors: { id: string; name: string; amount: number }[] = []
    for (const b of balances as any[]) {
      const name = participants.find((p) => p.id === b.participant_id)?.name ?? b.participant_id
      const basePaid = Number(b.total_paid || 0)
      const deltaPaid = paymentsLog.reduce((sum, p) => {
        if (p.byId === b.participant_id) return sum + Number(p.amount || 0)
        if (p.toId === b.participant_id) return sum - Number(p.amount || 0)
        return sum
      }, 0)
      const finalPaid = basePaid + deltaPaid
      const owed = Number(b.total_owed || 0)
      const net = finalPaid - owed
      if (net > 0.0001) creditors.push({ id: b.participant_id, name, amount: net })
      else if (net < -0.0001) debtors.push({ id: b.participant_id, name, amount: -net })
    }
    const result: { from: string; to: string; amount: number }[] = []
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amount, creditors[j].amount)
      result.push({ from: debtors[i].name, to: creditors[j].name, amount: pay })
      debtors[i].amount -= pay
      creditors[j].amount -= pay
      if (debtors[i].amount <= 0.0001) i++
      if (creditors[j].amount <= 0.0001) j++
    }
    return result
  }, [balances, participants, paymentsLog])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Tracker: {trackerName || trackerId}</h2>
              <button className="inline-flex items-center gap-1 rounded-full bg-yellow-500 text-white px-2 py-1 text-xs shadow hover:bg-yellow-600" onClick={openAudit}>
                <span>★</span>
                <span>Audit</span>
              </button>
            </div>
            <Button onClick={showBalances}>Show Balance</Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Expense Entry</h3>
              <button className="text-sm text-brand hover:underline" onClick={handleOpenPayment}>Add Payment</button>
            </div>

            <hr className="border-gray-200" />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Paid by *</label>
                <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                  <option value="" disabled>Select payer</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Description *" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <Input label="Amount *" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Split By *</label>
                <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={splitBy} onChange={(e) => setSplitBy(e.target.value as any)}>
                  <option value="blank">Blank</option>
                  <option value="equal">Add expense (equal split)</option>
                  <option value="custom">Add expense (custom split)</option>
                </select>
              </div>
            </div>

            {splitBy === 'equal' && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Equal split</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                      <span>{p.name}</span>
                      <span>{equalShare.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-600">Each participant pays: {equalShare.toFixed(2)}</div>
              </div>
            )}

            {splitBy === 'custom' && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Custom split *</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-40 text-sm text-gray-700">{p.name}</span>
                      <Input label="Amount *" value={customSplits[p.id] ?? ''} onChange={(e) => setCustomSplitAmount(p.id, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-600">Total custom split: {totalCustomSplit.toFixed(2)}</div>
              </div>
            )}

            <div className="flex justify-start">
              <Button variant="secondary" onClick={handleSubmit}>Submit</Button>
            </div>

            <pre className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">{log}</pre>
          </div>
        </CardBody>
      </Card>

      <Modal open={showBalanceModal} title="Balance Summary" onClose={() => setShowBalanceModal(false)}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Total Expense</span>
            <span>{totalExpense.toFixed(2)}</span>
          </div>  
          <div className="mt-2">
            <h4 className="font-semibold">Individual expenses</h4>
            <div className="space-y-1">
              {balances?.map((b) => (
                <div key={b.participant_id} className="flex justify-between">
                  <span>{participants.find((p) => p.id === b.participant_id)?.name ?? b.participant_id}</span>
                  <span>{Number(b.total_owed || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
                  </div>
                  <div className="mt-2">
                      <h4 className="font-semibold">Paid by</h4>
                      <div className="space-y-1">
                          {balances?.map((b) => {
                            const name = participants.find((p) => p.id === b.participant_id)?.name ?? b.participant_id
                            const basePaid = Number(b.total_paid || 0)
                            const delta = paymentsLog.reduce((sum, p) => {
                              if (p.byId === b.participant_id) return sum + Number(p.amount || 0)
                              if (p.toId === b.participant_id) return sum - Number(p.amount || 0)
                              return sum
                            }, 0)
                            const finalNum = basePaid + delta
                            const sign = finalNum >= 0 ? '+' : '-'
                            const color = finalNum >= 0 ? 'text-green-600' : 'text-red-600'
                            const abs = Math.abs(finalNum).toFixed(2)
                            return (
                              <div key={b.participant_id} className="flex justify-between">
                                <span>{name}</span>
                                <span className={color}>{sign}{abs}</span>
                              </div>
                            )
                          })}
                      </div>
                  </div>
          <div className="mt-2">
            <h4 className="font-semibold">Receivables</h4>
            <div className="space-y-1">
              {balances?.map((b) => {
                const name = participants.find((p) => p.id === b.participant_id)?.name ?? b.participant_id
                const basePaid = Number(b.total_paid || 0)
                const deltaPaid = paymentsLog.reduce((sum, p) => {
                  if (p.byId === b.participant_id) return sum + Number(p.amount || 0)
                  if (p.toId === b.participant_id) return sum - Number(p.amount || 0)
                  return sum
                }, 0)
                const finalPaid = basePaid + deltaPaid
                const owed = Number(b.total_owed || 0)
                const net = finalPaid - owed
                const sign = net >= 0 ? '+' : '-'
                const abs = Math.abs(net).toFixed(2)
                const color = net >= 0 ? 'text-green-600' : 'text-red-600'
                return (
                  <div key={b.participant_id} className="flex justify-between">
                    <span>{name}</span>
                    <span className={color}>{sign}{abs}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-2">
            <h4 className="font-semibold">Who pays whom</h4>
            <div className="space-y-1">
              {settlements.length === 0 ? (
                <div className="text-gray-600">No settlements needed.</div>
              ) : (
                settlements.map((s, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{s.from} - to - {s.to}</span>
                    <span>{s.amount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={showPaymentModal} title="Payment Entry" onClose={() => setShowPaymentModal(false)}>
        <div className="space-y-3 text-sm">
          <Input label="Amount *" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-gray-700">Paid By *</label>
            <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={paymentBy} onChange={(e) => setPaymentBy(e.target.value)}>
              <option value="" disabled>Select payer</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Paid To *</label>
            <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={paymentTo} onChange={(e) => setPaymentTo(e.target.value)}>
              <option value="" disabled>Select payee</option>
              {participants.filter((p) => p.id !== paymentBy).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitPayment}>Submit</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showAuditModal} title="Audit" onClose={() => setShowAuditModal(false)}>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold">Expense entries</h4>
            <div className="space-y-1">
              {auditExpenses.length === 0 ? (
                <div className="text-gray-600">No expenses yet.</div>
              ) : (
                auditExpenses.map((e, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <span className="text-left">{formatAuditTimestamp(e.created_at)}</span>
                    <span className="text-left">{participants.find((p) => p.id === e.paid_by)?.name ?? e.paid_by}</span>
                    <span className="text-left">{e.description ?? ''}</span>
                    <span className="text-right">{Number(e.amount).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h4 className="font-semibold">Payment entries</h4>
            <div className="space-y-1">
              {paymentsLog.length === 0 ? (
                <div className="text-gray-600">No payments logged.</div>
              ) : (
                paymentsLog.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <span className="text-left">{formatAuditTimestamp(p.created_at)}</span>
                    <span className="text-left">From: {participants.find((pp) => pp.id === p.byId)?.name ?? p.byId}</span>
                    <span className="text-left">To: {participants.find((pp) => pp.id === p.toId)?.name ?? p.toId}</span>
                    <span className="text-right">{Number(p.amount).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}