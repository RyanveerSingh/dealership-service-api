import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'

/**
 * A champagne hairline across the top, tracking read position.
 *
 * Scroll-linked rather than triggered: it is the one element on the page that
 * is continuously tied to the scroll position, which gives the whole document
 * a sense of length. Spring-damped so it trails the wheel very slightly
 * instead of snapping, matching the page's momentum scrolling.
 */
export default function ScrollProgress() {
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const width = useSpring(scrollYProgress, { stiffness: 240, damping: 34, restDelta: 0.001 })

  if (reduced) return null

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 z-50 h-px origin-left"
      style={{
        scaleX: width,
        width: '100%',
        background:
          'linear-gradient(90deg, var(--color-champagne), var(--color-copper))',
      }}
    />
  )
}
