import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventList } from "@/components/chart/EventLine";
import { ProductSparkline } from "@/components/chart/ProductSparkline";
import { componentFor, trackedComponents } from "@/lib/components-registry";
import type { Product } from "@/lib/public-data";
import { eventsFor, formatPermilleChange, productFor, productsFor } from "@/lib/public-data";
import { seriesIsPublic } from "@/lib/publication-gate";

// One page per exact part number, but only when the series may be published.
//
// The gate is applied to generateStaticParams rather than to the page body, so a
// closed build renders no product at all. There is nothing to leak from a page
// that was never rendered, and nothing to forget to wrap.

export const dynamicParams = false;

// Next refuses to build a dynamic route that yields no paths under
// `output: export`, so the closed build cannot simply return nothing. It returns
// one path that resolves to no product, which makes the page call notFound() and
// emits a 404 document rather than a product page. No part number is rendered
// and no real product URL exists while the gate is shut.
const NO_PRODUCT = [{ slug: "ram", product: "not-published" }];

export function generateStaticParams() {
  if (!seriesIsPublic()) return NO_PRODUCT;
  return trackedComponents.flatMap((entry) =>
    (productsFor(entry.dataset)?.products ?? []).map((product) => ({ slug: entry.slug, product: product.mpn })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}): Promise<Metadata> {
  const { slug, product } = await params;
  const entry = componentFor(slug);
  if (!entry) return {};
  return {
    title: `${product} price movement`,
    description: `How the observed UK retail price of ${product} has moved since it first appeared, with its coverage and gaps stated.`,
  };
}

/**
 * The months between first and last observation where nothing was retained.
 *
 * These are stated rather than smoothed over. A reader looking at four points
 * across two years should be told it is four points across two years.
 */
function missingMonths(product: Product): string[] {
  if (!product.first_month || !product.last_month) return [];
  const seen = new Set(product.points.map((point) => point.month));
  const gaps: string[] = [];
  const [firstYear, firstMonth] = product.first_month.split("-").map(Number);
  const [lastYear, lastMonth] = product.last_month.split("-").map(Number);
  for (let cursor = firstYear * 12 + (firstMonth - 1); cursor <= lastYear * 12 + (lastMonth - 1); cursor += 1) {
    const label = `${Math.floor(cursor / 12)}-${String((cursor % 12) + 1).padStart(2, "0")}`;
    if (!seen.has(label)) gaps.push(label);
  }
  return gaps;
}

export default async function Page({ params }: { params: Promise<{ slug: string; product: string }> }) {
  const { slug, product: mpn } = await params;
  const entry = componentFor(slug);
  const product = entry ? productFor(entry.dataset, mpn) : null;
  if (!entry || !product) notFound();

  const events = eventsFor(entry.dataset);
  const gaps = missingMonths(product);
  const singleSellerMonths = product.points.filter((point) => point.single_seller).length;

  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">
          <Link href="/price-history/">Price history</Link> ·{" "}
          <Link href={`/price-history/${entry.slug}/`}>{entry.shortName}</Link>
        </p>
        <h1 className="product-title">{product.mpn}</h1>
        <p>
          One exact part number, followed from the first month it was observed at a UK retailer. The line below is
          movement relative to that first month, not a price.
        </p>
      </header>

      <figure className="product-figure">
        <ProductSparkline product={product} label={false} />
        <figcaption>
          <dl className="method-figures">
            <div>
              <dt>Change since first observed</dt>
              <dd className={(product.change_permille ?? 0) > 0 ? "is-higher" : "is-lower"}>
                {formatPermilleChange(product.change_permille)}
              </dd>
              <p>
                Measured from {product.first_month} to {product.last_month}.
              </p>
            </div>
            <div>
              <dt>Months with an observation</dt>
              <dd>{product.month_count}</dd>
              <p>{gaps.length} month{gaps.length === 1 ? "" : "s"} in that span have none.</p>
            </div>
            <div>
              <dt>Retailers seen</dt>
              <dd>{product.seller_count}</dd>
              <p>{product.multi_seller_month_count} months had more than one.</p>
            </div>
            <div>
              <dt>Single-retailer months</dt>
              <dd>{singleSellerMonths}</dd>
              <p>One shop&apos;s decision moves the line in these months.</p>
            </div>
          </dl>
          <p className="chart-caveat-unapproved">
            This is a research figure, not an approved statistic. It shows one product against its own history and says
            nothing about the market as a whole.
          </p>
        </figcaption>
      </figure>

      <section className="method-panel" aria-labelledby="points-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Every observation</p>
            <h2 id="points-title">The points behind the line.</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table className="period-table">
            <caption>
              Relative to the first observed month. A month absent from this table had no retained observation and is
              never interpolated.
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Relative to first month</th>
                <th scope="col">Retailers</th>
              </tr>
            </thead>
            <tbody>
              {product.points.map((point) => (
                <tr key={point.month} data-single-seller={point.single_seller ? "true" : "false"}>
                  <th scope="row">{point.month}</th>
                  <td>
                    {point.relative_permille === null
                      ? "—"
                      : formatPermilleChange(point.relative_permille - 1000)}
                  </td>
                  <td>{point.seller_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {gaps.length ? (
          <p className="method-note">
            No observation was retained for {gaps.join(", ")}.
          </p>
        ) : null}
      </section>

      {events ? (
        <section className="method-panel" aria-labelledby="product-events-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">News and research</p>
              <h2 id="product-events-title">Reported around these movements.</h2>
            </div>
            <Link href="/research/">All sources →</Link>
          </div>
          <p className="method-lede">
            Markers are reviewed against {entry.shortName} movements as a whole rather than against this product alone,
            so the counts below cover the whole dataset.
          </p>
          <EventList events={events} />
        </section>
      ) : null}

      <div className="page-nav-note">
        <p>How a product series is rebased, and why no price appears on this page.</p>
        <Link href="/methodology/">Read the methodology →</Link>
      </div>
    </div>
  );
}
