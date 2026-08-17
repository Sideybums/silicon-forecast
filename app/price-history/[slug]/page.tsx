import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparisonConsiderations } from "@/components/category/ComparisonConsiderations";
import { CategoryStatusPanel } from "@/components/category/CategoryStatusPanel";
import { WithheldHistoryPanel } from "@/components/category/WithheldHistoryPanel";
import { EventList } from "@/components/chart/EventLine";
import { IndexChart, IndexHeadline } from "@/components/chart/IndexChart";
import { ProductSparkline, monthDomain } from "@/components/chart/ProductSparkline";
import { componentFor, components } from "@/lib/components-registry";
import { categoryViewFor, formatIndex, formatPermilleChange } from "@/lib/public-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return components.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) return {};
  const view = categoryViewFor(entry);
  return {
    title: `${entry.name} price history research`,
    description: view.state === "public"
      ? `${entry.name} public price-history research at Silicon Forecast.`
      : view.state === "withheld"
      ? `${entry.name} price-history research at Silicon Forecast. No numerical series is publicly released.`
      : `${entry.name} coverage status at Silicon Forecast. Collection has not begun.`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = componentFor(slug);
  if (!entry) notFound();

  const view = categoryViewFor(entry);
  const bundle = view.state === "public" ? view.data : null;
  const index = bundle?.index ?? null;
  const products = bundle?.products ?? null;
  const events = bundle?.events ?? null;
  const domain = monthDomain(products?.products ?? []);
  const ranked = [...(products?.products ?? [])].sort(
    (a, b) => Math.abs(b.change_permille ?? 0) - Math.abs(a.change_permille ?? 0),
  );

  return (
    <div className="shell page-shell price-history-page">
      <header className="page-header price-history-header">
        <p className="eyebrow breadcrumb">
          <Link href="/">Home</Link> · <Link href={`/categories/${entry.slug}/`}>{entry.shortName}</Link> · Price history
        </p>
        <div className="product-heading-row">
          <div>
            <h1>{entry.name} price history</h1>
            <p>{entry.detail}</p>
          </div>
          <span className="status-badge status-badge-building">
            {view.state === "public" ? "Public series" : view.state === "withheld" ? "Research preview" : "Not collecting"}
          </span>
        </div>
      </header>

      <CategoryStatusPanel entry={entry} view={view} showWorkspaceLink={false} />

      {view.state === "uncollected" ? (
        <section className="uncollected-workspace" aria-labelledby="uncollected-title">
          <p className="section-label">Coverage state</p>
          <h2 id="uncollected-title">No observations collected for {entry.shortName}.</h2>
          <p>
            This is an honest empty state, not a launch promise. The same category template is ready, but collection scope,
            identity rules and governance must be defined before evidence enters it.
          </p>
        </section>
      ) : bundle && index ? (
        <>
          <IndexHeadline dataset={index} />
          <IndexChart dataset={index} events={events} title={`UK ${entry.scopeNote} index by quarter`} describedBy={`${entry.slug}-index-desc`} />
        </>
      ) : (
        <WithheldHistoryPanel entry={entry} />
      )}

      {bundle && index ? (
        <section className="method-panel" aria-labelledby="periods-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">Coverage by quarter</p>
              <h2 id="periods-title">Where the evidence is present—and where it stops.</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table className="period-table">
              <caption>Unavailable comparisons remain unavailable; they are never interpolated or carried forward.</caption>
              <thead><tr><th scope="col">Quarter</th><th scope="col">Index</th><th scope="col">Change</th><th scope="col">Matched</th><th scope="col">Products seen</th></tr></thead>
              <tbody>
                {index.periods.map((period) => (
                  <tr key={period.period_id} data-state={period.state}>
                    <th scope="row">{period.period_id}</th>
                    <td>{period.index_milli === null ? "no comparison" : formatIndex(period.index_milli)}</td>
                    <td>{formatPermilleChange(period.change_permille)}</td>
                    <td>{period.matched_product_count ?? "—"}</td>
                    <td>{period.distinct_products_in_period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="research-rail" aria-labelledby="research-title">
        <div>
          <p className="section-label">News and research</p>
          <h2 id="research-title">{view.state === "uncollected" ? "Context starts with evidence, not headlines." : "Context is reviewed separately from the numbers."}</h2>
          <p>
            {view.state === "uncollected"
              ? "Category research begins only after collection scope and evidence rules exist. A ready page is not evidence that work has started."
              : "Research can describe what was reported around a movement. It cannot rewrite an observation, fill a gap or turn timing into proof of cause."}
          </p>
          <Link href="/research/">Open the research desk →</Link>
        </div>
        <div>
          {events ? <EventList events={events} /> : (
            <div className="research-empty-state">
              <span>Editorial state</span>
              <strong>{view.state === "uncollected" ? "No category research underway" : "No reviewed explanations published"}</strong>
              <p>{view.state === "uncollected" ? "No news or explanatory work is implied for this category." : "Potential context is not published until its claims, sources, alternatives and wording receive human review."}</p>
            </div>
          )}
        </div>
      </section>

      {products ? (
        <section className="method-panel" aria-labelledby="products-title">
          <div className="panel-heading"><div><p className="section-label">Products</p><h2 id="products-title">{products.product_count} exact products followed individually.</h2></div></div>
          <p className="method-lede">Each line is one exact part number and describes movement rather than a monetary selling price.</p>
          <ul className="product-list">
            {ranked.map((product) => (
              <li key={product.mpn}>
                <Link href={`/price-history/${entry.slug}/${product.mpn}/`}>
                  <strong>{product.mpn}</strong>
                  <ProductSparkline product={product} domain={domain} label={false} />
                  <span className="product-list-meta">{formatPermilleChange(product.change_permille)} · {product.month_count} months</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="retail-methodology-panel" aria-labelledby="qualification-title">
        <div className="panel-heading"><div><p className="section-label">Evidence standard</p><h2 id="qualification-title">The comparison has to survive ordinary scrutiny.</h2></div><Link href="/methodology/">Full methodology status →</Link></div>
        <div className="qualification-grid">
          <article><span>01</span><h3>Same product</h3><p>Exact identifiers take priority. Ambiguous matches are rejected rather than guessed.</p></article>
          <article><span>02</span><h3>Comparable offer</h3><p>Stock state, seller responsibility and delivered-price treatment must be explicit.</p></article>
          <article><span>03</span><h3>Visible gaps</h3><p>Missing periods remain gaps. They are not backfilled, smoothed or borrowed from another model.</p></article>
          <article><span>04</span><h3>Reproducible release</h3><p>Published output must be tied to reviewable evidence and deterministic generated bytes.</p></article>
        </div>
      </section>

      <ComparisonConsiderations entry={entry} />

      <section className="release-summary" aria-labelledby="release-title">
        <div><p className="section-label">Release standard</p><h2 id="release-title">Finished presentation does not mean unreviewed publication.</h2></div>
        <div><p>The template is ready to carry a supported series. Numerical activation, methodology decisions, source approval and public claims remain separate governed decisions.</p><Link href="/about/">Why Silicon Forecast is being built →</Link></div>
      </section>
    </div>
  );
}
