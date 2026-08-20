interface Line {
  request: string
  code: string
  verdict: 'accept' | 'reject'
}

interface Guarantee {
  index: string
  title: string
  body: string
  mechanism: string
  evidence: Line[]
  note: string
}

const GUARANTEES: Guarantee[] = [
  {
    index: '01',
    title: 'Two advisors, one bay',
    body:
      'Booking locks the bay row, then tests for an overlap, then inserts — in that order, inside one transaction. Two advisors booking the same slot serialise: the second one waits, then sees the first booking and is refused.',
    mechanism: 'Pessimistic lock · SELECT … FOR UPDATE',
    evidence: [
      { request: 'Bay 1 · 09:00–10:00', code: '201', verdict: 'accept' },
      { request: 'Bay 1 · 09:30–10:30', code: '409', verdict: 'reject' },
      { request: 'Bay 1 · 10:00–11:00', code: '201', verdict: 'accept' },
    ],
    note:
      'The third is accepted deliberately. A job starting exactly when another ends is not a clash — the window is half-open, and treating it otherwise would reject a full day of legitimate back-to-back work.',
  },
  {
    index: '02',
    title: 'A part that is not there',
    body:
      'Stock is drawn down in the same transaction that writes the invoice line. If the shelf is short, both are rolled back together — inventory is never reduced for a line that was never recorded.',
    mechanism: 'Transaction + @Version optimistic lock',
    evidence: [
      { request: 'BRK-PAD-FRT · take 2', code: '4 → 2', verdict: 'accept' },
      { request: 'BRK-PAD-FRT · take 99', code: '409', verdict: 'reject' },
      { request: 'stock after failure', code: 'still 2', verdict: 'accept' },
    ],
    note:
      'Pricing is read from inventory, never from the request — otherwise a caller could invoice itself brake discs at a rupee. Concurrency here is optimistic: contention is rare, so a version check costs less than locking every read.',
  },
  {
    index: '03',
    title: 'A job that never started',
    body:
      'Every status change is checked against the legal transitions before it is applied. A repair order cannot be closed out of an opening state, and a closed order cannot be reopened — it has become an accounting record.',
    mechanism: 'State machine · rejected with 409',
    evidence: [
      { request: 'OPEN → IN_PROGRESS', code: '200', verdict: 'accept' },
      { request: 'OPEN → CLOSED', code: '409', verdict: 'reject' },
      { request: 'IN_PROGRESS → CLOSED', code: '200', verdict: 'accept' },
    ],
    note:
      'The API publishes the legal next states with every order, so a client can only ever offer moves the server would accept. The rule is written once, on the server, and the interface follows it.',
  },
]

function Evidence({ lines }: { lines: Line[] }) {
  return (
    <div className="mt-8 border-t" style={{ borderColor: 'var(--hairline)' }}>
      {lines.map((l) => (
        <div
          key={l.request}
          className="flex items-baseline justify-between gap-6 border-b py-3"
          style={{ borderColor: 'var(--hairline)' }}
        >
          <span className="font-mono text-[0.78rem] text-chalk-dim">{l.request}</span>
          <span
            className="font-mono text-[0.78rem] tabular-nums"
            style={{
              color: l.verdict === 'accept' ? 'var(--color-accept)' : 'var(--color-reject)',
            }}
          >
            {/* A glyph as well as colour, so the verdict survives colour blindness
                and greyscale printing. */}
            {l.verdict === 'accept' ? '✓' : '✕'} {l.code}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Guarantees() {
  return (
    <section id="specification-anchor">
      <div id="guarantees" className="shell gutter scroll-mt-24">
        <div className="border-t pt-16 md:pt-24" style={{ borderColor: 'var(--hairline-strong)' }}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="reveal display max-w-[16ch] text-[clamp(2rem,4.4vw,3.6rem)]">
              Three things it will not let you do.
            </h2>
            <p className="reveal label mb-2" data-delay="120">
              Enforced · not requested
            </p>
          </div>
        </div>

        <div className="mt-20 md:mt-28">
          {GUARANTEES.map((g, i) => (
            <article
              key={g.index}
              className="grid gap-10 border-b py-16 md:grid-cols-12 md:gap-14 md:py-24"
              style={{ borderColor: 'var(--hairline)', borderBottomWidth: i === 2 ? 0 : 1 }}
            >
              <div className="md:col-span-1">
                <span
                  className="reveal font-mono text-[0.8rem] tracking-[0.1em]"
                  style={{ color: 'var(--color-champagne-deep)' }}
                >
                  {g.index}
                </span>
              </div>

              <div className="md:col-span-6">
                <h3 className="reveal display text-[clamp(1.6rem,3vw,2.4rem)]">{g.title}</h3>
                <p className="reveal lede mt-6" data-delay="90">
                  {g.body}
                </p>
                <p
                  className="reveal mt-7 font-mono text-[0.74rem] tracking-[0.1em]"
                  style={{ color: 'var(--color-champagne)' }}
                  data-delay="150"
                >
                  {g.mechanism}
                </p>
              </div>

              <div className="md:col-span-5">
                <div className="reveal" data-delay="200">
                  <p className="label">Observed</p>
                  <Evidence lines={g.evidence} />
                  <p className="mt-6 text-[0.85rem] leading-relaxed text-chalk-faint">{g.note}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
