import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { BrakeDisc, Bolt, Cog, CoilSpring, OilFilter, SparkPlug, Tyre, Wrench } from './parts'

/**
 * Parts drifting behind the headline, each at its own depth.
 *
 * depth drives both the parallax distance and the opacity, so nearer parts move
 * further and read stronger - the two cues the eye uses to judge distance.
 */
const DRIFT = [
  { C: BrakeDisc, top: '12%', left: '6%', size: 190, depth: 0.9, spin: 40 },
  { C: Cog, top: '62%', left: '3%', size: 130, depth: 0.55, spin: -60 },
  { C: SparkPlug, top: '20%', left: '84%', size: 110, depth: 0.75, spin: 15 },
  { C: Tyre, top: '68%', left: '80%', size: 220, depth: 1.05, spin: 30 },
  { C: Wrench, top: '78%', left: '38%', size: 120, depth: 0.4, spin: -25 },
  { C: OilFilter, top: '6%', left: '46%', size: 90, depth: 0.3, spin: 20 },
  { C: CoilSpring, top: '44%', left: '92%', size: 95, depth: 0.5, spin: -15 },
  { C: Bolt, top: '52%', left: '14%', size: 80, depth: 0.35, spin: 45 },
]

function DriftingPart({
  item, progress,
}: {
  item: (typeof DRIFT)[number]
  progress: ReturnType<typeof useScroll>['scrollYProgress']
}) {
  const { C, top, left, size, depth, spin } = item
  const y = useTransform(progress, [0, 1], [0, -420 * depth])
  const rotate = useTransform(progress, [0, 1], [0, spin])
  const opacity = useTransform(progress, [0, 0.75], [0.14 + depth * 0.1, 0])

  return (
    <motion.div
      className="pointer-events-none absolute text-amber-300"
      style={{ top, left, width: size, height: size, y, rotate, opacity }}
    >
      <C className="h-full w-full" weight={1.1} />
    </motion.div>
  )
}

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const titleY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0d12]"
    >
      {/* A faint engineering grid, so the parts read as a technical drawing. */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.10),transparent_62%)]" />

      {!reduced && DRIFT.map((item, i) => (
        <DriftingPart key={i} item={item} progress={scrollYProgress} />
      ))}

      <motion.div
        style={reduced ? undefined : { y: titleY, opacity: titleOpacity }}
        className="relative z-10 mx-auto max-w-4xl px-6 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5 inline-block rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-1.5 text-xs font-medium tracking-[0.18em] text-amber-300 uppercase"
        >
          Dealership Service Management
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="text-5xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl md:text-7xl"
        >
          Every bay.
          <br />
          Every part.
          <span className="block bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            Every order.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
        >
          A service lane that cannot double-book a bay, cannot sell a part it does
          not have, and cannot close a job that never started.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {/* Primary action keeps the visitor on the page and sends them into
              the car, which is the thing worth seeing. */}
          <a
            href="#teardown"
            className="rounded-lg bg-amber-400 px-6 py-3 text-sm font-semibold text-[#0a0d12] transition hover:bg-amber-300"
          >
            See it come apart
          </a>
          <Link
            to="/app/bookings"
            className="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/35 hover:bg-white/5"
          >
            Open the console
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center"
      >
        <p className="mb-2 text-[10px] tracking-[0.28em] text-zinc-500 uppercase">Scroll</p>
        <motion.div
          animate={reduced ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto h-9 w-5 rounded-full border border-zinc-600"
        >
          <div className="mx-auto mt-1.5 h-1.5 w-0.5 rounded-full bg-amber-400" />
        </motion.div>
      </motion.div>
    </section>
  )
}
