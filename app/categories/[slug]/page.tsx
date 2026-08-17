import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { componentFor, components } from "@/lib/components-registry";
import { seriesIsPublic } from "@/lib/publication-gate";

// Kept because it is a linked, indexable route, but it is no longer where the
// data lives. Everything with a number on it is at /price-history/[slug]/; this
// page describes the category and sends the reader there.

export const dynamicParams = false;

export function generateStaticParams() {
  return components.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = componentFor(slug);
  return entry
    ? { title: entry.name, description: `${entry.name} coverage scope and price-history status at Silicon Forecast.` }
    : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) notFound();
  const hasPublicData = seriesIsPublic() && Boolean(entry.dataset);

  return (
    <div className="shell page-shell">
      <header className="category-header">
        <div>
          <p className="eyebrow">Component category</p>
          <h1>{entry.name}</h1>
          <p>{entry.summary}</p>
        </div>
        <div className="category-state">
          <span>{hasPublicData ? "Public observations available" : "No public observations released"}</span>
          <strong>{entry.scopeNote}</strong>
        </div>
      </header>

      {hasPublicData ? (
        <div className="notice">
          <strong>This category has observed price history</strong>
          <p>
            The series, its coverage limits and every product behind it are on the price-history page for this category.
          </p>
          <Link href={`/price-history/${entry.slug}/`}>Open the {entry.shortName} series →</Link>
        </div>
      ) : (
        <section className="no-data-card">
          <strong>No public observations released</strong>
          <p>
            Private candidate work is not a published series. There is no public chart, index or product history for this
            category, and this page will keep saying so until a separately governed release exists.
          </p>
        </section>
      )}

      <section className="content-grid">
        <div>
          <p className="eyebrow">Active scope</p>
          <h2>Like-for-like before large numbers.</h2>
        </div>
        <div className="prose">
          <p>{entry.detail}</p>
          <Link href={`/price-history/${entry.slug}/`}>Price history for {entry.shortName} →</Link>
        </div>
      </section>

      <section className="considerations">
        <p className="eyebrow">Comparison considerations</p>
        <div>
          {entry.considerations.map((value, i) => (
            <article key={value}>
              <span>0{i + 1}</span>
              <p>{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="category-disclosure">
        <strong>Affiliate and coverage note</strong>
        <p>
          No outbound product links are currently published. Future affiliate feeds would provide a panel of
          participating retailers, not automatic evidence of the complete UK market.
        </p>
        <Link href="/affiliate-disclosure">Full disclosure →</Link>
      </section>
    </div>
  );
}
