import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/** Rises into place the first time it is scrolled to, then stays put. */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Card({
  kicker, title, body, children, delay,
}: {
  kicker: string; title: string; body: string; children: ReactNode; delay: number
}) {
  return (
    <Reveal delay={delay}>
      <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-amber-300/25">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
          {kicker}
        </span>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
        <div className="mt-6 flex-1">{children}</div>
      </div>
    </Reveal>
  )
}

/** Two simultaneous requests for one bay; only one can win. */
function ConflictDemo() {
  return (
    <div className="space-y-2 font-mono text-[11px]">
      <div className="flex items-center justify-between rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2">
        <span className="text-zinc-300">Bay 1 · 09:00–10:00</span>
        <span className="font-semibold text-emerald-400">201</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-red-400/25 bg-red-400/[0.07] px-3 py-2">
        <span className="text-zinc-300">Bay 1 · 09:30–10:30</span>
        <span className="font-semibold text-red-400">409</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2">
        <span className="text-zinc-300">Bay 1 · 10:00–11:00</span>
        <span className="font-semibold text-emerald-400">201</span>
      </div>
      <p className="pt-1 text-[10px] leading-relaxed text-zinc-500">
        Back-to-back is not a clash. The window is half-open.
      </p>
    </div>
  )
}

/** Stock falls on success and is untouched on failure. */
function StockDemo() {
  return (
    <div className="space-y-2 font-mono text-[11px]">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="text-zinc-400">BRK-PAD-FRT</span>
        <span className="text-zinc-300">stock 4</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2">
        <span className="text-zinc-300">take 2</span>
        <span className="font-semibold text-emerald-400">4 → 2</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-red-400/25 bg-red-400/[0.07] px-3 py-2">
        <span className="text-zinc-300">take 99</span>
        <span className="font-semibold text-red-400">409</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="text-zinc-400">after failure</span>
        <span className="text-zinc-300">stock 2</span>
      </div>
      <p className="pt-1 text-[10px] leading-relaxed text-zinc-500">
        Unchanged. The decrement and the invoice line share one transaction.
      </p>
    </div>
  )
}

/** The repair-order state machine, with the illegal edge called out. */
function StateDemo() {
  const steps = ['OPEN', 'IN_PROGRESS', 'CLOSED']
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="rounded-md border border-amber-300/25 bg-amber-300/[0.08] px-2 py-1 font-mono text-[10px] text-amber-200">
              {s}
            </span>
            {i < steps.length - 1 && <span className="text-zinc-600">→</span>}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-red-400/25 bg-red-400/[0.07] px-3 py-2 font-mono text-[11px]">
        <span className="text-zinc-300">OPEN → CLOSED</span>
        <span className="ml-2 font-semibold text-red-400">409</span>
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-500">
        A job cannot be closed before it starts. The API publishes the legal next
        states, so the interface never offers an illegal one.
      </p>
    </div>
  )
}

export default function Features() {
  return (
    <section className="relative bg-[#0a0d12] py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-amber-300 uppercase">
            Guarantees, not conventions
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Three things this system will not let you do
          </h2>
          <p className="mt-4 max-w-xl text-zinc-400">
            Each one is enforced in the database and the service layer, not by
            hoping the interface asks nicely.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Card
            delay={0}
            kicker="Pessimistic lock"
            title="Double-book a bay"
            body="Booking locks the bay row, then checks for overlaps, then inserts — all in one transaction. Two advisors clicking at once serialise."
          >
            <ConflictDemo />
          </Card>
          <Card
            delay={0.08}
            kicker="Transaction + @Version"
            title="Sell a part you don't have"
            body="Stock is drawn down in the same transaction as the invoice line. Short stock rolls both back, so inventory is never reduced for a line that was never written."
          >
            <StockDemo />
          </Card>
          <Card
            delay={0.16}
            kicker="State machine"
            title="Close a job that never started"
            body="Every status change is checked against the legal transitions. An illegal edge is rejected, never silently applied."
          >
            <StateDemo />
          </Card>
        </div>
      </div>
    </section>
  )
}
