import type { PublicOfferObservation } from "@/lib/public-data";
import { formatGbpMinor } from "@/lib/public-data";

const formatObservedAt = (value: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London", timeZoneName: "short",
}).format(new Date(value));

export function ObservationHistoryTable({ observations }: { observations: PublicOfferObservation[] }) {
  return (
    <div className="table-scroll">
      <table className="period-table offer-history-table">
        <caption>Raw dated captures, newest first. Delivery is excluded and a retailer page may now show a different price or stock state.</caption>
        <thead><tr><th scope="col">Observed</th><th scope="col">Retailer</th><th scope="col">Item price</th><th scope="col">Availability then</th><th scope="col">Source</th></tr></thead>
        <tbody>{[...observations].reverse().map((item) => (
          <tr key={item.public_observation_id}>
            <th scope="row">{formatObservedAt(item.observed_at)}</th>
            <td>{item.retailer_name}</td>
            <td><strong>{formatGbpMinor(item.item_price_minor)}</strong><small> VAT incl.</small></td>
            <td>{item.availability === "in_stock" ? "In stock at capture" : "Available to order at capture"}</td>
            <td>
              {item.observation_kind === "archived_retail_observation" && <span className="table-source-kind">Archived snapshot</span>}
              <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                {item.observation_kind === "archived_retail_observation" ? "Open archived snapshot" : "Visit retailer"} ↗
              </a>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
