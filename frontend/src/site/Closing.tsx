import { Link } from 'react-router-dom'
export default function Closing() {
  return (
    <section className="relative overflow-hidden py-36 md:py-52">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="breathe absolute bottom-[-30%] left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(227,207,164,0.11) 0%, rgba(227,207,164,0.03) 45%, transparent 70%)',
          }}
        />
      </div>

      <div className="shell gutter relative">
        <p className="reveal label">Verify it yourself</p>

        <h2
          className="reveal display mt-8 max-w-[15ch] text-[clamp(2.4rem,6.4vw,5.4rem)]"
          data-delay="90"
        >
          Try to make it
          <span className="text-champagne"> contradict itself.</span>
        </h2>

        <p className="reveal lede mt-9" data-delay="180">
          Book a bay twice. Order parts that do not exist. Close a job that never
          started. The API refuses all three, and tells you precisely why.
        </p>

        <div className="reveal mt-12 flex flex-wrap gap-3" data-delay="260">
          {/* Primary action stays on the page. Sending someone to an unstyled
              Swagger page as the main call to action drops them out of the
              design entirely, which is why the live panel exists. */}
          <a
            href="#try"
            className="group inline-flex items-center gap-3 px-8 py-4 text-[0.84rem] tracking-wide"
            style={{ background: 'var(--color-champagne)', color: 'var(--color-ink)' }}
          >
            Run it against the live service
            <span
              className="inline-block transition-transform group-hover:-translate-y-0.5"
              aria-hidden="true"
            >
              ↑
            </span>
          </a>
          <Link
            to="/app/bookings"
            className="inline-flex items-center gap-3 border px-8 py-4 text-[0.84rem] tracking-wide text-chalk no-underline transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--hairline-strong)' }}
          >
            Open the console
          </Link>
          <a
            href="https://github.com/RyanveerSingh/dealership-service-api"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 border px-8 py-4 text-[0.84rem] tracking-wide text-chalk-dim transition-colors hover:text-chalk"
            style={{ borderColor: 'var(--hairline-strong)' }}
          >
            Read the source
          </a>
        </div>
      </div>
    </section>
  )
}
