import { useRef } from 'react'
import {
  motion, useReducedMotion, useScroll, useSpring, useTransform,
  type MotionValue,
} from 'motion/react'
import { ALL_PARTS } from './parts'

/**
 * Where each part travels to when the assembly comes apart.
 *
 * angle/distance are polar so the parts land on a ring rather than a grid,
 * which is what makes it read as an exploded diagram instead of a gallery.
 * Every part gets its own spin and a slightly different start point on the
 * scroll, so they separate raggedly rather than as one rigid block.
 */
const LAYOUT = [
  { angle: -90, distance: 300, spin: 220, start: 0.05 },
  { angle: -50, distance: 340, spin: -180, start: 0.10 },
  { angle: -10, distance: 300, spin: 160, start: 0.15 },
  { angle: 30, distance: 355, spin: -240, start: 0.08 },
  { angle: 70, distance: 300, spin: 200, start: 0.13 },
  { angle: 110, distance: 345, spin: -160, start: 0.18 },
  { angle: 150, distance: 300, spin: 240, start: 0.11 },
  { angle: 190, distance: 350, spin: -200, start: 0.06 },
  { angle: 230, distance: 305, spin: 180, start: 0.16 },
]

const CAPTIONS = [
  { at: 0.06, title: 'One vehicle', body: 'A car arrives. Everything it needs is one record.' },
  { at: 0.38, title: 'Many parts', body: 'Each item drawn from stock, priced from inventory, never from the request.' },
  { at: 0.72, title: 'One invoice', body: 'Parts, labour and tax rolled into a total that stops changing once closed.' },
]

function FlyingPart({
  index, progress, reduced,
}: {
  index: number
  progress: MotionValue<number>
  reduced: boolean | null
}) {
  const { Component, label } = ALL_PARTS[index]
  const { angle, distance, spin, start } = LAYOUT[index]
  const rad = (angle * Math.PI) / 180

  // Each part's own slice of the scroll, so they do not move in lockstep.
  const span: [number, number] = [start, start + 0.55]

  const x = useTransform(progress, span, [0, Math.cos(rad) * distance])
  const y = useTransform(progress, span, [0, Math.sin(rad) * distance])
  const rotate = useTransform(progress, span, [0, spin])
  const scale = useTransform(progress, span, [0.42, 1])
  const opacity = useTransform(progress, [start, start + 0.16], [0.25, 1])
  const labelOpacity = useTransform(progress, [start + 0.35, start + 0.5], [0, 1])

  if (reduced) {
    return (
      <div
        className="absolute flex flex-col items-center text-amber-300"
        style={{
          transform: `translate(${Math.cos(rad) * distance}px, ${Math.sin(rad) * distance}px)`,
        }}
      >
        <div className="h-24 w-24"><Component className="h-full w-full" weight={1.3} /></div>
        <span className="mt-2 text-[10px] tracking-[0.16em] text-zinc-500 uppercase">{label}</span>
      </div>
    )
  }

  return (
    <motion.div
      className="absolute flex flex-col items-center text-amber-300"
      style={{ x, y, rotate, scale, opacity }}
    >
      <div className="h-24 w-24 drop-shadow-[0_0_22px_rgba(251,191,36,0.28)]">
        <Component className="h-full w-full" weight={1.3} />
      </div>
      <motion.span
        style={{ opacity: labelOpacity }}
        className="mt-2 text-[10px] tracking-[0.16em] whitespace-nowrap text-zinc-500 uppercase"
      >
        {label}
      </motion.span>
    </motion.div>
  )
}

function Caption({
  caption, progress,
}: {
  caption: (typeof CAPTIONS)[number]
  progress: MotionValue<number>
}) {
  const { at, title, body } = caption
  // Fade in, hold, fade out - a window rather than a point, so the text is
  // readable for a comfortable stretch of scrolling.
  const opacity = useTransform(
    progress,
    [at - 0.06, at + 0.02, at + 0.18, at + 0.26],
    [0, 1, 1, 0],
  )
  const y = useTransform(progress, [at - 0.06, at + 0.02], [24, 0])

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 bottom-14 px-6 text-center">
      <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{body}</p>
    </motion.div>
  )
}

export default function ExplodedView() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // Smoothing the driver rather than each part: one spring instead of nine, and
  // the parts stay in step with each other while still easing.
  const progress = useSpring(scrollYProgress, {
    stiffness: 90, damping: 26, restDelta: 0.0005,
  })

  const hubRotate = useTransform(progress, [0, 1], [0, 160])
  const hubScale = useTransform(progress, [0, 0.5], [1, 0.55])
  const hubOpacity = useTransform(progress, [0.25, 0.6], [1, 0.15])
  const ringScale = useTransform(progress, [0, 1], [0.3, 1.25])
  const ringOpacity = useTransform(progress, [0, 0.25, 1], [0, 0.35, 0])

  return (
    // A tall parent gives the sticky child something to scroll through; the
    // height is what sets the pace of the whole sequence.
    <section ref={ref} className="relative h-[420vh] bg-[#0a0d12]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.09),transparent_58%)]" />

        {!reduced && (
          <motion.div
            style={{ scale: ringScale, opacity: ringOpacity }}
            className="absolute h-[640px] w-[640px] rounded-full border border-amber-300/25"
          />
        )}

        <div className="relative flex items-center justify-center">
          <motion.div
            style={reduced ? undefined : { rotate: hubRotate, scale: hubScale, opacity: hubOpacity }}
            className="absolute h-40 w-40 rounded-full border border-amber-300/30 bg-amber-300/[0.04]"
          />
          {ALL_PARTS.map((_, i) => (
            <FlyingPart key={i} index={i} progress={progress} reduced={reduced} />
          ))}
        </div>

        {!reduced && CAPTIONS.map((c) => (
          <Caption key={c.title} caption={c} progress={progress} />
        ))}
      </div>
    </section>
  )
}
