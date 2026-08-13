// The honest collection-start state, shown wherever a chart would go while the
// publication gate is closed.
//
// Lifted verbatim from the price-history page rather than rewritten, because
// this exact markup is what the site has been deploying and what has already
// been reviewed. When the gate is closed the public build must be
// indistinguishable from the one before this work existed.
export function EmptyStateChart({ id = "collection-chart" }: { id?: string }) {
  return (
    <div className="collection-chart-shell">
      <svg
        className="collection-chart"
        viewBox="0 0 1000 400"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        preserveAspectRatio="none"
      >
        <title id={`${id}-title`}>UK DDR5 index collection-start state</title>
        <desc id={`${id}-description`}>
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
      <div className="collection-scale-note" aria-hidden="true">
        Index scale
        <br />
        not active
      </div>
      <div className="collection-start-label" aria-hidden="true">
        <span>01</span> Collection started
      </div>
      <div className="collection-empty-message">
        <p className="collection-kicker">Evidence before numbers</p>
        <strong>No publishable index point exists.</strong>
        <p>The index scale begins only after the basket and baseline receive methodology approval.</p>
      </div>
    </div>
  );
}
