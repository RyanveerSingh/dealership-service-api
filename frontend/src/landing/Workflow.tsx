import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { BrakeDisc, Cog, OilFilter, Tyre, Wrench } from './parts'

const STEPS = [
  { n: '01', Icon: Tyre, title: 'Vehicle arrives', body: 'Customer and vehicle already on file, identified by VIN.' },
  { n: '02', Icon: Cog, title: 'Bay booked', body: 'An advisor reserves a window. The bay row is locked while the overlap check runs.' },
  { n: '03', Icon: Wrench, title: 'Order opened', body: 'One repair order per appointment, enforced by a unique constraint.' },
  { n: '04', Icon: OilFilter, title: 'Parts drawn', body: 'Stock falls as lines are added, priced from inventory rather than the request.' },
  { n: '05', Icon: BrakeDisc, title: 'Job closed', body: 'Totals freeze. A closed order is an accounting record, not a draft.' },
]

export default function Workflow() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // Vertical scroll drives horizontal travel. The parent's height sets the
  // pace: taller means the panels move more slowly per pixel scrolled.
  const x = useTransform(scrollYProgress, [0, 1], ['2%', '-64%'])
  const barWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  if (reduced) {
    return (
      <section className="bg-[#0b0f16] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Through the lane</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <span className="font-mono text-xs text-amber-300">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="relative h-[320vh] bg-[#0b0f16]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-6xl px-6">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-amber-300 uppercase">
            The service lane
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From kerbside to invoice
          </h2>
          <div className="mt-6 h-px w-full max-w-xs bg-white/10">
            <motion.div style={{ width: barWidth }} className="h-px bg-amber-400" />
          </div>
        </div>

        <motion.div style={{ x }} className="flex gap-5 pl-6">
          {STEPS.map(({ n, Icon, title, body }) => (
            <article
              key={n}
              className="w-[300px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-7 sm:w-[360px]"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="font-mono text-xs tracking-widest text-amber-300">{n}</span>
                <div className="h-12 w-12 text-amber-300/70">
                  <Icon className="h-full w-full" weight={1.2} />
                </div>
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
