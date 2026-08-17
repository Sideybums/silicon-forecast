import type { Metadata } from "next";
import Link from "next/link";
import { components } from "@/lib/components-registry";
import { categoryViewFor } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Price history",
  description: "UK PC component price-history research status, beginning with DDR5 memory and showing clearly where no public series exists.",
};

// The dataset overview: what exists, how much of it, and where to go next.
//
// The route is unchanged because it is in the navigation, the footer and the
// sitemap, but the page no longer argues methodology at the reader. That lives
// at /methodology, and every claim about how the number is built is made there
// once.
export default function Page() {
  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">UK · Primary retail only</p>
        <h1>Component price-history workspaces.</h1>
        <p>
          RAM has an active research programme, but no numerical series has been publicly released. Working data,
          settings and movements remain outside this site; other categories state plainly whether research has begun.
        </p>
      </header>

      <section className="dataset-list" aria-label="Component datasets">
        {components.map((entry) => {
          const view = categoryViewFor(entry);
          const index = view.state === "public" ? view.data.index : null;
          const products = view.state === "public" ? view.data.products : null;
          const events = view.state === "public" ? view.data.events : null;

          if (view.state !== "public" || !index) {
            return (
              <article className="dataset-card is-empty" key={entry.slug}>
                <div className="dataset-card-head">
                  <h2>{entry.name}</h2>
                  <span className="dataset-state" data-status={view.state}>
                    {view.state === "withheld" ? "Active research · numerical series withheld" : "Not collecting"}
                  </span>
                </div>
                <p>{entry.detail}</p>
                <Link href={`/price-history/${entry.slug}/`}>{view.state === "withheld" ? "Open the research workspace" : "View the category state"} →</Link>
              </article>
            );
          }

          return (
            <article className="dataset-card" key={entry.slug}>
              <div className="dataset-card-head">
                <h2>{entry.name}</h2>
                <span className="dataset-state" data-status="tracking">
                  {entry.scopeNote}
                </span>
              </div>
              <p>{entry.detail}</p>
              <dl className="dataset-figures">
                <div>
                  <dt>Quarters of history</dt>
                  <dd>{index.coverage.observed_period_count}</dd>
                  <p>
                    {index.coverage.first_period} to {index.coverage.last_period}
                  </p>
                </div>
                <div>
                  <dt>Products followed individually</dt>
                  <dd>{products?.product_count ?? 0}</dd>
                  <p>Each seen for at least {products?.floor.min_months ?? 0} months across {products?.floor.min_sellers ?? 0} retailers.</p>
                </div>
                <div>
                  <dt>Movements measured</dt>
                  <dd>{events?.movement_count ?? 0}</dd>
                  <p>{events?.explained_movement_count ?? 0} have a reviewed explanation.</p>
                </div>
                <div>
                  <dt>Quarters with a break</dt>
                  <dd>{index.periods.filter((p) => p.index_milli === null).length}</dd>
                  <p>Too few products carried across for a comparison to mean anything.</p>
                </div>
              </dl>
              <Link href={`/price-history/${entry.slug}/`}>Open the {entry.shortName} series →</Link>
            </article>
          );
        })}
      </section>

      <div className="page-nav-note">
        <p>
          The required rules behind any future figures—what would qualify as a retail price, how an approved method would
          chain periods and whether weighting is justified—are stated in one place.
        </p>
        <Link href="/methodology/">Read the methodology →</Link>
      </div>
    </div>
  );
}
