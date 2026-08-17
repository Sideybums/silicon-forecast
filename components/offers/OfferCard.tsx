import Link from "next/link";
import type { PublicOfferObservation, PublicOfferProduct } from "@/lib/public-data";
import { formatGbpMinor } from "@/lib/public-data";

const formatObservedAt = (value: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London", timeZoneName: "short",
}).format(new Date(value));

export function OfferCard({ dataset, product, observation }: { dataset: string; product: PublicOfferProduct; observation: PublicOfferObservation }) {
  const isArchived = observation.observation_kind === "archived_retail_observation";
  return (
    <article className="offer-card">
      <div className="offer-card-heading">
        <div><span>{product.manufacturer}</span><h3>{product.model}</h3></div>
        <div className="offer-capture-status">
          {isArchived && <span className="observation-kind-badge">Archived snapshot</span>}
          <span className="availability-badge">{observation.availability === "in_stock" ? "In stock at capture" : "Available to order at capture"}</span>
        </div>
      </div>
      <p className="offer-mpn">MPN <strong>{product.mpn}</strong></p>
      <div className="offer-price-row"><strong>{formatGbpMinor(observation.item_price_minor)}</strong><span>at {observation.retailer_name}</span></div>
      <p className="offer-basis">VAT included · delivery excluded · observed {formatObservedAt(observation.observed_at)}</p>
      <div className="offer-actions">
        <Link href={`/price-history/${dataset}/${product.mpn}/`}>View price history →</Link>
        <a href={observation.source_url} target="_blank" rel="noopener noreferrer">{isArchived ? "Open archived snapshot" : "Visit retailer"} <span className="sr-only">for {product.mpn}; captured price and availability may have changed</span> ↗</a>
      </div>
    </article>
  );
}
