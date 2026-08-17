import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObservationHistoryTable } from "@/components/offers/ObservationHistoryTable";
import { OfferCard } from "@/components/offers/OfferCard";
import { RawObservationPlot } from "@/components/offers/RawObservationPlot";
import { componentFor, trackedComponents } from "@/lib/components-registry";
import { offerHistoryFor, offerProductFor, offersFor } from "@/lib/public-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return trackedComponents.flatMap((entry) =>
    (offersFor(entry.dataset)?.products ?? []).map((product) => ({ slug: entry.slug, product: product.mpn })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; product: string }> }): Promise<Metadata> {
  const { slug, product: mpn } = await params;
  const entry = componentFor(slug);
  const product = entry ? offerProductFor(entry.dataset, mpn) : null;
  if (!entry || !product) return { title: "Page not found", robots: { index: false, follow: false } };
  return {
    title: `${product.mpn} observed UK prices`,
    description: `Dated UK retail price observations and source links for ${product.manufacturer} ${product.model}, exact MPN ${product.mpn}.`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string; product: string }> }) {
  const { slug, product: mpn } = await params;
  const entry = componentFor(slug);
  const product = entry ? offerProductFor(entry.dataset, mpn) : null;
  const observations = entry ? offerHistoryFor(entry.dataset, mpn) : [];
  if (!entry || !product || !observations.length) notFound();
  const latest = observations[observations.length - 1];
  const retailers = new Set(observations.map((item) => item.retailer_id)).size;
  const first = observations[0].observed_at.slice(0, 10);
  const last = latest.observed_at.slice(0, 10);

  return (
    <div className="shell page-shell offer-product-page">
      <header className="page-header offer-product-header">
        <p className="eyebrow"><Link href="/">Home</Link> · <Link href={`/price-history/${entry.slug}/`}>{entry.shortName} prices</Link></p>
        <div className="product-heading-row"><div><h1>{product.model}</h1><p className="product-title">{product.mpn}</p></div><span className="status-badge">Observed retail evidence</span></div>
        <p>{product.manufacturer} · {product.capacity_gb}GB ({product.module_count}×{product.capacity_gb / product.module_count}GB) · {product.memory_type}-{product.speed_mt_s} · {product.form_factor}</p>
      </header>

      <section className="offer-evidence-summary" aria-label="Observation coverage">
        <div><span>Observed item prices</span><strong>{observations.length}</strong></div>
        <div><span>Retailers represented</span><strong>{retailers}</strong></div>
        <div><span>Coverage</span><strong>{first}—{last}</strong></div>
        <div><span>Price basis</span><strong>VAT included · delivery excluded</strong></div>
      </section>

      <section aria-labelledby="latest-offer-title">
        <div className="panel-heading"><div><p className="section-label">Latest retained observation</p><h2 id="latest-offer-title">The most recent price we actually saw.</h2></div></div>
        <div className="offer-grid offer-grid-single"><OfferCard dataset={entry.slug} product={product} observation={latest} /></div>
        <p className="offer-disclaimer">This is a dated observation, not a promise that the retailer still has the item or still displays this price. Follow the retailer link to check before purchasing.</p>
      </section>

      <RawObservationPlot observations={observations} title={`${product.mpn} raw price observations`} />

      <section className="method-panel" aria-labelledby="history-table-title">
        <div className="panel-heading"><div><p className="section-label">Evidence table</p><h2 id="history-table-title">Every released observation.</h2></div></div>
        <ObservationHistoryTable observations={observations} />
      </section>

      <section className="observation-basis-panel" aria-labelledby="basis-title">
        <div><p className="section-label">How to read this</p><h2 id="basis-title">Price facts without invented continuity.</h2></div>
        <div><p>Each row is tied to one exact MPN, one retailer and one observation time. Missing dates remain missing; dots are not joined and prices are not averaged across retailers.</p><p>Outbound links are ordinary source links. No commission or advertiser relationship is implied. The aggregate RAM index and explanatory research remain separately reviewed.</p></div>
      </section>
    </div>
  );
}
