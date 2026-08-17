import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryGrid";
import { OfferCard } from "@/components/offers/OfferCard";
import { componentFor } from "@/lib/components-registry";
import { categoryViewFor, latestOffersByProduct, offersFor } from "@/lib/public-data";

export const metadata = {
  title: "Silicon Forecast — UK PC component price research",
  description: "Transparent UK PC component price-history research, beginning with exact-product DDR5 memory evidence.",
};

export default function Home() {
  const ram = componentFor("ram");
  if (!ram) throw new Error("RAM category registry entry is required");
  const ramView = categoryViewFor(ram);
  const ramOffers = offersFor(ram.dataset);
  const latestRamOffers = latestOffersByProduct(ram.dataset);

  return (
    <>
      <section className="shell product-hero">
        <div className="product-hero-copy">
          <p className="eyebrow">UK component intelligence · Primary retail only</p>
          <h1>See real UK RAM prices—and the evidence behind every point.</h1>
          <p>
            Compare dated primary-retail observations for exact DDR5 kits, follow source links and inspect raw product history. No fuzzy product substitutions, smoothed gaps or decorative mystery lines.
          </p>
          <div className="hero-actions">
            <Link className="button-link" href="/price-history/ram/">Explore the RAM workspace →</Link>
            <Link href="/methodology/">Read the publication standard</Link>
          </div>
        </div>
        <aside className="hero-status-card" aria-label="RAM programme status">
          <span>Current vertical</span>
          <strong>DDR5 memory</strong>
          <p>{ram.scopeNote}</p>
          <dl>
            <div><dt>Observed prices</dt><dd>{ramOffers ? "Public" : "Withheld"}</dd></div>
            <div><dt>Aggregate index</dt><dd>{ramView.state === "public" ? "Released" : "Withheld"}</dd></div>
            <div><dt>Retailer links</dt><dd>{ramOffers ? "Published" : "None"}</dd></div>
          </dl>
        </aside>
      </section>

      {ramOffers ? (
        <section className="shell section homepage-offers" aria-labelledby="homepage-offers-title">
          <div className="section-heading-row"><div><p className="section-label">Latest retained prices</p><h2 id="homepage-offers-title">Start with the products, not a promise.</h2></div><p>Observed through {ramOffers.latest_observed_at.slice(0, 10)}. VAT included; delivery excluded. Check the retailer before buying.</p></div>
          <div className="offer-grid">{latestRamOffers.map(({ product, observation }) => <OfferCard key={product.mpn} dataset="ram" product={product} observation={observation} />)}</div>
          <div className="retail-home-footer"><p>{ramOffers.observations.length} released observations across {ramOffers.products.length} exact products.</p><Link href="/price-history/ram/">See all RAM evidence →</Link></div>
        </section>
      ) : null}

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
          <article><span>Index</span><strong>{ramView.state === "public" ? "Public series available" : "Aggregate series withheld"}</strong></article>
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
