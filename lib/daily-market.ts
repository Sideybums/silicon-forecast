import type {
  PublicOfferObservation,
  PublicOfferProduct,
  PublicOffersDataset,
} from "@/lib/public-data";

export const DASHBOARD_POLICY_ID = "sf-daily-market-dashboard-v1";
export const DASHBOARD_TIME_ZONE = "Europe/London";
export const DASHBOARD_SENTINEL_PRICES_MINOR = new Set([9_999_999]);

export type DailyMarketRange = "7D" | "30D" | "3M" | "1Y" | "ALL";

export type DailyMarketEvidence = Pick<
  PublicOfferObservation,
  | "public_observation_id"
  | "observed_at"
  | "observation_kind"
  | "mpn"
  | "retailer_id"
  | "retailer_name"
  | "item_price_minor"
  | "source_url"
>;

export type DailyProductPrice = {
  mpn: string;
  median_minor: number;
  low_minor: number;
  high_minor: number;
  retailer_count: number;
};

export type DailyMarketPoint = {
  date: string;
  typical_minor: number;
  low_minor: number;
  high_minor: number;
  product_count: number;
  declared_product_count: number;
  retailer_count: number;
  observation_count: number;
  coverage_permille: number;
  capture_basis: "direct" | "archive" | "mixed";
  products: DailyProductPrice[];
  low_evidence: DailyMarketEvidence[];
  high_evidence: DailyMarketEvidence[];
};

export type DailyMarketDataset = {
  policy_id: typeof DASHBOARD_POLICY_ID;
  dataset_id: string;
  market: string;
  currency: "GBP";
  time_zone: typeof DASHBOARD_TIME_ZONE;
  first_date: string;
  latest_date: string;
  declared_products: PublicOfferProduct[];
  points: DailyMarketPoint[];
  excluded: {
    not_in_stock_count: number;
    sentinel_price_count: number;
  };
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function ukCalendarDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`invalid observation timestamp: ${timestamp}`);
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(parsed).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareObservation(a: PublicOfferObservation, b: PublicOfferObservation): number {
  return compareText(a.observed_at, b.observed_at)
    || compareText(a.public_observation_id, b.public_observation_id);
}

export function medianMinor(values: number[]): number {
  if (!values.length) throw new Error("cannot calculate a median of no prices");
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`invalid minor-unit price: ${value}`);
  }
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2) return ordered[middle];
  const lower = ordered[middle - 1];
  const upper = ordered[middle];
  // Equivalent to floor((lower + upper + 1) / 2), without overflowing
  // Number's safe-integer range when two individually safe values are added.
  const result = Math.floor(lower / 2)
    + Math.floor(upper / 2)
    + Math.floor(((lower % 2) + (upper % 2) + 1) / 2);
  if (!Number.isSafeInteger(result)) throw new Error("median exceeds the safe integer range");
  return result;
}

function toEvidence(observation: PublicOfferObservation): DailyMarketEvidence {
  return {
    public_observation_id: observation.public_observation_id,
    observed_at: observation.observed_at,
    observation_kind: observation.observation_kind,
    mpn: observation.mpn,
    retailer_id: observation.retailer_id,
    retailer_name: observation.retailer_name,
    item_price_minor: observation.item_price_minor,
    source_url: observation.source_url,
  };
}

export function buildDailyMarketDataset(offers: PublicOffersDataset): DailyMarketDataset {
  if (offers.currency !== "GBP") throw new Error("daily dashboard accepts GBP factual offers only");
  const productByMpn = new Map(offers.products.map((product) => [product.mpn, product]));
  if (!productByMpn.size) throw new Error("daily dashboard requires a declared factual-offer product roster");

  let notInStockCount = 0;
  let sentinelPriceCount = 0;
  const selected = new Map<string, PublicOfferObservation>();

  for (const observation of offers.observations) {
    if (!productByMpn.has(observation.mpn)) throw new Error(`observation references undeclared MPN: ${observation.mpn}`);
    if (observation.currency !== "GBP" || observation.vat_state !== "included") {
      throw new Error(`observation escaped the factual-offer monetary contract: ${observation.public_observation_id}`);
    }
    if (!Number.isSafeInteger(observation.item_price_minor) || observation.item_price_minor <= 0) {
      throw new Error(`invalid item price: ${observation.public_observation_id}`);
    }
    if (observation.availability !== "in_stock") {
      notInStockCount += 1;
      continue;
    }
    if (DASHBOARD_SENTINEL_PRICES_MINOR.has(observation.item_price_minor)) {
      sentinelPriceCount += 1;
      continue;
    }
    const date = ukCalendarDate(observation.observed_at);
    const key = `${date}\u0000${observation.mpn}\u0000${observation.retailer_id}`;
    const current = selected.get(key);
    if (!current || compareObservation(current, observation) < 0) selected.set(key, observation);
  }

  const byDate = new Map<string, PublicOfferObservation[]>();
  for (const observation of selected.values()) {
    const date = ukCalendarDate(observation.observed_at);
    const day = byDate.get(date) ?? [];
    day.push(observation);
    byDate.set(date, day);
  }

  const points = [...byDate.entries()].sort(([a], [b]) => compareText(a, b)).map(([date, observations]) => {
    observations.sort((a, b) => a.item_price_minor - b.item_price_minor
      || compareText(a.retailer_id, b.retailer_id)
      || compareObservation(a, b));
    const byProduct = new Map<string, PublicOfferObservation[]>();
    for (const observation of observations) {
      const product = byProduct.get(observation.mpn) ?? [];
      product.push(observation);
      byProduct.set(observation.mpn, product);
    }
    const products = [...byProduct.entries()].sort(([a], [b]) => compareText(a, b)).map(([mpn, productOffers]) => ({
      mpn,
      median_minor: medianMinor(productOffers.map((item) => item.item_price_minor)),
      low_minor: productOffers[0].item_price_minor,
      high_minor: productOffers.at(-1)!.item_price_minor,
      retailer_count: new Set(productOffers.map((item) => item.retailer_id)).size,
    }));
    const lowMinor = observations[0].item_price_minor;
    const highMinor = observations.at(-1)!.item_price_minor;
    const kinds = new Set(observations.map((item) => item.observation_kind));
    return {
      date,
      typical_minor: medianMinor(products.map((product) => product.median_minor)),
      low_minor: lowMinor,
      high_minor: highMinor,
      product_count: products.length,
      declared_product_count: productByMpn.size,
      retailer_count: new Set(observations.map((item) => item.retailer_id)).size,
      observation_count: observations.length,
      coverage_permille: Math.floor((products.length * 1000) / productByMpn.size),
      capture_basis: kinds.size > 1
        ? "mixed" as const
        : kinds.has("direct_retail_observation") ? "direct" as const : "archive" as const,
      products,
      low_evidence: observations.filter((item) => item.item_price_minor === lowMinor).map(toEvidence),
      high_evidence: observations.filter((item) => item.item_price_minor === highMinor).map(toEvidence),
    };
  });

  if (!points.length) throw new Error("daily dashboard has no qualifying observed days");
  return {
    policy_id: DASHBOARD_POLICY_ID,
    dataset_id: offers.dataset_id,
    market: offers.market,
    currency: "GBP",
    time_zone: DASHBOARD_TIME_ZONE,
    first_date: points[0].date,
    latest_date: points.at(-1)!.date,
    declared_products: [...offers.products].sort((a, b) => compareText(a.mpn, b.mpn)),
    points,
    excluded: { not_in_stock_count: notInStockCount, sentinel_price_count: sentinelPriceCount },
  };
}

