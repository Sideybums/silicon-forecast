import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryStatusPanel } from "@/components/category/CategoryStatusPanel";
import { ComparisonConsiderations } from "@/components/category/ComparisonConsiderations";
import { WithheldHistoryPanel } from "@/components/category/WithheldHistoryPanel";
import { OfferCard } from "@/components/offers/OfferCard";
import { componentFor, components } from "@/lib/components-registry";
import { categoryViewFor, latestOffersByProduct, offersFor } from "@/lib/public-data";

export const dynamicParams = false;
export function generateStaticParams() { return components.map((entry) => ({ slug: entry.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) return {};
  const offers = offersFor(entry.dataset);
  return {
    title: offers ? `${entry.name} observed UK prices` : `${entry.name} price history research`,
    description: offers
      ? `Dated UK retail price observations, exact-MPN histories and retailer source links for ${entry.name}.`
      : `${entry.name} coverage status at Silicon Forecast.`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) notFound();
  const view = categoryViewFor(entry);
  const offers = offersFor(entry.dataset);
  const latest = latestOffersByProduct(entry.dataset);

  return (
    <div className="shell page-shell price-history-page">
      <header className="page-header price-history-header">
        <p className="eyebrow breadcrumb"><Link href="/">Home</Link> · <Link href={`/categories/${entry.slug}/`}>{entry.shortName}</Link> · Prices</p>
        <div className="product-heading-row"><div><h1>{entry.name} prices and history</h1><p>{entry.detail}</p></div><span className="status-badge">{offers ? "Observed prices public" : entry.programme === "uncollected" ? "Not collecting" : "Research preview"}</span></div>
      </header>

      <CategoryStatusPanel entry={entry} view={view} showWorkspaceLink={false} />

      {offers ? (
        <>
          <section className="latest-offers-section" aria-labelledby="latest-offers-title">
            <div className="panel-heading"><div><p className="section-label">Latest retained observation per product</p><h2 id="latest-offers-title">Real prices, exact products, direct sources.</h2></div><span className="capture-date">Through {offers.latest_observed_at.slice(0, 10)}</span></div>
            <p className="method-lede">These are the most recent qualifying observations in this release—not a complete scan of the market and not a guarantee of today&apos;s checkout price. VAT is included; delivery is excluded.</p>
            <div className="offer-grid">{latest.map(({ product, observation }) => <OfferCard key={product.mpn} dataset={entry.slug} product={product} observation={observation} />)}</div>
          </section>

          <section className="observation-release-strip" aria-label="Released factual evidence summary">
            <div><span>Released observations</span><strong>{offers.observations.length}</strong></div>
            <div><span>Exact products</span><strong>{offers.products.length}</strong></div>
            <div><span>Retailers in history</span><strong>{offers.retailers.length}</strong></div>
            <div><span>Oldest released observation</span><strong>{offers.observations[0].observed_at.slice(0, 10)}</strong></div>
          </section>

          <section className="history-layer-heading"><p className="section-label">Separate analytical layer</p><h2>The aggregate RAM index is still withheld.</h2><p>Direct observations can be useful without pretending that an unapproved basket, baseline or linking method already represents the whole market.</p></section>
          <WithheldHistoryPanel entry={entry} />
        </>
      ) : entry.programme === "uncollected" ? (
        <section className="uncollected-workspace" aria-labelledby="uncollected-title"><p className="section-label">Coverage state</p><h2 id="uncollected-title">No observations collected for {entry.shortName}.</h2><p>The template exists, but no prices or source links are implied for this category.</p></section>
      ) : <WithheldHistoryPanel entry={entry} />}

      <section className="research-rail" aria-labelledby="research-title">
        <div><p className="section-label">News and research</p><h2 id="research-title">{entry.programme === "uncollected" ? "No category research underway." : "Context is reviewed separately from prices."}</h2><p>{entry.programme === "uncollected" ? `No ${entry.shortName} price or research programme has started. This page exists only as a reusable category template.` : "Research can describe reported events around an observed movement. It cannot rewrite a price, fill a missing date or convert timing into proof of cause."}</p>{entry.programme === "uncollected" ? null : <Link href="/research/">Open the research desk →</Link>}</div>
        <div className="research-empty-state"><span>Editorial state</span><strong>{entry.programme === "uncollected" ? "No material collected" : "No reviewed explanations published"}</strong><p>{entry.programme === "uncollected" ? "No research pipeline or future publication is implied." : "Research workers remain draft-only until claims, citations, alternatives and wording receive human review."}</p></div>
      </section>

      <section className="retail-methodology-panel" aria-labelledby="qualification-title">
        <div className="panel-heading"><div><p className="section-label">Evidence standard</p><h2 id="qualification-title">What earns a place on the page.</h2></div><Link href="/methodology/">Full methodology status →</Link></div>
        <div className="qualification-grid"><article><span>01</span><h3>Exact product</h3><p>The observed MPN must match a reviewed 32GB desktop DDR5 kit.</p></article><article><span>02</span><h3>Factual price</h3><p>GBP item price and VAT state must be explicit. Delivery is disclosed as excluded.</p></article><article><span>03</span><h3>Dated source</h3><p>Every price carries its observation time, retailer and source or archive link.</p></article><article><span>04</span><h3>Visible absence</h3><p>No interpolation, forward-fill, cross-product substitution or fabricated continuity.</p></article></div>
      </section>
      <ComparisonConsiderations entry={entry} />
    </div>
  );
}
