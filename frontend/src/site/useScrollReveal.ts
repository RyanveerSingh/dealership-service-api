import { useEffect } from 'react'

/**
 * Reveals every .reveal and .draw element once, when it first enters view.
 *
 * One observer for the whole page rather than a ref per component: the CSS
 * already describes the transition, so all this needs to do is add a class at
 * the right moment. Elements are unobserved after firing, so nothing re-animates
 * when the visitor scrolls back up - repeating reveals are the fastest way to
 * make a page feel like a demo rather than a document.
 */
export function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('.reveal, .draw')

    // Without IntersectionObserver, or with reduced motion, show everything
    // immediately rather than leaving the page blank.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          // Stagger siblings so groups arrive as a sequence. Halved from the
          // first pass: long stagger chains are what made the lower sections
          // feel like they were still assembling themselves after arrival.
          const delay = Number(el.dataset.delay ?? 0) * 0.45
          window.setTimeout(() => el.classList.add('is-in'), delay)
          observer.unobserve(el)
        }
      },
      // Positive bottom margin, so the observer fires while the element is
      // still 22% BELOW the fold and the transition has finished by the time
      // it is actually looked at. The first pass used a negative margin, which
      // does the opposite - it waits until the element is well inside the
      // viewport, which is exactly why content appeared to load late.
      { rootMargin: '0px 0px 22% 0px', threshold: 0 },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}
