import Hero from './Hero'
import Thesis from './Thesis'
import PhotoBand from './PhotoBand'
import Guarantees from './Guarantees'
import TryIt from './TryIt'
import Specification from './Specification'
import Numbers from './Numbers'
import Closing from './Closing'
import Footer from './Footer'
import ScrollProgress from './ScrollProgress'
import { useScrollReveal } from './useScrollReveal'
import { useSmoothScroll } from './useSmoothScroll'

export default function SitePage() {
  useSmoothScroll()
  useScrollReveal()

  return (
    // .grain lays a fixed noise field over everything, which is what keeps the
    // dark ground reading as a surface rather than as flat black.
    <div className="grain">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-champagne focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <main id="main">
        <Hero />
        <Thesis />
        <PhotoBand
          src="/media/car4.jpg"
          extend={0.34}
          position="50% 54%"
          scrim="heavy"
          // A white car against lit autumn foliage: the brightest frame on the
          // page. Lifting it further would blow the panels out, so this one is
          // held near neutral and leans on the heavier scrim instead.
          filter="brightness(1.02) contrast(1.05) saturate(1.04)"
          label="Every job, the same shape"
          statement="One vehicle. One bay. One order. One total that stops changing."
          body="A repair order belongs to exactly one appointment, and the database will not permit a second. When it closes the figures freeze - it has stopped being a working document and become a record."
        />
        <Guarantees />
        <PhotoBand
          src="/media/car2.jpg"
          extend={0.30}
          position="50% 48%"
          scrim="heavy"
          filter="brightness(1.16) contrast(1.04) saturate(1.06)"
          label="Booked, not hoped for"
          statement="Two advisors, one bay, one winner."
          body="The bay row is locked before the overlap is tested, so simultaneous bookings serialise instead of both succeeding."
        />
        <TryIt />
        <Specification />
        <PhotoBand
          src="/media/car.jpg"
          extend={0.32}
          // Replaced with a bright daylight frame, so everything this slot was
          // tuned for has inverted: it was a near-black 0.56 portrait needing a
          // hard lift and a 58% anchor; it is now a 1.50 landscape that is
          // already brighter than the page and needs holding back, not raising.
          position="50% 52%"
          scrim="heavy"
          filter="brightness(1.0) contrast(1.06) saturate(1.04)"
          label="Nothing moves unrecorded"
          statement="Every part that comes off is a line on the order."
          body="Stock is drawn down in the same transaction that records the line. If the shelf is short, both are rolled back together."
        />
        <Numbers />
        <PhotoBand
          src="/media/car5.jpg"
          extend={0.26}
          position="50% 50%"
          mirror
          scrim="heavy"
          filter="brightness(1.30) contrast(1.05) saturate(1.05)"
          label="Back on the road"
          statement="The job is closed. The record is not."
          body="Parts, labour and tax are fixed at the moment of closing, so the invoice still reconciles years later even after every price in the catalogue has moved."
        />
        <Closing />
      </main>
      <Footer />
    </div>
  )
}
