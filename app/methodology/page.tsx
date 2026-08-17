import type { Metadata } from "next";
import Link from "next/link";
import { components } from "@/lib/components-registry";
import { indexFor, productsFor } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How a future Silicon Forecast UK component price series must qualify observations, record parameters, preserve gaps and pass explicit publication gates.",
};

// Everything that used to sit between a reader and the chart lives here.
//
// The homepage is the graphs; this page is the argument behind them. That split
// is the point, so nothing on this page may be repeated elsewhere — a reader who
// finds the same claim in two places has no way of knowing which one is current.
// The site-content test enforces that: these strings appear in out/methodology/
// and nowhere else in the build.

const qualificationRules = [
  ["Retailer", "The seller owns the stock and is the retailer of record. A listing fulfilled by a third party through another shop's site is not an observation."],
  ["Identity", "The exact manufacturer part number matches a reviewed 32GB (2×16GB) DDR5 kit. A near-match is discarded, not approximated."],
  ["Price", "A VAT-inclusive landed price can be calculated for the fixed UK destination, including any mandatory delivery charge."],
  ["Availability", "The exact product is purchasable at collection time, not merely listed on a page."],
] as const;

const releaseGates = [
  ["Retail source coverage", "Blocked · source breadth", "Enough independent UK retailers that no single shop can move the published line."],
  ["Price normalisation", "Blocked · delivery rule", "VAT treatment and mandatory delivery resolved deterministically for every observation."],
  ["Basket review", "Awaiting approval", "Products, reserves and effective dates explicitly approved by a named person on a named date."],
  ["Replay verification", "Not run · no baseline", "The same retained observations reproduce the same series, byte for byte."],
] as const;

