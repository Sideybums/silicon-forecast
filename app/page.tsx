import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryGrid";

export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div>
          <p className="eyebrow">UK PC component price intelligence</p>
          <h1>Retail prices, with the receipts.</h1>
          <p className="hero-copy">
            Silicon Forecast is building a reproducible view of UK component prices over time—
            starting with retailer-owned 32GB DDR5 kits and a deliberately narrow evidence chain.
          </p>
          <div className="button-row">
            <Link className="button primary" href="/price-history">
              View retail price history <span>→</span>
            </Link>
            <Link className="button secondary" href="/research">
              Read the research method
            </Link>
          </div>
        </div>
        <aside className="hero-status">
          <p className="eyebrow">Public research preview · Retail-first</p>
          <strong>Primary retail only</strong>
          <dl>
            <div><dt>Market</dt><dd>United Kingdom</dd></div>
            <div><dt>First category</dt><dd>32GB DDR5 RAM</dd></div>
            <div><dt>Retail series</dt><dd>In preparation</dd></div>
            <div><dt>Affiliate feeds</dt><dd>Not connected</dd></div>
          </dl>
          <p>
            We are validating retailer identity, exact MPNs, VAT, delivery and stock before a price
            series is released. No invented line dressed up as progress. Tempting, but no.
          </p>
        </aside>
      </section>

      <section className="shell section">
        <div className="section-kicker"><span>01</span><p>Retail index status</p></div>
        <div className="retail-home-panel">
          <div className="retail-home-heading">
            <div>
              <p className="eyebrow">First tracked specification</p>
              <h2>32GB DDR5 desktop kits.</h2>
            </div>
            <span className="status-badge status-badge-building">Retail series in preparation</span>
          </div>
          <div className="retail-home-grid">
            <article>
              <span>01</span>
              <strong>Identify</strong>
              <p>Match exact manufacturer part numbers. Approximate titles are not good enough.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Normalise</strong>
              <p>Resolve VAT, mandatory UK delivery, stock state and retailer-owned inventory.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Publish</strong>
              <p>Release a replayable retail series only when coverage and methodology gates pass.</p>
            </article>
          </div>
          <div className="retail-home-footer">
            <p>No verified retail series has been released yet.</p>
            <Link href="/price-history">See the tracking status and release gates →</Link>
          </div>
        </div>
      </section>

      <section className="ink-section">
        <div className="shell">
          <div className="section-kicker inverse"><span>02</span><p>The evidence chain</p></div>
          <div className="building-grid">
            <div>
              <p className="eyebrow">What makes this useful</p>
              <h2>Movement first. Explanation second. Evidence throughout.</h2>
              <p className="muted-light">
                Price intelligence should show what moved before looking for a convincing story.
                News, manufacturer announcements and supply research can then support, qualify or
                contradict an observed swing—never manufacture one.
              </p>
            </div>
            <ol className="process-list">
              <li><span>01</span><div><strong>Observe</strong><p>Record exact products, retailers, landed prices and collection times.</p></div></li>
              <li><span>02</span><div><strong>Calculate</strong><p>Apply deterministic rules and expose coverage gaps.</p></div></li>
              <li><span>03</span><div><strong>Investigate</strong><p>Attach reviewed research, alternatives and counterevidence.</p></div></li>
            </ol>
          </div>
          <div className="not-yet">
            <strong>Still deliberately withheld</strong>
            <span>Unsupported live index</span>
            <span>Automated recommendations</span>
            <span>Paid placement</span>
            <span>Invented coverage</span>
          </div>
        </div>
      </section>

      <section className="shell section">
        <div className="section-kicker"><span>03</span><p>Component categories</p></div>
        <div className="section-title">
          <div><p className="eyebrow">Coverage roadmap</p><h2>Start narrow. Earn the right to expand.</h2></div>
          <p>
            RAM is the active research category. GPUs, CPUs and SSDs follow only after the DDR5
            retail evidence chain proves dependable.
          </p>
        </div>
        <CategoryGrid />
      </section>

      <section className="shell disclosure-band">
        <p className="eyebrow">Commercial transparency</p>
        <div>
          <h2>Retail links will be useful before they are profitable.</h2>
          <p>
            No outbound product links are currently published. When verified retail observations
            are ready, direct unpaid links can appear before affiliate relationships exist. Any
            future commission will be labelled and will not alter inclusion or ranking.
          </p>
          <Link href="/affiliate-disclosure">Read the affiliate disclosure →</Link>
        </div>
      </section>
    </>
  );
}
