import publication from "@/data/publications/ddr5-marketplace-observations-2026-08-09.v1.json";

type ObservedPriceBoardProps = {
  compact?: boolean;
};

const observedAt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/London",
}).format(new Date(publication.observation_time));

export function ObservedPriceBoard({ compact = false }: ObservedPriceBoardProps) {
  const observations = compact ? publication.observations.slice(0, 3) : publication.observations;

  return (
    <section className={`observed-board${compact ? " observed-board-compact" : ""}`} aria-labelledby="observed-prices-heading">
      <div className="observed-board-heading">
        <div>
          <p className="eyebrow">Marketplace · Asking prices</p>
          <h2 id="observed-prices-heading">Dated marketplace observations</h2>
        </div>
        <div className="observation-stamp">
          <span>Observation time</span>
          <strong>{observedAt}</strong>
          <small>Snapshot · not a live feed</small>
        </div>
      </div>

      <div className="price-card-grid">
        {observations.map((observation) => (
          <article className="price-card" key={observation.observation_key}>
            <div className="price-card-topline">
              <span>Professional third-party seller</span>
              <span>Unpaid link</span>
            </div>
            <h3>{observation.product_name}</h3>
            <p className="mpn">MPN {observation.mpn}</p>
            <div className="observed-price">
              <span>Observed asking price</span>
              <strong>£{observation.observed_price_gbp}</strong>
            </div>
            <dl className="offer-facts">
              <div><dt>Seller</dt><dd>{observation.seller}</dd></div>
              <div><dt>Status</dt><dd>{observation.availability}</dd></div>
            </dl>
            {!compact && (
              <details className="price-caveats">
                <summary>Evidence caveats</summary>
                <ul>{observation.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul>
              </details>
            )}
            <a
              className="offer-link"
              href={observation.source_url}
              target="_blank"
              rel="nofollow noreferrer"
              aria-label={`Open unpaid source link for ${observation.product_name}`}
            >
              Unpaid source link <span aria-hidden="true">↗</span>
            </a>
          </article>
        ))}
      </div>

      <div className="observation-boundary">
        <strong>Research boundary</strong>
        <p>
          These are dated observations, not current-price claims, deals or recommendations.
          Marketplace asking prices never enter the primary-retail index. VAT and delivery
          remain unresolved unless stated, and the links are unpaid and untracked.
        </p>
      </div>
    </section>
  );
}
