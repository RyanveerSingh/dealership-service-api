import { Link } from 'react-router-dom'
export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--hairline)' }}>
      <div className="shell gutter grid gap-8 py-12 sm:grid-cols-2 md:py-16">
        <div>
          <p className="font-display text-[0.95rem] text-chalk">
            Dealership<span className="text-champagne">·</span>Service
          </p>
          <p className="mt-2 text-[0.82rem] text-chalk-faint">
            Service lane management · Spring Boot &amp; MySQL
          </p>
        </div>

        <nav className="flex flex-wrap items-start gap-x-8 gap-y-3 sm:justify-end">
          <a
            href="/swagger-ui.html"
            target="_blank"
            rel="noreferrer"
            className="label transition-colors duration-300 hover:text-champagne"
            style={{ transitionTimingFunction: 'var(--ease)' }}
          >
            API reference
          </a>
          <a
            href="/actuator/health"
            target="_blank"
            rel="noreferrer"
            className="label transition-colors duration-300 hover:text-champagne"
            style={{ transitionTimingFunction: 'var(--ease)' }}
          >
            Health
          </a>
          <Link to="/app/bookings" className="label no-underline transition-colors hover:text-champagne">
            Console
          </Link>
          <a
            href="https://github.com/RyanveerSingh/dealership-service-api"
            target="_blank"
            rel="noreferrer"
            className="label transition-colors duration-300 hover:text-champagne"
            style={{ transitionTimingFunction: 'var(--ease)' }}
          >
            Source
          </a>
        </nav>
      </div>

      <div className="border-t" style={{ borderColor: 'var(--hairline)' }}>
        <div className="shell gutter py-6">
          <p className="text-[0.72rem] tracking-wide text-chalk-faint">
            Built by Ryanveer Singh · Clash Display &amp; Satoshi via Fontshare
          </p>
        </div>
      </div>
    </footer>
  )
}
