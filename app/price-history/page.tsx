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
  ["Retail source coverage", "Pending", "Enough independent UK retailers to avoid a one-shop index."],
  ["Price normalisation", "Pending", "VAT and mandatory delivery resolved deterministically."],
  ["Basket review", "Pending", "Products, reserves and effective dates explicitly approved."],
  ["Replay verification", "Pending", "The same retained observations reproduce the same series."],
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
            <h2 id="retail-history-title">No verified retail series yet.</h2>
          </div>
          <span className="history-range">Base 100 · Daily · GBP</span>
        </div>
        <div className="retail-chart-empty" role="img" aria-label="Empty retail price history chart awaiting verified data">
          <div className="chart-axis chart-axis-y"><span>Index</span><i>110</i><i>100</i><i>90</i></div>
          <div className="chart-grid" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="chart-empty-message">
            <span className="chart-empty-mark">SF</span>
            <div>
              <strong>Retail history begins after the release gates pass.</strong>
              <p>We will not fill this space with sample prices that look suspiciously real.</p>
            </div>
          </div>
          <div className="chart-axis chart-axis-x"><span>Observation date</span></div>
        </div>
        <div className="history-explainer">
          <p><strong>What this will show</strong> A replayable daily index and its coverage state.</p>
          <p><strong>What it will not show</strong> Unsupported prices, rankings or recommendations.</p>
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
            <h2 id="release-gates-title">What must be true before the line appears.</h2>
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
