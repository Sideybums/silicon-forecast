import type { Metadata } from "next";
import Link from "next/link";
import { ObservedPriceBoard } from "@/components/ObservedPriceBoard";

export const metadata: Metadata = {
  title: "Observed DDR5 prices",
  description: "Dated, evidence-backed UK DDR5 marketplace observations with direct unpaid source links and visible limitations.",
};

export default function Page() {
  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">Price observations · Public research preview</p>
        <h1>Real observations, properly qualified.</h1>
        <p>
          This page publishes a bounded set of exact-MPN UK marketplace observations. The prices
          and source links are real and dated; they are not current-price claims, a deal ranking
          or the UK retail index.
        </p>
      </header>

      <div className="notice warning">
        <strong>Dated evidence—not a live comparison</strong>
        <span>
          Retail pages can change after collection. Check the source before acting, and expect the
          current offer to differ from the observation shown here.
        </span>
      </div>

      <ObservedPriceBoard />

      <section className="content-grid">
        <div>
          <p className="eyebrow">Primary retail index</p>
          <h2>Why these prices are visible but excluded.</h2>
        </div>
        <div className="prose">
          <p>
            Every published offer in this snapshot came from a professional third-party seller on
            a marketplace. That makes it useful evidence of asking prices, residual stock or
            scarcity—but not evidence of the comparable primary-retail price.
          </p>
          <p>
            A qualifying retail index observation needs an exact product identity, a supported
            source, known VAT treatment, mandatory delivery to the fixed UK destination and a
            purchasable stock state. Unknown inputs remain unknown. Marketplace asking prices
            never enter the primary-retail index.
          </p>
        </div>
      </section>

      <section className="method-grid">
        {[
          ["Identity", "Only observations whose retained page title contained the exact MPN are published in this snapshot."],
          ["Channel", "Each offer is labelled as a professional marketplace ask rather than retailer-owned inventory."],
          ["Time", "The observation time remains attached so an old price cannot quietly masquerade as current."],
          ["Commercial status", "Every outbound source link is direct, unpaid and untracked. No commission is expected."],
        ].map(([heading, body], index) => (
          <article key={heading}>
            <span>0{index + 1}</span>
            <h3>{heading}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="limitations">
        <p className="eyebrow">What comes next</p>
        <h2>From observations to explainable movement.</h2>
        <ul>
          <li>Broader, independently sourced UK retail observations.</li>
          <li>Deterministic VAT, delivery, matching and coverage rules.</li>
          <li>A reviewed basket and replayable baseline before any supported index is published.</li>
          <li>Research notes that test possible explanations against the observed movement.</li>
        </ul>
        <Link href="/research">See how research will support future index swings →</Link>
      </section>
    </div>
  );
}
