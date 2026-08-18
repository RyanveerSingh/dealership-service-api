import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, formatSlot } from '../api/client'
import type { Appointment, AppointmentStatus, Bay, Vehicle } from '../api/types'
import { useAuth } from '../auth/AuthContext'

/** Tomorrow, so the @Future validation on the request always passes. */
function defaultDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const STATUS_TABS: AppointmentStatus[] = ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

function statusClass(s: AppointmentStatus) {
  if (s === 'COMPLETED') return 'badge ok'
  if (s === 'CANCELLED') return 'badge danger'
  if (s === 'IN_PROGRESS') return 'badge warn'
  return 'badge'
}

export default function BookingsPage() {
  const { hasRole } = useAuth()
  const canBook = hasRole('SERVICE_ADVISOR', 'ADMIN')

  const [bays, setBays] = useState<Bay[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [tab, setTab] = useState<AppointmentStatus>('SCHEDULED')

  const [vehicleId, setVehicleId] = useState('')
  const [bayId, setBayId] = useState('')
  const [date, setDate] = useState(defaultDate())
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<ApiError | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadAppointments = useCallback(async (status: AppointmentStatus) => {
    try {
      setAppointments(await api.appointments(status))
    } catch {
      setAppointments([])
    }
  }, [])

  useEffect(() => {
    api.bays().then((b) => {
      setBays(b)
      const firstActive = b.find((x) => x.active)
      if (firstActive) setBayId(String(firstActive.id))
    }).catch(() => undefined)

    api.vehicles().then((v) => {
      setVehicles(v)
      if (v.length) setVehicleId(String(v[0].id))
    }).catch(() => undefined)
  }, [])

  useEffect(() => { void loadAppointments(tab) }, [tab, loadAppointments])

  async function book(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(null); setBusy(true)
    try {
      const created = await api.book({
        vehicleId: Number(vehicleId),
        bayId: Number(bayId),
        // The API takes a LocalDateTime: wall-clock at the dealership, with no
        // timezone. Building the string by hand keeps it that way; Date#toISOString
        // would convert to UTC and shift the appointment by the browser's offset.
        scheduledStart: `${date}T${start}:00`,
        scheduledEnd: `${date}T${end}:00`,
        notes: notes || undefined,
      })
      setSuccess(`Booked ${created.bayName} — ${formatSlot(created.scheduledStart)} to ${formatSlot(created.scheduledEnd).split(', ')[1]}`)
      setNotes('')
      if (tab === 'SCHEDULED') void loadAppointments('SCHEDULED')
    } catch (err) {
      if (err instanceof ApiError) setError(err)
      else setError(new ApiError(0, undefined, 'Could not reach the server'))
    } finally {
      setBusy(false)
    }
  }

  async function advance(id: number, target: AppointmentStatus) {
    setError(null); setSuccess(null)
    try {
      await api.setAppointmentStatus(id, target)
      void loadAppointments(tab)
    } catch (err) {
      if (err instanceof ApiError) setError(err)
    }
  }

  return (
    <>
      <header>
        <h1>Bookings</h1>
        <p>A bay can hold one job at a time. Overlapping requests are rejected by the server.</p>
      </header>

      <div className="grid two">
        <section className="card">
          <h2>Book a bay</h2>
          {!canBook ? (
            <p className="muted">
              Booking requires the Service Advisor or Admin role. Your account is a
              Technician, so the form is hidden — the server would reject the request
              with 403 regardless of what the interface showed.
            </p>
          ) : (
            <>
              <p className="hint">Try booking a slot that overlaps an existing one to see the conflict guard.</p>

              {error && (
                <div className={`alert ${error.isConflict ? 'conflict' : 'error'}`}>
                  <strong>{error.isConflict ? 'Slot unavailable' : error.body?.error ?? 'Request failed'}</strong>
                  {error.message}
                  {error.fieldErrors.length > 0 && (
                    <ul>
                      {error.fieldErrors.map((f) => (
                        <li key={f.field}><b>{f.field}</b>: {f.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {success && <div className="alert success">{success}</div>}

              <form onSubmit={book}>
                <label>
                  <span>Vehicle</span>
                  <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} ({v.modelYear}) — {v.customerName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Bay</span>
                  <select value={bayId} onChange={(e) => setBayId(e.target.value)} required>
                    {bays.map((b) => (
                      <option key={b.id} value={b.id} disabled={!b.active}>
                        {b.name}{b.active ? '' : ' (out of service)'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Date</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </label>
                <div className="row">
                  <label>
                    <span>Start</span>
                    <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
                  </label>
                  <label>
                    <span>End</span>
                    <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
                  </label>
                </div>
                <label>
                  <span>Notes</span>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Oil change, brake inspection..." />
                </label>
                <button type="submit" disabled={busy || !vehicleId || !bayId}>
                  {busy ? 'Booking...' : 'Book bay'}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="card">
          <h2>Appointments</h2>
          <div className="chips" style={{ marginBottom: '.75rem' }}>
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                className={`small ${tab === s ? '' : 'secondary'}`}
                onClick={() => setTab(s)}
              >
                {s.replace('_', ' ').toLowerCase()}
              </button>
            ))}
          </div>

          {appointments.length === 0 ? (
            <div className="empty">Nothing {tab.replace('_', ' ').toLowerCase()}.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Bay</th><th>When</th><th>Vehicle</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.id}</td>
                      <td>{a.bayName}</td>
                      <td>
                        {formatSlot(a.scheduledStart)}
                        <span className="muted"> → {a.scheduledEnd.slice(11, 16)}</span>
                      </td>
                      <td className="mono">{a.vehicleVin.slice(-8)}</td>
                      <td><span className={statusClass(a.status)}>{a.status.replace('_', ' ')}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {a.status === 'SCHEDULED' && (
                          <button className="small secondary" onClick={() => advance(a.id, 'CHECKED_IN')}>Check in</button>
                        )}
                        {a.status === 'CHECKED_IN' && (
                          <button className="small secondary" onClick={() => advance(a.id, 'IN_PROGRESS')}>Start</button>
                        )}
                        {a.status === 'IN_PROGRESS' && (
                          <button className="small secondary" onClick={() => advance(a.id, 'COMPLETED')}>Complete</button>
                        )}
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
