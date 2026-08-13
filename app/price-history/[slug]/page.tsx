import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyStateChart } from "@/components/EmptyStateChart";
import { EventList } from "@/components/chart/EventLine";
import { IndexChart, IndexHeadline } from "@/components/chart/IndexChart";
import { ProductSparkline } from "@/components/chart/ProductSparkline";
import { componentFor, components } from "@/lib/components-registry";
import { eventsFor, formatIndex, formatPermilleChange, formatPermilleRatio, indexFor, productsFor } from "@/lib/public-data";
import { seriesIsPublic } from "@/lib/publication-gate";

// One page per component category, generated from the registry.
//
// A category with no dataset is not a placeholder and not a promise. It renders
// the same page structure with a plain statement that nothing has been
// collected, because a category page that quietly implies future coverage is a
// claim we have not earned.

export const dynamicParams = false;

export function generateStaticParams() {
  return components.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) return {};
  return {
    title: `${entry.name} price history`,
    description: entry.dataset
      ? `Observed UK retail price history for ${entry.name.toLowerCase()}: index by quarter, coverage limits and the products behind it.`
      : `${entry.name} coverage status at Silicon Forecast. No observations have been collected.`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) notFound();

  const isPublic = seriesIsPublic();
  const index = indexFor(entry.dataset);
  const products = productsFor(entry.dataset);
  const events = eventsFor(entry.dataset);

  const ranked = [...(products?.products ?? [])].sort(
    (a, b) => Math.abs(b.change_permille ?? 0) - Math.abs(a.change_permille ?? 0),
  );

  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">
          <Link href="/price-history/">Price history</Link> · {entry.shortName}
        </p>
        <h1>{entry.name}</h1>
        <p>{entry.detail}</p>
      </header>

      {!entry.dataset || !index ? (
        <section className="no-data-card" aria-labelledby="no-data-title">
          <strong id="no-data-title">No observations collected</strong>
          <p>
            Nothing has been collected for this category, so there is no chart, no index and no product history. When
            collection begins, this page will show the same evidence as any other category — and until then it will keep
            saying so.
          </p>
        </section>
      ) : isPublic ? (
        <>
          <IndexHeadline dataset={index} />
          <IndexChart
            dataset={index}
            events={events}
            title={`UK ${entry.scopeNote} index by quarter`}
            describedBy={`${entry.slug}-index-desc`}
          />
        </>
      ) : (
        <>
          <div className="notice">
            <strong>Not yet published</strong>
            <p>
              The series for this category is derived and checked on every change, but no index point is published while
              the basket and baseline remain unapproved.
            </p>
          </div>
          <EmptyStateChart id={`${entry.slug}-collection-chart`} />
        </>
      )}

      {entry.dataset && index && isPublic ? (
        <section className="method-panel" aria-labelledby="periods-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">Coverage by quarter</p>
              <h2 id="periods-title">Where the evidence is thick, and where it runs out.</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table className="period-table">
              <caption>
                Matched products are those present in both this quarter and the one before it — the only ones a
                comparison can use. Spread is the range of individual product changes behind the quarter.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Quarter</th>
                  <th scope="col">Index</th>
                  <th scope="col">Change</th>
                  <th scope="col">Matched</th>
                  <th scope="col">Products seen</th>
                  <th scope="col">Spread</th>
                </tr>
              </thead>
              <tbody>
                {index.periods.map((period) => (
                  <tr key={period.period_id} data-state={period.state}>
                    <th scope="row">{period.period_id}</th>
                    <td>{period.index_milli === null ? "no comparison" : formatIndex(period.index_milli)}</td>
                    <td>{formatPermilleChange(period.change_permille)}</td>
                    <td>{period.matched_product_count ?? "—"}</td>
                    <td>{period.distinct_products_in_period}</td>
                    <td>
                      {period.dispersion_permille.min === null
                        ? "—"
                        : `${formatPermilleRatio(period.dispersion_permille.min)} – ${formatPermilleRatio(period.dispersion_permille.max)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {entry.dataset && events ? (
        <section className="method-panel" aria-labelledby="events-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">News and research</p>
              <h2 id="events-title">What was reported around these movements.</h2>
            </div>
            <Link href="/research/">All sources →</Link>
          </div>
          <EventList events={events} />
        </section>
      ) : null}

      {entry.dataset && products && isPublic ? (
        <section className="method-panel" aria-labelledby="products-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">Products</p>
              <h2 id="products-title">
                {products.product_count} products followed individually.
              </h2>
            </div>
          </div>
          <p className="method-lede">
            Each line is one exact part number and shows how far it has moved from the first month we saw it, not what it
            costs. {products.excluded_below_floor_count} further products were observed but fall below the coverage floor
            and are not shown.
          </p>
          <ul className="product-list">
            {ranked.map((product) => (
              <li key={product.mpn}>
                <Link href={`/price-history/${entry.slug}/${product.mpn}/`}>
                  <strong>{product.mpn}</strong>
                  <ProductSparkline product={product} label={false} />
                  <span className="product-list-meta">
                    <span className={(product.change_permille ?? 0) > 0 ? "is-higher" : "is-lower"}>
                      {formatPermilleChange(product.change_permille)}
                    </span>{" "}
                    · {product.month_count} months · {product.seller_count} retailers · {product.first_month} to{" "}
                    {product.last_month}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      <div className="page-nav-note">
        <p>How these figures are built, and what they cannot tell you.</p>
        <Link href="/methodology/">Read the methodology →</Link>
      </div>
    </div>
  );
}
