import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Why Silicon Forecast is building transparent UK PC component price history.",
};

export default function Page() {
  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">About Silicon Forecast</p>
        <h1>Component pricing deserves a memory—and some provenance.</h1>
        <p>
          Silicon Forecast is an independent UK project making PC component price movements
          clearer, reproducible and honest about their limitations.
        </p>
      </header>

      <section className="content-grid">
        <div><p className="eyebrow">Why it exists</p><h2>A price today is useful. Context is better.</h2></div>
        <div className="prose">
          <p>
            PC builders can find many current offers, but it is harder to see whether a price is
            genuinely unusual, how a comparable product class moved over time, or which market
            events may have contributed.
          </p>
          <p>
            We are starting with one deliberately narrow problem: building a dependable UK history
            for exact 32GB DDR5 desktop-memory kits, then testing possible explanations against the
            observed movement rather than writing the story first.
          </p>
        </div>
      </section>

      <section className="principles">
        <p className="eyebrow">Publishing principles</p>
        <div>
          {[
            ["Transparent methodology", "Definitions, versions and material changes should be visible."],
            ["Exact product identity", "Abstain from uncertain matches rather than publish confident nonsense."],
            ["Clear timestamps", "Every observation says when it was collected and whether it is a live or dated value."],
            ["Visible limitations", "Coverage gaps, exclusions and commercial relationships belong beside the numbers."],
          ].map(([heading, body]) => <article key={heading}><strong>{heading}</strong><p>{body}</p></article>)}
        </div>
      </section>

      <section className="content-grid">
        <div><p className="eyebrow">Current status</p><h2>Publishing evidence, not pretending the index is finished.</h2></div>
        <div className="prose">
          <p>
            Dated marketplace observations and direct unpaid source links are now public. No
            affiliate product feed is connected, and no supported UK retail index, recommendation
            or real-time comparison is being claimed.
          </p>
          <p>
            The next work is broader primary-retail evidence, deterministic index calculation and
            research notes that preserve sources, alternatives and uncertainty.
          </p>
          <Link href="/price-history">Inspect the first published observations →</Link><br />
          <Link href="/contact">Contact the project →</Link>
        </div>
      </section>
    </div>
  );
}
