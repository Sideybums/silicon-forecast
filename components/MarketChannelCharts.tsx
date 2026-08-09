type SeriesPoint = {
  month: string;
  value: number;
};

const marketplaceSeries: SeriesPoint[] = [
  { month: "Jan", value: 100 },
  { month: "Feb", value: 102 },
  { month: "Mar", value: 108 },
  { month: "Apr", value: 104 },
  { month: "May", value: 112 },
  { month: "Jun", value: 116 },
  { month: "Jul", value: 110 },
  { month: "Aug", value: 114 },
];

const resaleSeries: SeriesPoint[] = [
  { month: "Jan", value: 100 },
  { month: "Feb", value: 96 },
  { month: "Mar", value: 92 },
  { month: "Apr", value: 95 },
  { month: "May", value: 89 },
  { month: "Jun", value: 86 },
  { month: "Jul", value: 88 },
  { month: "Aug", value: 84 },
];

const WIDTH = 360;
const HEIGHT = 176;
const LEFT = 18;
const RIGHT = 18;
const TOP = 18;
const BOTTOM = 28;
const MIN = 80;
const MAX = 120;

function MiniChart({
  id,
  series,
  description,
  trendSummary,
}: {
  id: string;
  series: SeriesPoint[];
  description: string;
  trendSummary: string;
}) {
  const chartWidth = WIDTH - LEFT - RIGHT;
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => LEFT + (index * chartWidth) / (series.length - 1);
  const y = (value: number) => TOP + ((MAX - value) / (MAX - MIN)) * chartHeight;
  const points = series.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `${LEFT},${y(MIN)} ${points} ${WIDTH - RIGHT},${y(MIN)}`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{description}</title>
      <desc id={`${id}-description`}>
        {trendSummary} Synthetic demonstration series, rebased to 100 in January. It is not observed market
        data.
      </desc>
      {[80, 100, 120].map((value) => (
        <g key={value}>
          <line className="channel-grid-line" x1={LEFT} y1={y(value)} x2={WIDTH - RIGHT} y2={y(value)} />
          <text className="channel-axis-label" x={LEFT} y={y(value) - 5}>
            {value}
          </text>
        </g>
      ))}
      <polygon className="channel-chart-area" points={area} />
      <polyline className="channel-chart-line" points={points} />
      {series.map((point, index) => (
        <circle
          className="channel-chart-point"
          cx={x(index)}
          cy={y(point.value)}
          key={point.month}
          r="3.5"
        />
      ))}
      <text className="channel-axis-label" x={LEFT} y={HEIGHT - 8}>
        Jan
      </text>
      <text className="channel-axis-label" textAnchor="end" x={WIDTH - RIGHT} y={HEIGHT - 8}>
        Aug
      </text>
    </svg>
  );
}

function AccessibleSeriesTable({
  caption,
  series,
}: {
  caption: string;
  series: SeriesPoint[];
}) {
  return (
    <details className="channel-data-table">
      <summary>View demonstration data</summary>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Index</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.month}</th>
              <td>{point.value.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function MarketChannelCharts() {
  return (
    <section className="market-lenses" id="market-lenses" aria-labelledby="market-lenses-title">
      <div className="market-lenses-heading">
        <div>
          <p className="eyebrow">Separate markets · Separate signals</p>
          <h2 id="market-lenses-title">One component. Three very different prices.</h2>
        </div>
        <p>
          The main index will follow comparable new-retail offers. Marketplace and second-hand prices will
          remain visible as supporting signals, but they will never quietly leak into the headline number.
        </p>
      </div>

      <div className="market-boundary" aria-label="How research will apply to each price series">
        <article className="market-boundary-primary">
          <span className="market-number">01</span>
          <div>
            <p className="market-tag">Headline measure</p>
            <h3>New retail index</h3>
            <p>
              Evidence-backed research and market events will be assessed against comparable new UK retail
              observations.
            </p>
          </div>
          <span className="market-evidence-badge">Planned research link</span>
        </article>
        <div className="market-boundary-secondary">
          <article>
            <span className="market-number">02</span>
            <div>
              <p className="market-tag">Supporting signal</p>
              <h3>Marketplace asks</h3>
              <p>Residual stock, imports, seller concentration and scarcity pricing.</p>
            </div>
          </article>
          <article>
            <span className="market-number">03</span>
            <div>
              <p className="market-tag">Supporting signal</p>
              <h3>Second-hand value</h3>
              <p>Completed private-market transactions, kept separate from professional recommerce asks.</p>
            </div>
          </article>
        </div>
      </div>

      <div className="secondary-chart-grid">
        <article className="channel-chart-card marketplace-card">
          <div className="channel-chart-heading">
            <div>
              <p className="market-tag">Marketplace · Asking prices</p>
              <h3>Marketplace asking-price movement</h3>
            </div>
            <span className="demo-pill">Demo series</span>
          </div>
          <MiniChart
            id="marketplace-demo"
            series={marketplaceSeries}
            description="Synthetic marketplace asking-price index"
            trendSummary="The demonstration rises from 100.0 in January to 114.0 in August."
          />
          <AccessibleSeriesTable
            caption="Synthetic marketplace asking-price demonstration"
            series={marketplaceSeries}
          />
          <p className="channel-chart-note">
            This proposed series will track professional third-party asks separately. A high asking price does
            not prove a sale or a mainstream retail price.
          </p>
        </article>

        <article className="channel-chart-card resale-card">
          <div className="channel-chart-heading">
            <div>
              <p className="market-tag">Second-hand · Completed sales</p>
              <h3>Private resale after the shop counter</h3>
            </div>
            <span className="demo-pill">Demo series</span>
          </div>
          <MiniChart
            id="resale-demo"
            series={resaleSeries}
            description="Synthetic second-hand completed-sale index"
            trendSummary="The demonstration falls from 100.0 in January to 84.0 in August."
          />
          <AccessibleSeriesTable
            caption="Synthetic private completed-sale demonstration"
            series={resaleSeries}
          />
          <p className="channel-chart-note">
            This proposed series will use completed private transactions, not hopeful listings. Professional
            recommerce asks will remain separate.
          </p>
        </article>
      </div>

      <div className="channel-rule">
        <strong>Important distinction</strong>
        <p>
          Research-backed news and causal commentary will attach to the new-retail index. Marketplace and
          resale charts will be descriptive market lenses unless their own evidence supports a separate
          conclusion.
        </p>
      </div>
    </section>
  );
}
