export default function Thesis() {
  return (
    <section className="relative py-32 md:py-44">
      <div className="shell gutter">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-3">
            <p className="reveal label">The premise</p>
            <div
              className="draw mt-5 h-px w-full origin-left"
              style={{ background: 'var(--color-champagne)' }}
            />
          </div>

          <div className="md:col-span-9">
            <p
              className="reveal display text-[clamp(1.7rem,3.6vw,3.1rem)] leading-[1.12]"
              data-delay="80"
            >
              Most systems trust the interface to behave.
              <span className="text-chalk-faint"> This one assumes it won&rsquo;t.</span>
            </p>

            <div className="mt-14 grid gap-10 sm:grid-cols-2 sm:gap-14">
              <p className="reveal lede" data-delay="160">
                A service department runs on scarce, physical things — a bay that
                holds one car, a shelf that holds four brake discs. Software that
                merely asks users not to overbook them will, eventually, overbook
                them. Two people click at the same moment and both are told yes.
              </p>
              <p className="reveal lede" data-delay="240">
                So the rules live where they cannot be bypassed: inside the
                transaction, and in constraints the database enforces whatever the
                application believes. The interface is not trusted, because it
                does not need to be.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
