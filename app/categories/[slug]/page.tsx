import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@/lib/site";

export function generateStaticParams() {
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((candidate) => candidate.slug === slug);
  return category ? {
    title: category.name,
    description: `${category.name} retail price-history coverage status at Silicon Forecast.`,
  } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find((candidate) => candidate.slug === slug);
  if (!category) notFound();
  const isRam = category.slug === "ram";

  return (
    <div className="shell page-shell">
      <header className="category-header">
        <div>
          <p className="eyebrow">Component category</p>
          <h1>{category.name}</h1>
          <p>{category.summary}</p>
        </div>
        <div className="category-state"><span>{category.status}</span><strong>{category.marker}</strong></div>
      </header>

      <div className="notice">
        <strong>{isRam ? "Retail tracking in progress" : "Planned coverage"}</strong>
        <span>{isRam
          ? "Exact product identities are under review; no verified retail price series has been released."
          : "This category has no tracked or published retail prices."}</span>
      </div>

      {isRam && (
        <section className="category-tracking-panel" aria-labelledby="ram-tracking-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">Current tracking scope</p>
              <h2 id="ram-tracking-title">One specification. Clear boundaries.</h2>
            </div>
            <span className="status-badge status-badge-building">Evidence build</span>
          </div>
          <div className="category-tracking-grid">
            <article><span>Specification</span><strong>32GB · 2×16GB</strong><p>Desktop DDR5 UDIMM kits only.</p></article>
            <article><span>Monitored identities</span><strong>16 kits</strong><p>Exact-MPN control-plane pilot.</p></article>
            <article><span>Reviewed identities</span><strong>6 kits</strong><p>Fixture review, not retail eligibility.</p></article>
            <article><span>Published retail series</span><strong>None yet</strong><p>Coverage and methodology gates remain open.</p></article>
          </div>
          <Link href="/price-history">View retail tracking and release gates →</Link>
        </section>
      )}

      <section className="content-grid">
        <div><p className="eyebrow">Active scope</p><h2>Like-for-like before large numbers.</h2></div>
        <div className="prose">
          <p>{category.detail}</p>
          {isRam && <p>Retail observations must identify the exact kit, retailer-owned stock, VAT-inclusive landed price and purchasable state.</p>}
        </div>
      </section>

      <section className="considerations">
        <p className="eyebrow">Comparison considerations</p>
        <div>{category.considerations.map((value, index) => <article key={value}><span>0{index + 1}</span><p>{value}</p></article>)}</div>
      </section>

      <section className="category-disclosure">
        <strong>Affiliate and coverage note</strong>
        <p>
          No outbound product links are currently published. Future affiliate feeds would provide
          a panel of participating retailers, not automatic evidence of the complete UK market.
        </p>
        <Link href="/affiliate-disclosure">Full disclosure →</Link>
      </section>
    </div>
  );
}
