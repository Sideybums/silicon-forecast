import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ObservedPriceBoard } from "@/components/ObservedPriceBoard";

export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div>
          <p className="eyebrow">UK PC component price intelligence</p>
          <h1>See the price. Keep the evidence.</h1>
          <p className="hero-copy">
            Silicon Forecast is building an evidence-backed view of UK component prices over
            time—starting with exact 32GB DDR5 kits, dated observations and visible limitations.
          </p>
          <div className="button-row">
            <Link className="button primary" href="/price-history">
              View observed prices <span>→</span>
            </Link>
            <Link className="button secondary" href="/research">
              Read market notes
            </Link>
          </div>
        </div>
        <aside className="hero-status">
          <p className="eyebrow">Public research preview · 09 Aug 2026</p>
          <strong>Evidence is now public</strong>
          <dl>
            <div><dt>Market</dt><dd>United Kingdom</dd></div>
            <div><dt>First category</dt><dd>32GB DDR5 RAM</dd></div>
            <div><dt>Observed prices</dt><dd>3 dated offers</dd></div>
            <div><dt>Live feeds</dt><dd>Not connected</dd></div>
          </dl>
          <p>
            We publish bounded, dated observations with direct unpaid source links. They are not
            yet a supported retail index or a real-time comparison service.
          </p>
        </aside>
      </section>

      <section className="shell section">
        <div className="section-kicker"><span>01</span><p>Observed prices</p></div>
        <ObservedPriceBoard compact />
        <p className="after-chart">
          <Link href="/price-history">See the full evidence notes and market boundaries →</Link>
        </p>
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
              <li><span>01</span><div><strong>Observe</strong><p>Record exact products, sellers, prices and collection times.</p></div></li>
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
            evidence chain proves dependable.
          </p>
        </div>
        <CategoryGrid />
      </section>

      <section className="shell disclosure-band">
        <p className="eyebrow">Commercial transparency</p>
        <div>
          <h2>The links work. Nobody is paying us for them.</h2>
          <p>
            Current retailer links are direct, unpaid and untracked. If affiliate relationships
            are added later, they will be labelled without changing the evidence rules or
            pretending a participating retailer panel is the entire UK market.
          </p>
          <Link href="/affiliate-disclosure">Read the affiliate disclosure →</Link>
        </div>
      </section>
    </>
  );
}
