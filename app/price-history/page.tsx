import type { Metadata } from "next";
import Link from "next/link";
import { components } from "@/lib/components-registry";
import { eventsFor, indexFor, productsFor } from "@/lib/public-data";
import { seriesIsPublic } from "@/lib/publication-gate";

export const metadata: Metadata = {
  title: "Price history",
  description: "Which UK PC component categories have observed price history, how far back it goes and what is still uncollected.",
};

// The dataset overview: what exists, how much of it, and where to go next.
//
// The route is unchanged because it is in the navigation, the footer and the
// sitemap, but the page no longer argues methodology at the reader. That lives
// at /methodology, and every claim about how the number is built is made there
// once.
export default function Page() {
  const isPublic = seriesIsPublic();

  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">UK · Primary retail only</p>
        <h1>What has been collected so far.</h1>
        <p>
          One category has observed price history. The rest are listed so their absence is a stated fact rather than a
          gap you have to notice. Nothing here is estimated, back-filled or carried across a period where the evidence
          ran out.
        </p>
      </header>

      {isPublic ? null : (
        <div className="notice">
          <strong>The series is built but not published</strong>
          <p>
            Collection and derivation run on every change, and the results are checked in and reviewable. No index point
            is published while the basket and baseline remain unapproved, so the charts below stay closed.
          </p>
        </div>
      )}

      <section className="dataset-list" aria-label="Component datasets">
        {components.map((entry) => {
          const index = indexFor(entry.dataset);
          const products = productsFor(entry.dataset);
          const events = eventsFor(entry.dataset);

          if (!entry.dataset || !index) {
            return (
              <article className="dataset-card is-empty" key={entry.slug}>
                <div className="dataset-card-head">
                  <h2>{entry.name}</h2>
                  <span className="dataset-state" data-status="planned">
                    No observations collected
                  </span>
                </div>
                <p>{entry.detail}</p>
                <Link href={`/price-history/${entry.slug}/`}>What would need to be true →</Link>
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
          Every rule behind these figures — what counts as a retail price, how quarters are chained, why nothing is
          weighted — is stated in one place.
        </p>
        <Link href="/methodology/">Read the methodology →</Link>
      </div>
    </div>
  );
}
