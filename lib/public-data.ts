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

export type IndexPeriod = {
  period_id: string;
  state: string;
  index_milli: number | null;
  link_permille: number | null;
  change_permille: number | null;
  matched_product_count: number | null;
  dispersion_permille: { min: number | null; median: number | null; max: number | null };
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

const INDEX: Record<string, IndexDataset> = { ram: indexRam as IndexDataset };
const PRODUCTS: Record<string, ProductsDataset> = { ram: productsRam as ProductsDataset };
const EVENTS: Record<string, EventsDataset> = { ram: eventsRam as EventsDataset };

export function indexFor(dataset: string | null): IndexDataset | null {
  return dataset ? (INDEX[dataset] ?? null) : null;
}

export function productsFor(dataset: string | null): ProductsDataset | null {
  return dataset ? (PRODUCTS[dataset] ?? null) : null;
}

export function eventsFor(dataset: string | null): EventsDataset | null {
  return dataset ? (EVENTS[dataset] ?? null) : null;
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
