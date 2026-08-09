import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Research and market notes",
  description: "Evidence-backed research notes that investigate—not invent—possible explanations for UK PC component price movements.",
};

export default function Page() {
  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">Research and market notes</p>
        <h1>Movement first, explanation second.</h1>
        <p>
          Silicon Forecast will use manufacturer announcements, supply-chain research and credible
          reporting to investigate observed index swings. Research may support, qualify or
          contradict an explanation; timing alone does not prove causation.
        </p>
      </header>

      <div className="notice">
        <strong>Editorial boundary</strong>
        <span>
          Notes will preserve sources, uncertainty, alternative explanations and supporting and
          contradictory evidence. Commercial links never decide what counts as an explanation.
        </span>
      </div>

      <section className="research-note" id="marketplace-scarcity">
        <header>
          <div>
            <p className="eyebrow">Market note 001 · 09 August 2026</p>
            <h2>Marketplace scarcity is not the retail index.</h2>
          </div>
          <span className="research-state">Observed fact + interpretation</span>
        </header>
        <div className="research-note-grid">
          <div>
            <h3>What we observed</h3>
            <p>
              A bounded Amazon UK snapshot on 6 August recorded three exact-MPN professional
              marketplace offers between £450.94 and £527.08. The seller of record was not Amazon
              retail, and VAT or full landed-price treatment was not consistently established.
            </p>
          </div>
          <div>
            <h3>What it may indicate</h3>
            <p>
              High marketplace asks can be consistent with thin residual stock, specialist seller
              pricing or temporary scarcity. They can be useful signals for a coverage or
              availability investigation.
            </p>
          </div>
          <div>
            <h3>What it does not establish</h3>
            <p>
              This narrow snapshot does not show the representative UK retail price, a market-wide
              increase or a causal event. Broader retailer evidence and a reproducible time series
              are required before discussing an index swing.
            </p>
          </div>
          <div>
            <h3>Next evidence needed</h3>
            <p>
              Comparable primary-retail observations, exact landed prices, stock depth, product
              lifecycle evidence and independent reporting about any suspected supply event.
            </p>
          </div>
        </div>
        <footer>
          <Link href="/price-history">Inspect the dated observations and source links →</Link>
        </footer>
      </section>

      <section className="content-grid research-method">
        <div>
          <p className="eyebrow">Evidence workflow</p>
          <h2>How a future swing earns an explanation.</h2>
        </div>
        <ol className="research-steps">
          <li><span>01</span><div><strong>Detect</strong><p>A replayable index movement or coverage anomaly appears first.</p></div></li>
          <li><span>02</span><div><strong>Investigate</strong><p>Search primary announcements, credible reporting and counterevidence.</p></div></li>
          <li><span>03</span><div><strong>Separate</strong><p>Facts, temporal association and contributory hypotheses receive different labels.</p></div></li>
          <li><span>04</span><div><strong>Review</strong><p>A human approves the exact note and causal wording before publication.</p></div></li>
        </ol>
      </section>
    </div>
  );
}
