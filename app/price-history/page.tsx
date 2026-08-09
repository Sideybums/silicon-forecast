import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "UK DDR5 retail price history",
  description: "Retail-first tracking status, methodology boundaries and release gates for the Silicon Forecast UK DDR5 price index.",
};

const qualificationRules = [
  ["Retailer", "The seller owns the stock and is the retailer of record."],
  ["Identity", "The exact manufacturer part number matches a reviewed 32GB (2×16GB) DDR5 kit."],
  ["Price", "A VAT-inclusive landed price can be calculated for the fixed UK destination."],
  ["Availability", "The exact product is purchasable at collection time, not merely listed."],
] as const;

const releaseGates = [
  ["Retail source coverage", "Blocked · source breadth", "Enough independent UK retailers to avoid a one-shop index."],
  ["Price normalisation", "Blocked · delivery rule", "VAT and mandatory delivery resolved deterministically."],
  ["Basket review", "Awaiting approval", "Products, reserves and effective dates explicitly approved."],
  ["Replay verification", "Not run · no baseline", "The same retained observations reproduce the same series."],
] as const;

export default function Page() {
  return (
    <div className="shell page-shell price-history-page">
      <header className="page-header price-history-header">
        <p className="eyebrow">UK DDR5 · Primary retail</p>
        <h1>One clean retail series.</h1>
        <p>
          This page is reserved for comparable UK retail prices for exact 32GB DDR5 desktop kits.
          The series remains unpublished until source coverage, landed-price rules and replay checks
          are strong enough to defend it.
        </p>
      </header>

      <section className="retail-status-panel" aria-labelledby="retail-status-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">01 · Retail tracking status</p>
            <h2 id="retail-status-title">Collection is active. Publication is not.</h2>
          </div>
          <span className="status-badge status-badge-building">Building evidence</span>
        </div>
        <div className="retail-status-grid">
          <div><span>Region</span><strong>United Kingdom</strong></div>
          <div><span>Specification</span><strong>32GB DDR5 · 2×16GB</strong></div>
          <div><span>Channel</span><strong>Retailer-owned stock</strong></div>
          <div><span>Published series</span><strong>Not released</strong></div>
        </div>
      </section>

      <section className="retail-history-panel" aria-labelledby="retail-history-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">02 · Retail price history</p>
            <h2 id="retail-history-title">Collection started. The index has not.</h2>
          </div>
          <span className="history-range">State 0 · Collecting evidence</span>
        </div>
        <div className="collection-chart-shell">
          <svg
            className="collection-chart"
            viewBox="0 0 1000 400"
            role="img"
            aria-labelledby="collection-chart-title collection-chart-description"
            preserveAspectRatio="none"
          >
            <title id="collection-chart-title">UK DDR5 index collection-start state</title>
            <desc id="collection-chart-description">
              Collection is under way, but no publishable index point or active index scale exists.
            </desc>
            <rect className="collection-chart-field" x="0" y="0" width="1000" height="400" />
            <g className="collection-chart-grid" aria-hidden="true">
              <line x1="0" y1="100" x2="1000" y2="100" />
              <line x1="0" y1="200" x2="1000" y2="200" />
              <line x1="0" y1="300" x2="1000" y2="300" />
              <line x1="250" y1="0" x2="250" y2="400" />
              <line x1="500" y1="0" x2="500" y2="400" />
              <line x1="750" y1="0" x2="750" y2="400" />
            </g>
            <g className="collection-start-marker" aria-hidden="true">
              <rect x="78" y="54" width="8" height="292" />
              <rect x="60" y="54" width="44" height="8" />
            </g>
          </svg>
          <div className="collection-scale-note" aria-hidden="true">Index scale<br />not active</div>
          <div className="collection-start-label" aria-hidden="true"><span>01</span> Collection started</div>
          <div className="collection-empty-message">
            <p className="collection-kicker">Evidence before numbers</p>
            <strong>No publishable index point exists.</strong>
            <p>The index scale begins only after the basket and baseline receive methodology approval.</p>
          </div>
        </div>
        <div className="history-diagnostics" aria-label="Index publication diagnostics">
          <div><span>Publishable points</span><strong>None · baseline unapproved</strong></div>
          <div><span>Index scale</span><strong>Inactive · begins after approval</strong></div>
          <div><span>Public scope</span><strong>Primary retail only</strong></div>
        </div>
      </section>

      <section className="retail-methodology-panel" aria-labelledby="retail-method-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">03 · What qualifies as retail</p>
            <h2 id="retail-method-title">Four checks before one price enters.</h2>
          </div>
          <Link href="/about">Why the rules matter →</Link>
        </div>
        <div className="qualification-grid">
          {qualificationRules.map(([heading, body], index) => (
            <article key={heading}>
              <span>0{index + 1}</span>
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

      <section className="retail-release-panel" aria-labelledby="release-gates-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">04 · Release gates</p>
            <h2 id="release-gates-title">What must be true before the first index point.</h2>
          </div>
          <span className="gate-count">0 / 4 passed</span>
        </div>
        <div className="release-gate-list">
          {releaseGates.map(([name, state, detail], index) => (
            <article key={name}>
              <span className="gate-number">0{index + 1}</span>
              <div><h3>{name}</h3><p>{detail}</p></div>
              <span className="gate-state">{state}</span>
            </article>
          ))}
        </div>
        <footer className="release-footer">
          <p>Research commentary starts only after a reproducible retail movement exists.</p>
          <Link href="/research">See the evidence workflow →</Link>
        </footer>
      </section>
    </div>
  );
}
