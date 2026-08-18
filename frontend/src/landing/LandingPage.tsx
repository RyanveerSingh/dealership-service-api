import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import Hero from './Hero'
import CarStage from './CarStage'
import Features from './Features'
import Workflow from './Workflow'

const STATS = [
  { value: '8', label: 'Domain entities' },
  { value: '43', label: 'Tests, all green' },
  { value: '2', label: 'Locking strategies' },
  { value: '0', label: 'Ways to double-book' },
]

function Stats() {
  const reduced = useReducedMotion()
  return (
    <section className="border-y border-white/10 bg-[#0a0d12] py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={reduced ? undefined : { opacity: 0, y: 18 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            className="text-center"
          >
            <div className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-4xl font-semibold text-transparent sm:text-5xl">
              {s.value}
            </div>
            <div className="mt-2 text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function Closing() {
  const reduced = useReducedMotion()
  return (
    <section className="relative overflow-hidden bg-[#0a0d12] py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(251,191,36,0.13),transparent_65%)]" />
      <motion.div
        initial={reduced ? undefined : { opacity: 0, y: 24 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-2xl px-6 text-center"
      >
        <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Try to break it.
        </h2>
        <p className="mt-4 text-zinc-400">
          Book a bay twice. Order parts that do not exist. Close a job that never
          started. The console will not let you, and it will tell you why.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/app/bookings"
            className="rounded-lg bg-amber-400 px-7 py-3 text-sm font-semibold text-[#0a0d12] transition hover:bg-amber-300"
          >
            Open the console
          </Link>
          <a
            href="https://github.com/RyanveerSingh/dealership-service-api"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 px-7 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/35 hover:bg-white/5"
          >
            Read the source
          </a>
        </div>
        <p className="mt-8 font-mono text-[11px] text-zinc-600">
          advisor@dms.local · password123
        </p>
      </motion.div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0d12] antialiased">
      <Hero />
      <div id="teardown">
        <CarStage />
      </div>
      <Features />
      <Workflow />
      <Stats />
      <Closing />
      <footer className="border-t border-white/10 bg-[#080b0f] py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 text-xs text-zinc-500">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span>Dealership Service Management · Spring Boot 3.5 · React 19</span>
            <div className="flex gap-5">
              <a href="/swagger-ui.html" className="transition hover:text-amber-300">API docs</a>
              <a href="/actuator/health" className="transition hover:text-amber-300">Health</a>
              <Link to="/app/bookings" className="transition hover:text-amber-300">Console</Link>
            </div>
          </div>
          {/* Required by the model's licence, not decoration. */}
          <p className="border-t border-white/5 pt-4 text-[11px] text-zinc-600">
            3D model: Ferrari 458 Italia by{' '}
            <a
              href="https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6"
              target="_blank" rel="noreferrer"
              className="underline underline-offset-2 transition hover:text-zinc-400"
            >
              vicent091036
            </a>
            , via the three.js sample assets.
          </p>
        </div>
      </footer>
    </div>
  )
}
