import Link from "next/link";
import { formatGbpMinor, type RetailerComparisonDataset } from "@/lib/public-data";
import type { OfferMatrixRow } from "@/lib/public-offer-view";

const formatObservedDate = (value: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London",
}).format(new Date(value));

export function OfferMatrix({
  dataset,
  comparison,
  rows,
}: {
  dataset: string;
  comparison: RetailerComparisonDataset;
  rows: OfferMatrixRow[];
}) {
  const populated = rows.reduce((count, row) => count + row.cells.filter((cell) => cell.observation).length, 0);
  return (
    <section className="offer-matrix-section" aria-labelledby="offer-matrix-title">
      <div className="panel-heading">
        <div>
          <p className="section-label">Exact-MPN retailer comparison</p>
          <h2 id="offer-matrix-title">Compare exact MPNs by retailer.</h2>
        </div>
        <span className="capture-date">{populated} populated pairs</span>
      </div>
      <p className="method-lede">Each price is the latest qualifying released observation for that exact MPN and retailer. A blank does not mean unavailable; it means no qualifying observation has been released for that pair.</p>
      <p className="offer-matrix-scroll-hint" id="offer-matrix-scroll-hint">Scroll horizontally to compare retailers.</p>
      <div className="table-scroll offer-matrix-scroll" role="region" aria-labelledby="offer-matrix-title" aria-describedby="offer-matrix-scroll-hint" tabIndex={0}>
        <table className="offer-matrix">
          <caption>Latest released factual offer by exact MPN and approved retailer; dated observations, not live checkout prices.</caption>
          <thead>
            <tr>
              <th scope="col">Exact MPN</th>
              {comparison.retailers.map((retailer) => <th scope="col" key={retailer.retailer_id}>{retailer.display_name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, cells }) => (
              <tr key={product.mpn}>
                <th scope="row">
                  <Link href={`/price-history/${dataset}/${product.mpn}/`}>{product.mpn}</Link>
                  <span>{product.manufacturer} · {product.speed_mt_s} MT/s</span>
                </th>
                {cells.map(({ retailer, observation }) => (
                  <td key={retailer.retailer_id} className={observation ? "has-observation" : "is-empty"}>
                    {observation ? (
                      <a
                        href={observation.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${product.mpn} at ${retailer.display_name}: ${formatGbpMinor(observation.item_price_minor)}, observed ${formatObservedDate(observation.observed_at)}; ${observation.observation_kind === "archived_retail_observation" ? "open archived snapshot" : "visit retailer"}`}
                      >
                        <strong>{formatGbpMinor(observation.item_price_minor)}</strong>
                        <time dateTime={observation.observed_at}>{formatObservedDate(observation.observed_at)}</time>
                        <span>{observation.observation_kind === "archived_retail_observation" ? "Open archived snapshot ↗" : "Visit retailer ↗"}</span>
                      </a>
                    ) : <span className="matrix-empty" aria-label={`${comparison.absence_label} for ${product.mpn} at ${retailer.display_name}`}>—<span className="sr-only"> {comparison.absence_label}</span></span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