export default function Page() {
  const index = indexFor("ram");
  const products = productsFor("ram");
  const parameters = index?.parameters_public;

  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">Methodology</p>
        <h1>How a future public number must be built—and what remains unapproved.</h1>
        <p>
          Retained candidate observations are matched to exact manufacturer part numbers, but they are not all qualifying
          landed retail prices and no public index methodology is approved. This page states the rules a future public
          series must pass rather than claiming the private candidate already passes them.
        </p>
      </header>

      <section className="retail-methodology-panel" aria-labelledby="qualifies-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">01 · What would qualify as retail</p>
            <h2 id="qualifies-title">Four required checks before any future public price enters.</h2>
          </div>
          <Link href="/about">Why the rules matter →</Link>
        </div>
        <div className="qualification-grid">
          {qualificationRules.map(([heading, body], i) => (
            <article key={heading}>
              <span>0{i + 1}</span>
              <h3>{heading}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className="landed-price-rule">
          <strong>Comparison basis</strong>
          <p>VAT-inclusive landed price = item price + mandatory delivery to the fixed UK destination.</p>
        </div>
      </section>

      {parameters ? (
        <section className="method-panel" aria-labelledby="parameters-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">02 · Index parameters</p>
              <h2 id="parameters-title">The exact settings, as the generator recorded them.</h2>
            </div>
            <span className="status-badge status-badge-building">{parameters.approved ? "Approved" : "Unapproved"}</span>
          </div>
          <p className="method-lede">
            These values are copied straight out of the generated data rather than retyped, so the page cannot drift away
            from the series it describes.
          </p>
          <dl className="param-table">
            <div>
              <dt>frequency</dt>
              <dd>{parameters.frequency}</dd>
            </div>
            <div>
              <dt>formula</dt>
              <dd>{parameters.formula}</dd>
            </div>
            <div>
              <dt>minimum_matched_products_per_link</dt>
              <dd>{parameters.minimum_matched_products_per_link}</dd>
            </div>
            <div>
              <dt>reference_period</dt>
              <dd>{parameters.reference_period}</dd>
            </div>
            <div>
              <dt>reference_value</dt>
              <dd>{parameters.reference_value}</dd>
            </div>
            <div>
              <dt>weighting</dt>
              <dd>{parameters.weighting}</dd>
            </div>
            <div>
              <dt>gap_policy</dt>
              <dd>{parameters.gap_policy}</dd>
            </div>
            <div>
              <dt>approved</dt>
              <dd>{String(parameters.approved)}</dd>
            </div>
          </dl>
          <div className="method-basis">
            <h3>Why every product counts equally</h3>
            <p>{parameters.weighting_basis}</p>
            <h3>Why the line stops instead of bridging</h3>
            <p>{parameters.gap_policy_basis}</p>
          </div>
        </section>
      ) : null}

      {index ? (
        <section className="method-panel" aria-labelledby="coverage-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">03 · Coverage</p>
              <h2 id="coverage-title">What the evidence actually spans.</h2>
            </div>
          </div>
          <dl className="method-figures">
            <div>
              <dt>Quarters in the chain</dt>
              <dd>{index.coverage.observed_period_count}</dd>
              <p>
                {index.coverage.first_period} to {index.coverage.last_period}
              </p>
            </div>
            <div>
              <dt>Quarters with observations</dt>
              <dd>{index.coverage.total_periods_with_observations}</dd>
              <p>Every quarter in which at least one matched price was retained.</p>
            </div>
            <div>
              <dt>Quarters left outside the chain</dt>
              <dd>{index.coverage.periods_with_evidence_outside_chain}</dd>
              <p>Evidence exists, but too few products carried across for a link to be computed.</p>
            </div>
            <div>
              <dt>Products at the coverage floor</dt>
              <dd>{products?.product_count ?? 0}</dd>
              <p>
                {products
                  ? `At least ${products.floor.min_months} months and ${products.floor.min_sellers} retailers. ${products.excluded_below_floor_count} observed products fall below that floor and are not shown individually.`
                  : "No product series has been generated."}
              </p>
            </div>
          </dl>
          <p className="method-note">
            A quarter left outside the chain is not a quiet zero. It is drawn as a break in the line and named in the
            chart, because filling it would compare two non-adjacent quarters as though nothing had happened between them.
          </p>
        </section>
      ) : null}

      {products ? (
        <section className="method-panel" aria-labelledby="rebasing-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">04 · Per-product series</p>
              <h2 id="rebasing-title">Movement, not price.</h2>
            </div>
          </div>
          <p className="method-lede">
            A product page shows how far that product has moved from the first month we saw it, never what it costs. The
            rebasing basis is <code>{products.rebasing.basis}</code>, chosen by the {products.rebasing.selected_by} and
            recorded in the generated data rather than assumed by the page.
          </p>
          <p className="method-note">
            No amount in any currency is published anywhere on this site. That is a property of the generated data, not a
            habit of the page authors: the public projection carries index levels, relative changes, counts and editorial
            metadata, and the build fails if a money field reaches it.
          </p>
        </section>
      ) : null}

      <section className="retail-release-panel" aria-labelledby="release-gates-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">05 · Release gates</p>
            <h2 id="release-gates-title">What must be true before the series is published.</h2>
          </div>
          <span className="gate-count">0 / 4 passed</span>
        </div>
        <div className="release-gate-list">
          {releaseGates.map(([name, state, detail], i) => (
            <article key={name}>
              <span className="gate-number">0{i + 1}</span>
              <div>
                <h3>{name}</h3>
                <p>{detail}</p>
              </div>
              <span className="gate-state">{state}</span>
            </article>
          ))}
        </div>
        <footer className="release-footer">
          <p>
            The private candidate series is built and checked on every change. Publication activation is not implemented:
            repository configuration and review files cannot open the public boundary, and production deployment is locked.
          </p>
          <Link href="/price-history/">See what is being collected →</Link>
        </footer>
      </section>

      <section className="method-panel" aria-labelledby="events-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">06 · News and research markers</p>
            <h2 id="events-title">Timing is not cause.</h2>
          </div>
        </div>
        <p className="method-lede">
          A marker on the event line records that an article was published around the same period as a price movement. It
          is never a claim that the article explains the movement, and the wording beside every marker says so in those
          terms.
        </p>
        <ul className="method-list">
          <li>Every marker carries the article title, its author or an explicit statement that the publisher named none, the publisher and the publication date.</li>
          <li>Every marker links to the original. We quote no article body and reproduce no images; the credit and the traffic belong to whoever did the work.</li>
          <li>Movements with no reviewed explanation stay counted and visible. An empty rail means the research has not been done, not that nothing happened.</li>
        </ul>
        <Link href="/research/">Every source the site points at →</Link>
      </section>

      <section className="method-panel" aria-labelledby="scope-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">07 · Scope</p>
            <h2 id="scope-title">What each category covers.</h2>
          </div>
        </div>
        <dl className="method-figures">
          {components.map((entry) => (
            <div key={entry.slug}>
              <dt>{entry.name}</dt>
              <dd>{entry.dataset ? "Collecting" : "Not collecting"}</dd>
              <p>{entry.scopeNote}</p>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
