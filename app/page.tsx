import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryGrid";
import { EmptyStateChart } from "@/components/EmptyStateChart";
import { IndexChart, IndexHeadline } from "@/components/chart/IndexChart";
import { ProductSparkline, monthDomain } from "@/components/chart/ProductSparkline";
import { components } from "@/lib/components-registry";
import { eventsFor, indexFor, productsFor } from "@/lib/public-data";
import { seriesIsPublic } from "@/lib/publication-gate";

export const metadata = {
  title: "Silicon Forecast — UK PC component price trends",
  description: "Evidence-backed views of UK PC component prices over time. Primary retail only.",
};

// The homepage is the graphs. Methodology lives at /methodology for anyone who
// wants it; putting it here would bury the thing people actually came for.
export default function Home() {
  const isPublic = seriesIsPublic();
  const dataset = "ram";
  const index = indexFor(dataset);
  const events = eventsFor(dataset);
  const products = productsFor(dataset);

  // The largest movers, by size of move rather than by level, because there are
  // no levels here. Every sparkline is drawn on the dataset's full span, so a
  // product that stopped being observed shows an empty stretch rather than a
  // line that appears to run to today.
  const domain = monthDomain(products?.products ?? []);
  const movers = (products?.products ?? [])
    .filter((p) => p.change_permille !== null && p.month_count >= 8)
    .sort((a, b) => Math.abs(b.change_permille as number) - Math.abs(a.change_permille as number))
    .slice(0, 3);

  return (
    <>
      <section className="shell price-lead">
        <p className="eyebrow">UK · Primary retail only</p>
        <h1>Are component prices going up or down?</h1>
        <p className="hero-copy">
          Memory prices are tracked against exact manufacturer part numbers, so the line moves when prices move — not
          when the shops change what they stock. Retail series in preparation.
        </p>

        {isPublic && index ? (
          <>
            <IndexHeadline dataset={index} />
            <IndexChart dataset={index} events={events} title="UK 32GB DDR5 index by quarter" />
          </>
        ) : (
          <>
            <div className="notice">
              <strong>Not yet published</strong>
              <p>
                Collection is under way and the series is built and checked on every change, but no index point is
                published while the basket and baseline remain unapproved.
              </p>
            </div>
            <EmptyStateChart id="home-collection-chart" />
          </>
        )}

        {isPublic && movers.length ? (
          <div className="movers-strip">
            {movers.map((product) => (
              <article key={product.mpn}>
                <h3>
                  <Link href={`/price-history/${dataset}/${encodeURIComponent(product.mpn)}/`}>{product.mpn}</Link>
                </h3>
                <ProductSparkline product={product} domain={domain} />
                <p className="movers-meta">
                  {product.first_month} to {product.last_month} · {product.month_count} months ·{" "}
                  {product.seller_count} retailers
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="shell section">
        <div className="section-kicker">
          <span>02</span>
          <p>Component categories</p>
        </div>
        <CategoryGrid />
        <p className="after-chart">
          {isPublic ? `${components.filter((entry) => entry.dataset).length} of ${components.length} categories have public observations` : "No category has a public numerical series"} ·{" "}
          <Link href="/methodology/">How this is measured →</Link>
        </p>
      </section>
    </>
  );
}
