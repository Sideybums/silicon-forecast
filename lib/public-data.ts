// The single bridge between the generated public projection and the site.
//
// No logic and no derivation live here. Everything the app renders comes
// through this file, so there is exactly one place to look when asking what
// data the public site can possibly contain. The projection itself is generated
// and safety-checked by scripts/build-public-site-data.mjs and is scanned by
// the public boundary test on every run.
import indexRam from "@/data/public-projection/index-ram.v1.json";
import productsRam from "@/data/public-projection/products-ram.v1.json";
import eventsRam from "@/data/public-projection/events-ram.v1.json";
import offersRam from "@/data/public-offers/offers-ram.v1.json";
import type { ComponentEntry } from "@/lib/components-registry";
import { seriesIsPublic } from "@/lib/publication-gate";

export type IndexPeriod = {
  period_id: string;
  state: string;
  index_milli: number | null;
  link_permille: number | null;
  change_permille: number | null;
  matched_product_count: number | null;
  distinct_products_in_period: number;
  is_reference: boolean;
};

export type IndexDataset = {
  dataset_id: string;
  parameters_public: {
    frequency: string;
    formula: string;
    minimum_matched_products_per_link: number;
    reference_period: string;
    reference_value: number;
    weighting: string;
    weighting_basis: string;
    gap_policy: string;
    gap_policy_basis: string;
    approved: boolean;
  };
  coverage: {
    first_period: string;
    last_period: string;
    observed_period_count: number;
    periods_with_evidence_outside_chain: number;
    total_periods_with_observations: number;
  };
  summary: {
    latest_period: string | null;
    latest_index_milli: number | null;
    change_from_reference_permille: number | null;
    direction: string;
  };
  periods: IndexPeriod[];
};

export type ProductPoint = {
  month: string;
  relative_permille: number | null;
  seller_count: number;
  single_seller: boolean;
};

export type Product = {
  mpn: string;
  month_count: number;
  seller_count: number;
  multi_seller_month_count: number;
  first_month: string | null;
  last_month: string | null;
  change_permille: number | null;
  points: ProductPoint[];
};

export type ProductsDataset = {
  dataset_id: string;
  floor: { min_months: number; min_sellers: number };
  product_count: number;
  excluded_below_floor_count: number;
  rebasing: { basis: string; selected_by: string };
  products: Product[];
};

export type EventMarker = {
  marker_id: string;
  period_id: string | null;
  causal_language_level: string;
  source: { title: string; author: string; publisher: string; url: string; published_on: string };
};

export type EventsDataset = {
  dataset_id: string;
  markers: EventMarker[];
  movement_count: number;
  explained_movement_count: number;
  unexplained_movement_count: number;
  pending_reason: string | null;
};

export type PublicOfferProduct = {
  mpn: string;
  manufacturer: string;
  model: string;
  memory_type: string;
  capacity_gb: number;
  module_count: number;
  speed_mt_s: number;
  form_factor: string;
};

export type PublicOfferObservation = {
  public_observation_id: string;
  observed_at: string;
  observation_kind: "archived_retail_observation" | "direct_retail_observation";
  mpn: string;
  retailer_id: string;
  retailer_name: string;
  item_price_minor: number;
  currency: "GBP";
  vat_state: "included";
  availability: "in_stock" | "available_to_order";
  delivery_state: "excluded_not_verified";
  source_url: string;
};

export type PublicOffersDataset = {
  schema_version: number;
  dataset_id: string;
  market: string;
  currency: "GBP";
  latest_observed_at: string;
  price_basis: string;
  labels: { observation: string; price: string; scope: string };
  products: PublicOfferProduct[];
  retailers: Array<{ retailer_id: string; display_name: string }>;
  observations: PublicOfferObservation[];
};

const OFFER_DATASETS: Record<string, PublicOffersDataset> = {
  ram: offersRam as PublicOffersDataset,
};

export function offersFor(dataset: string | null): PublicOffersDataset | null {
  return dataset ? (OFFER_DATASETS[dataset] ?? null) : null;
}

export function offerProductFor(dataset: string | null, mpn: string): PublicOfferProduct | null {
  return offersFor(dataset)?.products.find((product) => product.mpn === mpn) ?? null;
}

export function offerHistoryFor(dataset: string | null, mpn: string): PublicOfferObservation[] {
  return (offersFor(dataset)?.observations ?? []).filter((observation) => observation.mpn === mpn);
}

export function latestOfferForProduct(dataset: string | null, mpn: string): PublicOfferObservation | null {
  const history = offerHistoryFor(dataset, mpn);
  return history.length ? history[history.length - 1] : null;
}

export function latestOffersByProduct(dataset: string | null): Array<{ product: PublicOfferProduct; observation: PublicOfferObservation }> {
  const offers = offersFor(dataset);
  if (!offers) return [];
  return offers.products.flatMap((product) => {
    const observation = latestOfferForProduct(dataset, product.mpn);
    return observation ? [{ product, observation }] : [];
  });
}

export function formatGbpMinor(amountMinor: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amountMinor / 100);
}

export type PublicDatasetBundle = {
  index: IndexDataset;
  products: ProductsDataset;
  events: EventsDataset;
};

const DATASETS: Record<string, PublicDatasetBundle> = {
  ram: {
    index: indexRam as IndexDataset,
    products: productsRam as ProductsDataset,
    events: eventsRam as EventsDataset,
  },
};

export type CategoryDataView =
  | { state: "uncollected" }
  | { state: "withheld" }
  | { state: "public"; data: PublicDatasetBundle };

/** Resolve category state once, without exposing private candidate contents. */
export function categoryViewFor(entry: ComponentEntry): CategoryDataView {
  if (entry.programme === "uncollected") return { state: "uncollected" };
  if (!seriesIsPublic()) return { state: "withheld" };
  const data = DATASETS[entry.dataset];
  if (!data) return { state: "withheld" };
  if (
    data.index.dataset_id !== entry.dataset
    || data.products.dataset_id !== entry.dataset
    || data.events.dataset_id !== entry.dataset
  ) return { state: "withheld" };
  return { state: "public", data };
}

export function indexFor(dataset: string | null): IndexDataset | null {
  return seriesIsPublic() && dataset ? (DATASETS[dataset]?.index ?? null) : null;
}

export function productsFor(dataset: string | null): ProductsDataset | null {
  return seriesIsPublic() && dataset ? (DATASETS[dataset]?.products ?? null) : null;
}

export function eventsFor(dataset: string | null): EventsDataset | null {
  return seriesIsPublic() && dataset ? (DATASETS[dataset]?.events ?? null) : null;
}

export function productFor(dataset: string | null, mpn: string): Product | null {
  return productsFor(dataset)?.products.find((p) => p.mpn === mpn) ?? null;
}

/** Index level as a display string. One decimal place, never two. */
export function formatIndex(milli: number | null): string {
  return milli === null ? "—" : (milli / 1000).toFixed(1);
}

/** A permille change as a signed percentage, to one decimal place. */
export function formatPermilleChange(permille: number | null): string {
  if (permille === null) return "—";
  const pct = permille / 10;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** A permille ratio as a multiple, e.g. 2596 -> "2.6x". */
export function formatPermilleRatio(permille: number | null): string {
  return permille === null ? "—" : `${(permille / 1000).toFixed(1)}x`;
}
