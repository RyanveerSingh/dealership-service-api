import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, api, formatSlot } from '../api/client'
import type { Appointment, AppointmentStatus, Bay, Vehicle } from '../api/types'
import { useAuth } from '../auth/AuthContext'

const TABS: AppointmentStatus[] = [
  'SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
]

/** Statuses reachable in one step, mirroring AppointmentStatus on the server. */
const NEXT: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

function pill(s: AppointmentStatus) {
  if (s === 'COMPLETED') return 'pill pill-ok'
  if (s === 'CANCELLED') return 'pill pill-danger'
  if (s === 'IN_PROGRESS') return 'pill pill-warn'
  return 'pill'
}

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function BookingsPage() {
  const { hasRole } = useAuth()
  const canBook = hasRole('SERVICE_ADVISOR', 'ADMIN')
  const [params] = useSearchParams()

  const [bays, setBays] = useState<Bay[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [rows, setRows] = useState<Appointment[]>([])
  const [tab, setTab] = useState<AppointmentStatus>('SCHEDULED')

  const [vehicleId, setVehicleId] = useState('')
  const [bayId, setBayId] = useState('')
  const [date, setDate] = useState(tomorrow())
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [notes, setNotes] = useState('')
  /** When set, the form reschedules that appointment instead of creating one. */
  const [editing, setEditing] = useState<Appointment | null>(null)

  const [error, setError] = useState<ApiError | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (status: AppointmentStatus) => {
    try {
      setRows(await api.appointments(status))
    } catch {
      setRows([])
    }
  }, [])

  useEffect(() => {
    api.bays().then((b) => {
      setBays(b)
      const first = b.find((x) => x.active)
      if (first) setBayId(String(first.id))
    }).catch(() => undefined)

    api.vehicles().then((v) => {
      setVehicles(v)
      const preset = params.get('vehicleId')
      if (preset && v.some((x) => String(x.id) === preset)) setVehicleId(preset)
      else if (v.length) setVehicleId(String(v[0].id))
    }).catch(() => undefined)
  }, [params])

  useEffect(() => { void load(tab) }, [tab, load])

  function fail(e: unknown) {
    setError(e instanceof ApiError ? e : new ApiError(0, undefined, 'Could not reach the service'))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(null); setBusy(true)
    const input = {
      vehicleId: Number(vehicleId),
      bayId: Number(bayId),
      // LocalDateTime: wall-clock at the dealership. Built by hand because
      // Date#toISOString would convert to UTC and shift the booking.
      scheduledStart: `${date}T${start}:00`,
      scheduledEnd: `${date}T${end}:00`,
      notes: notes || undefined,
    }
    try {
      if (editing) {
        await api.reschedule(editing.id, input)
        setOk(`Appointment #${editing.id} moved`)
        setEditing(null)
      } else {
        const a = await api.book(input)
        setOk(`Booked ${a.bayName} — ${formatSlot(a.scheduledStart)}`)
      }
      setNotes('')
      void load(tab)
    } catch (err) { fail(err) } finally { setBusy(false) }
  }

  async function move(id: number, target: AppointmentStatus) {
    setError(null); setOk(null)
    try {
      await api.setAppointmentStatus(id, target)
      setOk(`Appointment #${id} → ${target.replace('_', ' ').toLowerCase()}`)
      void load(tab)
    } catch (err) { fail(err) }
  }

  async function cancel(id: number) {
    setError(null); setOk(null)
    try {
      await api.cancelAppointment(id)
      setOk(`Appointment #${id} cancelled`)
      void load(tab)
    } catch (err) { fail(err) }
  }

  function editRow(a: Appointment) {
    setEditing(a)
    setVehicleId(String(a.vehicleId))
    setBayId(String(a.bayId))
    setDate(a.scheduledStart.slice(0, 10))
    setStart(a.scheduledStart.slice(11, 16))
    setEnd(a.scheduledEnd.slice(11, 16))
    setNotes(a.notes ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="display text-[2rem]">Bookings</h1>
        <p className="mt-2 text-[0.9rem] text-chalk-dim">
          A bay holds one job at a time. Overlapping windows are refused by the server.
        </p>
      </header>

      {error && (
        <div className={`notice ${error.isConflict ? 'notice-conflict' : 'notice-error'}`}>
          <strong>{error.isConflict ? 'Slot unavailable' : error.body?.error ?? 'Request failed'}</strong>
          {error.message}
          {error.fieldErrors.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {error.fieldErrors.map((f) => (
                <li key={f.field}><b>{f.field}</b>: {f.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {ok && <div className="notice notice-ok">{ok}</div>}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="panel h-fit">
          <div className="panel-head">
            <h2 className="font-display text-[1.05rem]">
              {editing ? `Reschedule #${editing.id}` : 'Book a bay'}
            </h2>
            {editing && (
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                Cancel edit
              </button>
            )}
          </div>

          {!canBook ? (
            <p className="text-[0.86rem] text-chalk-dim">
              Booking requires the Service Advisor or Admin role. Your account is a
              Technician, so the form is hidden — the server would refuse the request
              with 403 regardless of what this screen offered.
            </p>
          ) : (
            <form onSubmit={submit}>
              <label className="field">
                <span>Vehicle</span>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.modelYear}) — {v.customerName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Bay</span>
                <select value={bayId} onChange={(e) => setBayId(e.target.value)} required>
                  {bays.map((b) => (
                    <option key={b.id} value={b.id} disabled={!b.active}>
                      {b.name}{b.active ? '' : ' — out of service'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <div className="flex gap-3">
                <label className="field flex-1">
                  <span>Start</span>
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
                </label>
                <label className="field flex-1">
                  <span>End</span>
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
                </label>
              </div>
              <label className="field">
                <span>Notes</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Oil change, brake inspection…" />
              </label>
              <button className="btn w-full justify-center" disabled={busy || !vehicleId || !bayId}>
                {busy ? 'Working…' : editing ? 'Move appointment' : 'Book bay'}
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="font-display text-[1.05rem]">Appointments</h2>
            <span className="label">{rows.length} in view</span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${tab === s ? '' : 'btn-ghost'}`}
                onClick={() => setTab(s)}
              >
                {s.replace('_', ' ').toLowerCase()}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-[0.86rem] text-chalk-faint">
              Nothing {tab.replace('_', ' ').toLowerCase()}.
            </p>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th><th>Bay</th><th>When</th><th>Vehicle</th>
                    <th>Advisor</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="text-chalk">{a.id}</td>
                      <td>{a.bayName}</td>
                      <td className="whitespace-nowrap">
                        {formatSlot(a.scheduledStart)}
                        <span className="text-chalk-faint"> → {a.scheduledEnd.slice(11, 16)}</span>
                      </td>
                      <td className="font-mono text-[0.76rem]">{a.vehicleVin.slice(-8)}</td>
                      <td>{a.advisorName}</td>
                      <td><span className={pill(a.status)}>{a.status.replace('_', ' ')}</span></td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {NEXT[a.status].filter((t) => t !== 'CANCELLED').map((t) => (
                            <button key={t} className="btn btn-ghost btn-sm" onClick={() => move(a.id, t)}>
                              {t === 'CHECKED_IN' ? 'Check in' : t === 'IN_PROGRESS' ? 'Start' : 'Complete'}
                            </button>
                          ))}
                          {canBook && !['COMPLETED', 'CANCELLED'].includes(a.status) && (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => editRow(a)}>
                                Reschedule
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => cancel(a.id)}>
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
