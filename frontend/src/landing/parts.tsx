/**
 * Car parts drawn as inline SVG.
 *
 * Inline rather than image files on purpose: nothing to download, nothing to
 * licence, crisp at any size, and — the reason that matters here — every path
 * is a DOM node, so individual elements can be animated rather than the whole
 * picture being one opaque rectangle.
 *
 * All strokes use currentColor, so a part takes its colour from whatever
 * wraps it.
 */

interface PartProps {
  className?: string
  /** Stroke weight. Thinner reads as a technical drawing; heavier as an icon. */
  weight?: number
}

const base = (weight = 1.5) => ({
  viewBox: '0 0 100 100',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: weight,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function BrakeDisc({ className, weight }: PartProps) {
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="38" />
      <circle cx="50" cy="50" r="30" strokeDasharray="3 4" opacity="0.55" />
      <circle cx="50" cy="50" r="15" />
      <circle cx="50" cy="50" r="6" />
      {[0, 72, 144, 216, 288].map((a) => {
        const r = (a * Math.PI) / 180
        return (
          <circle key={a} cx={50 + 10.5 * Math.cos(r)} cy={50 + 10.5 * Math.sin(r)} r="2.2" />
        )
      })}
      {Array.from({ length: 16 }).map((_, i) => {
        const r = ((i * 22.5) * Math.PI) / 180
        return (
          <line
            key={i}
            x1={50 + 31 * Math.cos(r)} y1={50 + 31 * Math.sin(r)}
            x2={50 + 37 * Math.cos(r)} y2={50 + 37 * Math.sin(r)}
            opacity="0.7"
          />
        )
      })}
    </svg>
  )
}

export function Piston({ className, weight }: PartProps) {
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <rect x="30" y="14" width="40" height="34" rx="4" />
      <line x1="30" y1="24" x2="70" y2="24" opacity="0.7" />
      <line x1="30" y1="31" x2="70" y2="31" opacity="0.7" />
      <line x1="30" y1="38" x2="70" y2="38" opacity="0.7" />
      <circle cx="50" cy="55" r="5" />
      <path d="M46 59 L42 82 M54 59 L58 82" />
      <rect x="36" y="82" width="28" height="9" rx="3" />
      <circle cx="50" cy="86.5" r="2.5" />
    </svg>
  )
}

export function SparkPlug({ className, weight }: PartProps) {
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <path d="M44 8 h12 v16 h-12 z" />
      <path d="M42 24 h16 l-2 10 h-12 z" />
      <path d="M38 34 l4 -0 h16 l4 0 l-3 8 h-18 z" />
      <path d="M41 42 h18 v10 h-18 z" />
      <path d="M43 52 h14 v18 h-14 z" />
      <line x1="43" y1="58" x2="57" y2="58" opacity="0.6" />
      <line x1="43" y1="64" x2="57" y2="64" opacity="0.6" />
      <path d="M50 70 v12" />
      <path d="M44 78 h6" />
      <path d="M44 78 v6" />
    </svg>
  )
}

export function Cog({ className, weight }: PartProps) {
  const teeth = Array.from({ length: 12 }).map((_, i) => {
    const a = (i * 30 * Math.PI) / 180
    const inner = 30, outer = 39
    const w = 0.13
    return (
      <path
        key={i}
        d={`M${50 + inner * Math.cos(a - w)} ${50 + inner * Math.sin(a - w)}
            L${50 + outer * Math.cos(a - w * 0.8)} ${50 + outer * Math.sin(a - w * 0.8)}
            L${50 + outer * Math.cos(a + w * 0.8)} ${50 + outer * Math.sin(a + w * 0.8)}
            L${50 + inner * Math.cos(a + w)} ${50 + inner * Math.sin(a + w)}`}
      />
    )
  })
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="30" />
      {teeth}
      <circle cx="50" cy="50" r="12" />
      <circle cx="50" cy="50" r="5" opacity="0.6" />
    </svg>
  )
}

export function Wrench({ className, weight }: PartProps) {
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <path d="M28 20 a12 12 0 1 0 12 12 v0 l30 30 a8 8 0 0 0 11 -11 l-30 -30 a12 12 0 0 0 -12 -12 z" />
      <path d="M24 22 l8 8" opacity="0.6" />
      <circle cx="72" cy="70" r="3" opacity="0.6" />
    </svg>
  )
}

export function OilFilter({ className, weight }: PartProps) {
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <rect x="32" y="18" width="36" height="64" rx="6" />
      <ellipse cx="50" cy="18" rx="18" ry="5" />
      <ellipse cx="50" cy="82" rx="18" ry="5" opacity="0.5" />
      {[30, 40, 50, 60, 70].map((y) => (
        <line key={y} x1="32" y1={y} x2="68" y2={y} opacity="0.45" />
      ))}
      <circle cx="50" cy="18" r="6" opacity="0.7" />
    </svg>
  )
}

export function Tyre({ className, weight }: PartProps) {
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="40" />
      <circle cx="50" cy="50" r="32" opacity="0.6" />
      <circle cx="50" cy="50" r="20" />
      <circle cx="50" cy="50" r="5" />
      {Array.from({ length: 20 }).map((_, i) => {
        const a = ((i * 18) * Math.PI) / 180
        return (
          <line
            key={i}
            x1={50 + 32 * Math.cos(a)} y1={50 + 32 * Math.sin(a)}
            x2={50 + 40 * Math.cos(a)} y2={50 + 40 * Math.sin(a)}
            opacity="0.55"
          />
        )
      })}
      {[0, 72, 144, 216, 288].map((d) => {
        const a = (d * Math.PI) / 180
        return (
          <line
            key={d}
            x1={50 + 6 * Math.cos(a)} y1={50 + 6 * Math.sin(a)}
            x2={50 + 19 * Math.cos(a)} y2={50 + 19 * Math.sin(a)}
          />
        )
      })}
    </svg>
  )
}

export function CoilSpring({ className, weight }: PartProps) {
  const coils = Array.from({ length: 7 }).map((_, i) => (
    <ellipse key={i} cx="50" cy={22 + i * 9.5} rx="20" ry="5.5" />
  ))
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      {coils}
      <line x1="30" y1="22" x2="30" y2="79" opacity="0.35" />
      <line x1="70" y1="22" x2="70" y2="79" opacity="0.35" />
    </svg>
  )
}

export function Bolt({ className, weight }: PartProps) {
  return (
    <svg {...base(weight)} className={className} aria-hidden="true">
      <path d="M50 14 L67 24 L67 44 L50 54 L33 44 L33 24 Z" />
      <circle cx="50" cy="34" r="7" opacity="0.7" />
      <rect x="45" y="54" width="10" height="32" rx="2" />
      {[62, 70, 78].map((y) => (
        <line key={y} x1="45" y1={y} x2="55" y2={y} opacity="0.5" />
      ))}
    </svg>
  )
}

/** Everything, so a section can iterate without importing each by name. */
export const ALL_PARTS = [
  { Component: BrakeDisc, label: 'Brake disc' },
  { Component: Piston, label: 'Piston' },
  { Component: SparkPlug, label: 'Spark plug' },
  { Component: Cog, label: 'Timing gear' },
  { Component: Wrench, label: 'Service' },
  { Component: OilFilter, label: 'Oil filter' },
  { Component: Tyre, label: 'Wheel' },
  { Component: CoilSpring, label: 'Coil spring' },
  { Component: Bolt, label: 'Hub bolt' },
] as const
