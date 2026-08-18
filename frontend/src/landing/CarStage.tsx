import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import type { CarStage as Stage } from './carScene'

const STEPS = [
  { at: 0.00, k: 'ASSEMBLED', t: 'One vehicle, one record', b: 'A VIN, an owner, a service history. Everything the workshop touches hangs off this.' },
  { at: 0.20, k: 'ORBIT', t: 'Every angle on the job card', b: 'The same car the advisor sees at the desk and the technician sees in the bay.' },
  { at: 0.48, k: 'GLASS + BODY', t: 'The shell comes off', b: 'Panel work is quoted separately from mechanical. Different labour rate, same order.' },
  { at: 0.66, k: 'INTERIOR', t: 'Cabin out', b: 'Trim, seats, steering. Each one a line priced from the parts catalogue, never from the request.' },
  { at: 0.84, k: 'RUNNING GEAR', t: 'Wheels and brakes away', b: 'Four corners, four stock rows. This is where inventory actually moves — and where a short shelf rolls the whole order back.' },
]

export default function CarStage() {
  const section = useRef<HTMLElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const stage = useRef<Stage | null>(null)
  const reduced = useReducedMotion()

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const [step, setStep] = useState(0)

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start start', 'end end'],
  })

  // Only fetch three.js and the model once the section is close. That keeps
  // ~2.5 MB off the first paint; a visitor who never scrolls never pays for it.
  useEffect(() => {
    const el = section.current
    if (!el) return

    let cancelled = false
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.disconnect()
        setStatus('loading')
        import('./carScene')
          .then(({ createCarStage }) => {
            if (cancelled || !mount.current) return
            return createCarStage(mount.current, {
              reducedMotion: !!reduced,
              onLoaded: () => !cancelled && setStatus('ready'),
            }).then((s) => {
              if (cancelled) { s.dispose(); return }
              stage.current = s
              s.setProgress(scrollYProgress.get())
            })
          })
          .catch(() => !cancelled && setStatus('failed'))
      },
      { rootMargin: '600px' },
    )

    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
  }, [reduced, scrollYProgress])

  useEffect(() => {
    const onResize = () => stage.current?.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      stage.current?.dispose()
      stage.current = null
    }
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    stage.current?.setProgress(p)
    let i = 0
    for (let s = STEPS.length - 1; s >= 0; s--) {
      if (p >= STEPS[s].at) { i = s; break }
    }
    setStep((prev) => (prev === i ? prev : i))
  })

  const current = STEPS[step]

  return (
    <section ref={section} className="relative h-[560vh] bg-[#0a0d12]">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between px-6 pt-7">
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Exploded view — service teardown
          </h2>
          <p className="font-mono text-[11px] tracking-widest text-zinc-500 tabular-nums">
            {status === 'ready' ? current.k : status === 'failed' ? 'UNAVAILABLE' : 'LOADING'}
          </p>
        </div>

        <div className="relative min-h-0 flex-1">
          <div ref={mount} className="absolute inset-0" />

          {status !== 'ready' && (
            <div className="absolute inset-0 grid place-items-center">
              {status === 'failed' ? (
                <p className="max-w-sm px-6 text-center text-sm text-zinc-500">
                  The 3D view could not start — your browser may have WebGL disabled.
                  Everything below still works.
                </p>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-amber-400" />
                  <p className="font-mono text-[11px] tracking-widest text-zinc-600 uppercase">
                    Loading model
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-6xl px-6 pb-10">
          <div className="mb-5 h-px w-full bg-white/10">
            <div
              className="h-px bg-amber-400 transition-[width] duration-150"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <div className="flex min-h-[4.5rem] gap-5">
            <span className="pt-1 font-mono text-[11px] text-amber-400 tabular-nums">
              {String(step + 1).padStart(2, '0')}/{String(STEPS.length).padStart(2, '0')}
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                {current.t}
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
                {current.b}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
