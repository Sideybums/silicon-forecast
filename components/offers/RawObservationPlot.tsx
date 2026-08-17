import type { PublicOfferObservation } from "@/lib/public-data";

const colours = ["#f6c85f", "#65c6c4", "#e88d67", "#8faadc", "#c89bd3", "#90be6d"];

export function RawObservationPlot({ observations, title }: { observations: PublicOfferObservation[]; title: string }) {
  if (!observations.length) return null;
  const width = 900;
  const height = 330;
  const margin = { top: 28, right: 28, bottom: 54, left: 72 };
  const times = observations.map((item) => Date.parse(item.observed_at));
  const prices = observations.map((item) => item.item_price_minor);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const timeSpan = Math.max(1, maxTime - minTime);
  const pricePad = Math.max(500, Math.round((maxPrice - minPrice) * 0.08));
  const low = Math.max(0, minPrice - pricePad);
  const high = maxPrice + pricePad;
  const priceSpan = Math.max(1, high - low);
  const retailers = [...new Set(observations.map((item) => item.retailer_name))].sort();
  const x = (time: number) => margin.left + ((time - minTime) / timeSpan) * (width - margin.left - margin.right);
  const y = (price: number) => height - margin.bottom - ((price - low) / priceSpan) * (height - margin.top - margin.bottom);
  const pounds = (minor: number) => `£${Math.round(minor / 100)}`;
  const date = (time: number) => new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(time));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <figure className="raw-observation-figure">
      <div className="raw-chart-heading"><div><p className="section-label">Observed item prices</p><h2>{title}</h2></div><div className="raw-chart-key"><p>Point colour identifies retailer; points are not a continuous series.</p><ul aria-label="Retailer point-colour legend">{retailers.map((retailer, index) => <li key={retailer}><span aria-hidden="true" style={{ backgroundColor: colours[index % colours.length] }} />{retailer}</li>)}</ul></div></div>
      <div className="raw-chart-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="raw-chart-title raw-chart-desc">
          <title id="raw-chart-title">{title}</title>
          <desc id="raw-chart-desc">Individual dated price observations shown as unconnected points. Missing dates are not interpolated.</desc>
          {ticks.map((tick) => {
            const price = low + (high - low) * tick;
            const cy = y(price);
            return <g key={`y-${tick}`}><line x1={margin.left} y1={cy} x2={width - margin.right} y2={cy} className="chart-grid-line" /><text x={margin.left - 12} y={cy + 4} textAnchor="end">{pounds(price)}</text></g>;
          })}
          {ticks.map((tick) => {
            const time = minTime + timeSpan * tick;
            const cx = x(time);
            return <g key={`x-${tick}`}><line x1={cx} y1={margin.top} x2={cx} y2={height - margin.bottom} className="chart-grid-line chart-grid-line-vertical" /><text x={cx} y={height - 20} textAnchor="middle">{date(time)}</text></g>;
          })}
          <g role="list" aria-label="Dated price observations">
          {observations.map((item) => {
            const colour = colours[retailers.indexOf(item.retailer_name) % colours.length];
            const label = `${item.retailer_name}: £${(item.item_price_minor / 100).toFixed(2)} captured ${item.observed_at}`;
            return <circle key={item.public_observation_id} role="listitem" aria-label={label} cx={x(Date.parse(item.observed_at))} cy={y(item.item_price_minor)} r="5" fill={colour}><title>{label}</title></circle>;
          })}
          </g>
        </svg>
      </div>
      <figcaption>Each dot is one retained observation for this exact MPN. Dots are deliberately not joined: the periods between captures are unobserved.</figcaption>
    </figure>
  );
}
