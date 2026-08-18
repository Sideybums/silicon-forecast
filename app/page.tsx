import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryGrid";
import { DailyMarketDashboard } from "@/components/dashboard/DailyMarketDashboard";
import { componentFor } from "@/lib/components-registry";
import { dailyMarketFor, eventLineFor, offersFor } from "@/lib/public-data";

export const metadata = {
  title: "Silicon Forecast — UK PC component price research",
  description: "Transparent UK PC component price-history research, beginning with exact-product DDR5 memory evidence.",
};

export default function Home() {
  const ram = componentFor("ram");
  if (!ram) throw new Error("RAM category registry entry is required");
  const ramOffers = offersFor(ram.dataset);
  const dailyMarket = ramOffers ? dailyMarketFor(ram.slug) : null;
  const eventLine = eventLineFor(ram.slug);

  return (
    <>
      {dailyMarket ? <div className="shell homepage-dashboard"><DailyMarketDashboard dataset={dailyMarket} eventLine={eventLine} headingLevel="h1" eyebrow="Daily market snapshot · RAM · Primary retail only" /></div> : null}

      <section className="shell section product-proof" aria-labelledby="why-title">
        <div className="retail-home-panel">
          <div className="retail-home-heading">
            <div><p className="section-label">Why this exists</p><h2 id="why-title">A price chart should be evidence, not decoration.</h2></div>
            <span className="status-badge status-badge-building">Research preview</span>
          </div>
          <div className="retail-home-grid">
            <article><span>01</span><strong>Exact identity</strong><p>Manufacturer part numbers and exact configurations take priority over convenient fuzzy matches.</p></article>
            <article><span>02</span><strong>Honest absence</strong><p>Missed collection and unavailable comparisons remain visible gaps rather than smooth invented history.</p></article>
            <article><span>03</span><strong>Separate context</strong><p>News can help explain timing, but it cannot alter a price observation or manufacture causation.</p></article>
          </div>
          <div className="retail-home-footer"><p>Built so a future category uses the same evidence contract, not a fresh set of exceptions.</p><Link href="/about/">About the project →</Link></div>
        </div>
      </section>

      <section className="shell section ram-feature" aria-labelledby="ram-feature-title">
        <div className="ram-feature-heading">
          <div>
            <p className="section-label">First complete template</p>
            <h2 id="ram-feature-title">Memory (RAM)</h2>
            <p>{ram.detail}</p>
          </div>
          <span className="category-focus-mark">01 / RAM</span>
        </div>
        <div className="ram-feature-grid">
          <article><span>Scope</span><strong>{ram.scopeNote}</strong></article>
          <article><span>Prices</span><strong>{ramOffers ? `${ramOffers.products.length} exact products · source links live` : "No factual release"}</strong></article>
          <article><span>History</span><strong>{dailyMarket ? `Observed prices since ${new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${dailyMarket.first_date}T12:00:00Z`))}` : "No factual release"}</strong></article>
        </div>
        <div className="ram-feature-actions">
          <Link className="button-link" href="/categories/ram/">View RAM research →</Link>
          <Link href="/price-history/ram/">Open price-history workspace →</Link>
        </div>
      </section>

      <section className="shell section" aria-labelledby="categories-title">
        <div className="section-heading-row">
          <div><p className="section-label">Expansion path</p><h2 id="categories-title">One template. More component markets later.</h2></div>
          <p>RAM proves the operating model first. GPUs, CPUs and SSDs do not inherit a methodology merely because the page is ready.</p>
        </div>
        <CategoryGrid />
      </section>

      <section className="shell section next-phase-panel">
        <div><p className="section-label">Next product layer</p><h2>Research that helps describe movements without pretending to prove their cause.</h2></div>
        <div><p>The next product layer will gather reported context from credible sources. Claims, alternatives, uncertainty and wording must be reviewed before anything reaches the site.</p><Link href="/research/">See the research standard →</Link></div>
      </section>
    </>
  );
}
