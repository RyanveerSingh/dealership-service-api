import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'

const FIGURES: [number, string, string, string][] = [
  [8, '08', 'Domain entities', 'Users, customers, vehicles, bays, parts, appointments, orders, lines'],
  [43, '43', 'Tests, all passing', 'Unit, service, and a full-context boot against real MySQL'],
  [2, '02', 'Locking strategies', 'Chosen by conflict probability, not by habit'],
  [0, '00', 'Ways to double-book', 'No overlap can be written, by any path'],
]

/** Counts to the target once, when scrolled into view. */
function Counter({ to, display, delay }: { to: number; display: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduced = useReducedMotion()
  const [n, setN] = useState(reduced ? to : 0)

  useEffect(() => {
    if (!inView || reduced || to === 0) {
      if (inView) setN(to)
      return
    }
    let raf = 0
    let start = 0
    const DURATION = 900
    const tick = (t: number) => {
      if (!start) start = t + delay
      const p = Math.min(1, Math.max(0, (t - start) / DURATION))
      // Expo-out, matching the page's easing curve rather than counting linearly.
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setN(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduced, to, delay])

  // Keep the leading zero of the label so the column stays typographically even.
  const text = to === 0 ? display : String(n).padStart(display.length, '0')

  return (
    <div
      ref={ref}
      className="font-display text-[clamp(3.4rem,7vw,5.2rem)] leading-none tracking-[-0.05em] tabular-nums"
      style={{ color: 'var(--color-champagne)' }}
    >
      {text}
    </div>
  )
}

export default function Numbers() {
  return (
    <section
      className="relative border-y py-24 md:py-32"
      style={{ borderColor: 'var(--hairline)' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(232,211,166,0.05), transparent 70%)',
        }}
      />
      <div className="shell gutter relative">
        <div className="grid gap-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {FIGURES.map(([value, display, label, note], i) => (
            <div key={label} className="reveal" data-delay={String(i * 90)}>
              <Counter to={value} display={display} delay={i * 90} />
              <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--hairline-strong)' }}>
                <div className="font-display text-[0.98rem] text-chalk">{label}</div>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-chalk-faint">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
