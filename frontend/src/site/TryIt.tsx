import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface Step {
  label: string
  window: string
  expect: number
  status?: number
  ms?: number
  message?: string
}

const BASE_STEPS: Step[] = [
  { label: 'Book Bay 1', window: '09:00 – 10:00', expect: 201 },
  { label: 'Book Bay 1 again, overlapping', window: '09:30 – 10:30', expect: 409 },
  { label: 'Book Bay 1 back-to-back', window: '10:00 – 11:00', expect: 201 },
]

/** A date far enough out that it never collides with seeded or previous runs. */
function slotDate() {
  const y = 2032 + Math.floor(Math.random() * 40)
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
  const d = String(1 + Math.floor(Math.random() * 27)).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function TryIt() {
  const [steps, setSteps] = useState<Step[]>(BASE_STEPS)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [fault, setFault] = useState<string | null>(null)
  const token = useRef<string | null>(null)

  const run = useCallback(async () => {
    setRunning(true)
    setDone(false)
    setFault(null)
    setSteps(BASE_STEPS.map((s) => ({ ...s })))

    try {
      if (!token.current) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Public demo credentials, seeded by migration. Read-only in effect:
          // the worst a visitor can do is create appointments in 2032.
          body: JSON.stringify({ email: 'advisor@dms.local', password: 'password123' }),
        })
        if (!res.ok) throw new Error('Could not reach the service')
        token.current = (await res.json()).accessToken
      }

      const date = slotDate()
      const windows = [
        ['09:00:00', '10:00:00'],
        ['09:30:00', '10:30:00'],
        ['10:00:00', '11:00:00'],
      ]

      for (let i = 0; i < windows.length; i++) {
        const t0 = performance.now()
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token.current}`,
          },
          body: JSON.stringify({
            vehicleId: 1,
            bayId: 1,
            scheduledStart: `${date}T${windows[i][0]}`,
            scheduledEnd: `${date}T${windows[i][1]}`,
          }),
        })
        const ms = Math.round(performance.now() - t0)
        let message: string | undefined
        if (!res.ok) {
          try {
            message = (await res.json()).message
          } catch {
            /* non-JSON error body; the status alone is enough */
          }
        }
        setSteps((prev) =>
          prev.map((s, j) => (j === i ? { ...s, status: res.status, ms, message } : s)),
        )
        // A beat between calls so the sequence is readable rather than instant.
        await new Promise((r) => setTimeout(r, 260))
      }
      setDone(true)
    } catch {
      setFault('The service is not reachable from here right now.')
    } finally {
      setRunning(false)
    }
  }, [])

  return (
    <section id="try" className="scroll-mt-24 py-32 md:py-44">
      <div className="shell gutter">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-4">
            <p className="reveal label">Live</p>
            <h2 className="reveal display mt-6 text-[clamp(1.9rem,4vw,3.1rem)]" data-delay="60">
              Watch it refuse.
            </h2>
            <p className="reveal lede mt-6" data-delay="120">
              This runs against the real service — not a recording. Three bookings
              for the same bay: the first is accepted, the overlapping one is
              refused, and the one starting exactly when the first ends is
              accepted again.
            </p>

            <button
              onClick={run}
              disabled={running}
              className="reveal mt-9 inline-flex items-center gap-3 px-7 py-3.5 text-[0.82rem] tracking-wide transition-opacity disabled:opacity-45"
              style={{ background: 'var(--color-champagne)', color: 'var(--color-ink)' }}
              data-delay="180"
            >
              {running ? 'Running…' : done ? 'Run it again' : 'Run the sequence'}
              {!running && <span aria-hidden="true">→</span>}
            </button>
          </div>

          {/* ── console ─────────────────────────────────────────────────── */}
          <div className="md:col-span-8">
            <div
              className="reveal overflow-hidden border"
              style={{ borderColor: 'var(--hairline-strong)', background: 'var(--color-ink-800)' }}
              data-delay="100"
            >
              <div
                className="flex items-center justify-between border-b px-5 py-3"
                style={{ borderColor: 'var(--hairline)' }}
              >
                <span className="label">POST /api/appointments</span>
                <span className="label" aria-live="polite">
                  {fault ? 'offline' : running ? 'running' : done ? 'complete' : 'idle'}
                </span>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
                {steps.map((s, i) => {
                  const settled = s.status !== undefined
                  const ok = s.status === s.expect
                  const accepted = s.status === 201
                  return (
                    <div
                      key={s.label}
                      className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-b-0"
                      style={{ borderColor: 'var(--hairline)' }}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[0.78rem] text-chalk">{s.label}</div>
                        <div className="mt-1 font-mono text-[0.72rem] text-chalk-faint">
                          {s.window}
                          {s.message && <span className="text-chalk-dim"> · {s.message}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {s.ms !== undefined && (
                          <span className="font-mono text-[0.7rem] tabular-nums text-chalk-faint">
                            {s.ms}ms
                          </span>
                        )}
                        <AnimatePresence mode="wait">
                          {settled ? (
                            <motion.span
                              key="status"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                              className="font-mono text-[0.82rem] tabular-nums"
                              style={{
                                color: accepted ? 'var(--color-accept)' : 'var(--color-reject)',
                              }}
                            >
                              {accepted ? '✓' : '✕'} {s.status}
                            </motion.span>
                          ) : running && i === steps.findIndex((x) => x.status === undefined) ? (
                            <motion.span
                              key="wait"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1.1, repeat: Infinity }}
                              className="font-mono text-[0.82rem] text-chalk-faint"
                            >
                              ···
                            </motion.span>
                          ) : (
                            <span key="idle" className="font-mono text-[0.82rem] text-chalk-faint">
                              {s.expect}
                            </span>
                          )}
                        </AnimatePresence>
                        {settled && !ok && (
                          <span className="label" style={{ color: 'var(--color-copper)' }}>
                            unexpected
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div
                className="border-t px-5 py-3"
                style={{ borderColor: 'var(--hairline)' }}
              >
                <p className="font-mono text-[0.7rem] leading-relaxed text-chalk-faint">
                  {fault
                    ? fault
                    : done
                      ? 'The bay row is locked before the overlap is tested, so two simultaneous bookings serialise rather than both succeeding.'
                      : 'Expected: 201 · 409 · 201'}
                </p>
              </div>
            </div>

            <p className="reveal mt-4 text-[0.78rem] text-chalk-faint" data-delay="160">
              Prefer the raw contract?{' '}
              <a
                href="/swagger-ui.html"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-champagne"
              >
                OpenAPI reference
              </a>{' '}
              — opens in a new tab.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