function utcDay(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed)) throw new Error(`invalid calendar date: ${date}`);
  return parsed;
}

export function calendarDayDistance(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / 86_400_000);
}

export function rangeStartDate(latestDate: string, range: DailyMarketRange): string {
  if (range === "ALL") return "0000-01-01";
  const date = new Date(`${latestDate}T12:00:00Z`);
  if (range === "7D") date.setUTCDate(date.getUTCDate() - 6);
  if (range === "30D") date.setUTCDate(date.getUTCDate() - 29);
  if (range === "3M") date.setUTCMonth(date.getUTCMonth() - 3);
  if (range === "1Y") date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

export function pointsForRange(dataset: DailyMarketDataset, range: DailyMarketRange): DailyMarketPoint[] {
  const start = rangeStartDate(dataset.latest_date, range);
  return dataset.points.filter((point) => point.date >= start && point.date <= dataset.latest_date);
}

export type MonthlyMarketPoint = {
  month: string;
  date: string;
  typical_minor: number;
  daily_point_count: number;
  product_count: number;
  declared_product_count: number;
};

export function meanMinor(values: number[]): number {
  if (!values.length) throw new Error("cannot calculate an average of no prices");
  let total = 0;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`invalid minor-unit price: ${value}`);
    total += value;
    if (!Number.isSafeInteger(total)) throw new Error("average input sum exceeds the safe integer range");
  }
  return Math.floor(total / values.length + 0.5);
}

export function monthlyAveragePoints(points: DailyMarketPoint[]): MonthlyMarketPoint[] {
  const byMonth = new Map<string, DailyMarketPoint[]>();
  for (const point of points) {
    const month = point.date.slice(0, 7);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(point);
    byMonth.set(month, bucket);
  }
  return [...byMonth.entries()].sort(([a], [b]) => compareText(a, b)).map(([month, bucket]) => {
    const ordered = [...bucket].sort((a, b) => compareText(a.date, b.date));
    const products = new Set(ordered.flatMap((point) => point.products.map((product) => product.mpn)));
    return {
      month,
      date: ordered.at(-1)!.date,
      typical_minor: meanMinor(ordered.map((point) => point.typical_minor)),
      daily_point_count: ordered.length,
      product_count: products.size,
      declared_product_count: Math.max(...ordered.map((point) => point.declared_product_count)),
    };
  });
}

export function monthDistance(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

export function contiguousMonthlySegments(points: MonthlyMarketPoint[]): MonthlyMarketPoint[][] {
  const segments: MonthlyMarketPoint[][] = [];
  for (const point of points) {
    const current = segments.at(-1);
    if (!current || monthDistance(current.at(-1)!.month, point.month) !== 1) segments.push([point]);
    else current.push(point);
  }
  return segments;
}

export function contiguousSegments(points: DailyMarketPoint[]): DailyMarketPoint[][] {
  const segments: DailyMarketPoint[][] = [];
  for (const point of points) {
    const current = segments.at(-1);
    if (!current || calendarDayDistance(current.at(-1)!.date, point.date) !== 1) segments.push([point]);
    else current.push(point);
  }
  return segments;
}

export function previousCalendarDayChangePermille(points: DailyMarketPoint[]): number | null {
  if (points.length < 2) return null;
  const latest = points.at(-1)!;
  const previous = points.at(-2)!;
  if (calendarDayDistance(previous.date, latest.date) !== 1) return null;
  const latestProducts = latest.products.map((product) => product.mpn).sort();
  const previousProducts = previous.products.map((product) => product.mpn).sort();
  if (latestProducts.length !== previousProducts.length || latestProducts.some((mpn, index) => mpn !== previousProducts[index])) return null;
  return Math.round(((latest.typical_minor - previous.typical_minor) * 1000) / previous.typical_minor);
}
