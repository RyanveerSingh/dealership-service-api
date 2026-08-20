import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Momentum scrolling.
 *
 * This is the single largest contributor to a page feeling expensive, and the
 * easiest to overdo: too much damping and the page feels like it is fighting
 * the wheel. The values below stay close to native weight while removing the
 * step-per-notch quantisation that makes long editorial pages feel cheap.
 *
 * Disabled outright under prefers-reduced-motion - hijacking scroll is exactly
 * what that setting exists to prevent, and it can genuinely cause nausea.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      // 1.05 was too much damping - the page lagged behind the wheel, which is
      // what made everything feel heavy until scrolled fast. 0.75 keeps the
      // smoothing but stays under the thumb.
      duration: 0.75,
      // Matches --ease in the stylesheet, so scrolling and every transition on
      // the page share one motion character.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Touch devices already have momentum; adding more feels laggy.
      smoothWheel: true,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    // Anchor links must still work while Lenis owns the scroll position.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]')
      if (!anchor) return
      const id = anchor.getAttribute('href')
      if (!id || id === '#') return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: 0 })
    }
    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])
}
