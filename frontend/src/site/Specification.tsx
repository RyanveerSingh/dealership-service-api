const SPEC: [string, string, string][] = [
  ['Runtime', 'Java 17 · Spring Boot 3.5.3', 'Tomcat, 40 worker threads'],
  ['Persistence', 'MySQL 8.4 · Hibernate 6.6', 'Schema validated, never generated'],
  ['Migrations', 'Flyway · versioned SQL', 'Three migrations, in source control'],
  ['Concurrency', 'Pessimistic + optimistic', 'Row lock on bays, @Version on stock'],
  ['Authorisation', 'JWT · four roles', 'Checked per method, not per screen'],
  ['Contract', 'OpenAPI 3', 'One JSON error shape, filters included'],
  ['Verification', '43 tests · CI on real MySQL', 'Migrations and entities checked together'],
  ['Delivery', 'Multi-stage image · non-root', 'Layered JAR, 446 kB changes per commit'],
  ['Footprint', '192 MB heap · 192 MB metaspace', 'Settles at 347 MB under sustained load'],
]

export default function Specification() {
  return (
    <section id="specification" className="scroll-mt-24 py-32 md:py-44">
      <div className="shell gutter">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-3">
            <p className="reveal label">Specification</p>
            <div
              className="draw mt-5 h-px w-full origin-left"
              style={{ background: 'var(--color-champagne)' }}
            />
            <p className="reveal mt-8 text-[0.85rem] leading-relaxed text-chalk-faint" data-delay="120">
              Every figure below is measured, not estimated. The footprint in
              particular was taken under load, not at startup.
            </p>
          </div>

          <div className="md:col-span-9">
            <dl className="border-t" style={{ borderColor: 'var(--hairline-strong)' }}>
              {SPEC.map(([k, v, note], i) => (
                <div
                  key={k}
                  className="reveal grid grid-cols-1 gap-1 border-b py-5 sm:grid-cols-12 sm:gap-6 sm:py-6"
                  style={{ borderColor: 'var(--hairline)' }}
                  data-delay={String(i * 45)}
                >
                  <dt className="label sm:col-span-3 sm:pt-1">{k}</dt>
                  <dd className="sm:col-span-5">
                    <span className="font-display text-[1.02rem] text-chalk">{v}</span>
                  </dd>
                  <dd className="text-[0.85rem] text-chalk-faint sm:col-span-4 sm:pt-0.5">{note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
