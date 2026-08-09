import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObservedPriceBoard } from "@/components/ObservedPriceBoard";
import { categories } from "@/lib/site";

export function generateStaticParams() {
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((candidate) => candidate.slug === slug);
  return category ? {
    title: category.name,
    description: `${category.name} price-history coverage status at Silicon Forecast.`,
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
        <strong>{isRam ? "Public observations available" : "Planned coverage"}</strong>
        <span>{isRam
          ? "Three dated professional-marketplace offers are published with exact MPNs, source links and limitations."
          : "This category has no tracked or published prices."}</span>
      </div>

      {isRam && <ObservedPriceBoard compact />}

      <section className="content-grid">
        <div><p className="eyebrow">Active scope</p><h2>Like-for-like before large numbers.</h2></div>
        <div className="prose">
          <p>{category.detail}</p>
          {isRam && <Link href="/price-history">View the full DDR5 observation record →</Link>}
        </div>
      </section>

      <section className="considerations">
        <p className="eyebrow">Comparison considerations</p>
        <div>{category.considerations.map((value, index) => <article key={value}><span>0{index + 1}</span><p>{value}</p></article>)}</div>
      </section>

      <section className="category-disclosure">
        <strong>Affiliate and coverage note</strong>
        <p>
          Current outbound offer links are unpaid and untracked. Future affiliate feeds would
          provide a panel of participating merchants, not automatic evidence of the complete UK
          retail market.
        </p>
        <Link href="/affiliate-disclosure">Full disclosure →</Link>
      </section>
    </div>
  );
}
