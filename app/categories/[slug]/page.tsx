import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryStatusPanel } from "@/components/category/CategoryStatusPanel";
import { ComparisonConsiderations } from "@/components/category/ComparisonConsiderations";
import { componentFor, components } from "@/lib/components-registry";
import { categoryViewFor, offersFor } from "@/lib/public-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return components.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = componentFor(slug);
  return entry ? { title: entry.name, description: `${entry.name} research scope and public coverage status at Silicon Forecast.` } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) notFound();
  const view = categoryViewFor(entry);
  const offers = offersFor(entry.dataset);

  return (
    <div className="shell page-shell category-landing">
      <header className="category-header category-product-header">
        <div>
          <p className="eyebrow"><Link href="/">Home</Link> · Component research</p>
          <h1>{entry.name}</h1>
          <p>{entry.summary}</p>
        </div>
        <div className="category-state">
          <span>{view.state === "public" ? "Public series available" : offers ? "Observed prices public" : view.state === "withheld" ? "Research programme active" : "Not collecting"}</span>
          <strong>{entry.scopeNote}</strong>
        </div>
      </header>

      <section className="category-proposition">
        <div>
          <p className="section-label">The product question</p>
          <h2>What changed—and are we comparing the same thing?</h2>
        </div>
        <div>
          <p>{entry.detail}</p>
          <p>Silicon Forecast separates evidence collection, numerical calculation and editorial explanation so one cannot quietly rewrite another.</p>
        </div>
      </section>

      <CategoryStatusPanel entry={entry} view={view} />

      <section className="category-workspace-link">
        <div>
          <p className="section-label">Canonical workspace</p>
          <h2>{entry.shortName} price history</h2>
          <p>{offers ? `Browse ${offers.observations.length} released dated observations across ${offers.products.length} exact products, with price history and retailer source links.` : view.state === "withheld" ? "Explore the research template, evidence standard and deliberately withheld chart region." : view.state === "public" ? "Open the dated category series, coverage gaps, exact-product histories and reviewed context." : "See the category template and why no collection is active."}</p>
        </div>
        <Link className="button-link" href={`/price-history/${entry.slug}/`}>Open {entry.shortName} workspace →</Link>
      </section>

      <ComparisonConsiderations entry={entry} />

      <section className="category-disclosure">
        <strong>No purchasing recommendation or complete-market ranking is published.</strong>
        <p>{offers ? "Outbound links identify the source retailer. They are ordinary, unpaid links unless explicitly labelled otherwise, and the observed price may have changed since capture." : "No outbound product links are published for this category."}</p>
        <Link href="/affiliate-disclosure/">Read the disclosure →</Link>
      </section>
    </div>
  );
}
