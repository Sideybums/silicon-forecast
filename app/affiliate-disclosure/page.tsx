import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate disclosure",
  description: "How Silicon Forecast intends to use and disclose affiliate relationships.",
};

export default function Page() {
  return (
    <div className="shell page-shell legal-page">
      <header className="page-header">
        <p className="eyebrow">Affiliate disclosure</p>
        <h1>Commercial links should be labelled, not camouflaged.</h1>
        <p>
          Last updated 17 August 2026. Silicon Forecast publishes source links alongside selected
          factual retail observations and is building a retail-first UK component price record.
        </p>
      </header>

      <div className="notice">
        <strong>Current position</strong>
        <span>
          Published retailer source links are currently ordinary, uncompensated links. Silicon
          Forecast receives no commission from them and has no sponsored placements or active
          affiliate product feed. Any future affiliate link will be clearly labelled as such.
        </span>
      </div>

      <div className="legal-copy standalone">
        <section>
          <h2>How affiliate links may work</h2>
          <p>
            Silicon Forecast may later use clearly identified affiliate links. If a visitor
            follows one and makes a qualifying purchase, we may receive a commission from the
            retailer or affiliate network at no additional cost to the visitor.
          </p>
        </section>

        <section>
          <h2>Coverage is not completeness</h2>
          <p>
            Affiliate feeds represent participating programmes and merchant-supplied catalogues.
            They do not automatically represent every UK retailer, every eligible product or the
            complete market. Future price views will describe merchant, product and source
            coverage rather than implying universality.
          </p>
        </section>

        <section>
          <h2>Editorial and commercial separation</h2>
          <p>
            Commission arrangements will not change deterministic rules used to decide product
            eligibility or calculate any future index. Sponsored placement, if ever introduced,
            will be visibly labelled and kept separate from methodology-driven observations.
          </p>
        </section>

        <section>
          <h2>Applications and network status</h2>
          <p>
            Applications may be made to multiple affiliate networks and individual advertiser
            programmes. A network reference used for publisher ownership verification does not
            mean that the network has approved, endorsed or partnered with Silicon Forecast.
            Active commercial relationships will be disclosed when they actually exist.
          </p>
        </section>
      </div>
    </div>
  );
}
