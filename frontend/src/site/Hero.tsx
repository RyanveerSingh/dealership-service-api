import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

const META = [
  { k: 'Runtime', v: 'Spring Boot 3.5' },
  { k: 'Store', v: 'MySQL 8.4' },
  { k: 'Suite', v: '43 passing' },
  { k: 'Locks', v: 'Two strategies' },
]

/** Words rise out of a mask, line by line. */
function Headline({ reduced }: { reduced: boolean | null }) {
  const lines: { t: string; accent?: boolean }[][] = [
    [{ t: 'Certainty' }, { t: 'from' }],
    [{ t: 'kerbside' }, { t: 'to' }],
    [{ t: 'invoice.', accent: true }],
  ]
  let i = 0
  return (
    <h1 className="display on-photo max-w-[19ch] text-[clamp(2.6rem,7.4vw,6.6rem)]">
      {lines.map((line, li) => (
        <span key={li} className="block overflow-hidden pb-[0.06em]">
          {line.map((w) => {
            const delay = 0.24 + i++ * 0.055
            return (
              <motion.span
                key={w.t}
                className="inline-block"
                style={w.accent ? { color: 'var(--color-champagne)' } : undefined}
                initial={reduced ? false : { y: '108%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
              >
                {w.t}&nbsp;
              </motion.span>
            )
          })}
        </span>
      ))}
    </h1>
  )
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  // The photograph drifts slower than the page and lifts very slightly as it
  // leaves. Small numbers on purpose - a background that moves as much as the
  // content reads as a slideshow rather than as depth.
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.14])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const copyFade = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const rise = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <section ref={ref} className="relative flex min-h-svh flex-col justify-between overflow-hidden">
      {/* ── photograph ───────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={reduced ? undefined : { y: photoY, scale: photoScale }}
      >
        <img
          src="/media/car3.jpg"
          alt=""
          aria-hidden="true"
          // eager + high priority: this is the largest element on first paint,
          // and lazy-loading it would guarantee a visible pop-in.
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
          // 2560x1707, so a 16:9 frame keeps almost all of it - only a little
          // sky and road are lost. Mirrored because the car sits on the left of
          // the original and the headline occupies that side; flipping moves it
          // across rather than pushing the type somewhere it reads worse.
          style={{
            objectPosition: '50% 52%',
            transform: 'scaleX(-1)',
            filter: 'brightness(1.34) contrast(1.05) saturate(1.06)',
          }}
        />
      </motion.div>

      {/* ── scrims ───────────────────────────────────────────────────────────
          Three, each doing one job: darken the whole frame so white type holds
          contrast wherever the photo is bright, weight the bottom where the
          copy sits, and seal the join into the next section so the image does
          not simply stop at an edge. */}

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to top, #06070a 0%, rgba(6,7,10,0.72) 18%, rgba(6,7,10,0.18) 44%, transparent 62%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(232,211,166,0.07), transparent 72%)',
        }}
      />

      {/* ── masthead ─────────────────────────────────────────────────────── */}
      <motion.header
        className="relative border-b"
        style={{ borderColor: 'var(--hairline)' }}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="shell gutter flex h-16 items-center justify-between md:h-20">
          <span className="font-display text-[0.95rem] tracking-[-0.01em] text-chalk">
            Dealership<span className="text-champagne">·</span>Service
          </span>
          <nav className="flex items-center gap-7">
            <a href="#guarantees" className="label on-photo-label transition hover:text-chalk">Guarantees</a>
            <a href="#try" className="label on-photo-label transition hover:text-chalk">Try it</a>
            <a href="#specification" className="label on-photo-label hidden transition hover:text-chalk sm:block">
              Specification
            </a>
            <Link
              to="/app/bookings"
              className="label no-underline transition"
              style={{ color: 'var(--color-champagne)' }}
            >
              Console →
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* ── statement ────────────────────────────────────────────────────── */}
      <motion.div
        className="shell gutter relative flex flex-1 items-end pt-24 pb-16 md:items-center md:py-20"
        style={reduced ? undefined : { y: copyY, opacity: copyFade }}
      >
        <div className="w-full">
          <motion.p className="label on-photo-label mb-7" {...rise(0.1)}>
            Service lane management
          </motion.p>

          <Headline reduced={reduced} />

          <motion.p
            className="lede on-photo-body mt-8 max-w-[52ch]"
            {...rise(0.56)}
          >
            A bay cannot be booked twice. A part cannot be sold twice. A job cannot
            be closed before it starts — enforced in the transaction, not asked of
            the interface.
          </motion.p>

          <motion.div className="mt-10 flex flex-wrap items-center gap-3" {...rise(0.66)}>
            <a
              href="#try"
              className="group inline-flex items-center gap-3 px-7 py-3.5 text-[0.82rem] tracking-wide"
              style={{ background: 'var(--color-champagne)', color: 'var(--color-ink)' }}
            >
              Break it yourself
              <span className="inline-block transition-transform group-hover:translate-y-0.5" aria-hidden="true">↓</span>
            </a>
            <a
              href="#guarantees"
              className="inline-flex items-center gap-3 border px-7 py-3.5 text-[0.82rem] tracking-wide text-chalk backdrop-blur-sm transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--hairline-strong)' }}
            >
              What it enforces
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* ── specimen strip ───────────────────────────────────────────────── */}
      <div className="relative border-t" style={{ borderColor: 'var(--hairline)' }}>
        <div className="shell gutter grid grid-cols-2 md:grid-cols-4">
          {META.map(({ k, v }, i) => (
            <motion.div
              key={k}
              className="border-b py-5 md:border-b-0 md:border-l md:py-6 md:pl-6 md:first:border-l-0 md:first:pl-0"
              style={{ borderColor: 'var(--hairline)' }}
              {...rise(0.78 + i * 0.06)}
            >
              <div className="label on-photo-label mb-1.5">{k}</div>
              <div className="font-display on-photo text-[0.98rem] text-chalk">{v}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
