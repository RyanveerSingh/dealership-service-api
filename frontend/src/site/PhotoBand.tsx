import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

interface Props {
  src: string
  /** CSS object-position. Portrait photos crop hard in a landscape frame, so
   *  this decides what survives the crop rather than leaving it to chance. */
  position?: string
  label: string
  statement: string
  body?: string
  /** Bright photographs need more scrim under the type than dark ones do. */
  scrim?: 'light' | 'heavy'
  align?: 'left' | 'center'
  /**
   * Flips the photograph horizontally. Useful when the subject sits on the
   * same side as the copy - mirroring moves it across rather than pushing the
   * text somewhere it reads worse. Only safe on images with no legible text in
   * frame, since that would flip too.
   */
  mirror?: boolean
  /**
   * CSS filter applied to the photograph. Each of these images was shot at a
   * different exposure, so a single global value would blow out one while
   * leaving another muddy - it is set per band instead.
   */
  filter?: string
  /**
   * Headroom above the subject, as a fraction of the band's height.
   *
   * These photographs are cropped tight to the car, which makes the bands feel
   * compact. Rather than scaling the image up - which only crops it further -
   * the band is made taller, the real photograph is anchored to the bottom, and
   * the space above is filled with a heavily blurred, scaled copy of the same
   * image. The extension is built from the photo's own colours, so it reads as
   * sky or atmosphere continuing upward rather than as empty canvas.
   *
   * A true AI outpaint would invent real detail up there; this is the honest
   * approximation that costs nothing.
   */
  extend?: number
}

export default function PhotoBand({
  src,
  position = '50% 50%',
  label,
  statement,
  body,
  scrim = 'light',
  align = 'left',
  mirror = false,
  filter = 'brightness(1.35) contrast(1.03) saturate(1.05)',
  extend = 0,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  // Runs across the whole time the band is on screen, not just while it is
  // pinned, so the photograph is always moving a little more slowly than the
  // page around it.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.06, 1.12])
  const copyY = useTransform(scrollYProgress, [0, 1], [40, -40])

  const heavy = scrim === 'heavy'

  return (
    <section
      ref={ref}
      className="relative flex items-end overflow-hidden"
      // Taller than the viewport by exactly the headroom being added, so the
      // photograph itself keeps its full height instead of being squeezed.
      style={{ minHeight: `${100 + extend * 100}svh` }}
    >
      <motion.div
        className="absolute inset-0 -z-10"
        style={reduced ? undefined : { y, scale }}
      >
        {extend > 0 && (
          // The extension. Scaled past the frame and blurred hard so no edge or
          // recognisable shape survives - only the colour field.
          <img
            src={src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: '50% 0%',
              transform: `scale(1.6)${mirror ? ' scaleX(-1)' : ''}`,
              filter: `${filter} blur(64px) saturate(0.9)`,
            }}
          />
        )}

        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-x-0 bottom-0 w-full object-cover"
          style={{
            height: extend > 0 ? `${100 / (1 + extend)}%` : '100%',
            objectPosition: position,
            transform: mirror ? 'scaleX(-1)' : undefined,
            filter,
            // Feathers the top edge of the real photograph into the blurred
            // field, so the join is a gradient rather than a visible seam.
            maskImage:
              extend > 0
                ? 'linear-gradient(to bottom, transparent 0%, #000 14%, #000 100%)'
                : undefined,
          }}
        />
      </motion.div>

      {/* Flat darken, then a bottom-weighted gradient where the copy sits, then
          a seal at both edges so the band joins the sections above and below
          instead of stopping at a hard line. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: heavy
            ? 'linear-gradient(to top, #06070a 0%, rgba(6,7,10,0.80) 20%, rgba(6,7,10,0.26) 46%, transparent 66%)'
            : 'linear-gradient(to top, #06070a 0%, rgba(6,7,10,0.68) 16%, rgba(6,7,10,0.14) 42%, transparent 60%)',
        }}
      />

      <motion.div
        className="shell gutter relative w-full pb-20 md:pb-28"
        style={reduced ? undefined : { y: copyY }}
      >
        <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
          <p className="reveal label on-photo-label">{label}</p>
          <p
            className="reveal display on-photo mt-6 text-[clamp(1.9rem,4.6vw,3.6rem)]"
            data-delay="60"
          >
            {statement}
          </p>
          {body && (
            <p
              className="reveal lede on-photo-body mt-6"
              data-delay="130"
            >
              {body}
            </p>
          )}
        </div>
      </motion.div>
    </section>
  )
}
