import type {
  PublicOfferObservation,
  PublicOfferProduct,
  PublicOffersDataset,
  RetailerComparisonDataset,
} from "@/lib/public-data";

export type SpotlightOffer = {
  label: string;
  product: PublicOfferProduct;
  observation: PublicOfferObservation;
};

export type OfferMatrixCell = {
  retailer: RetailerComparisonDataset["retailers"][number];
  observation: PublicOfferObservation | null;
};

export type OfferMatrixRow = {
  product: PublicOfferProduct;
  cells: OfferMatrixCell[];
};

const compareText = (left: string, right: string): number => left === right ? 0 : left < right ? -1 : 1;

function canonicalObservationOrder(a: PublicOfferObservation, b: PublicOfferObservation): number {
  return compareText(a.retailer_id, b.retailer_id)
    || compareText(a.public_observation_id, b.public_observation_id);
}

function chooseLatest(current: PublicOfferObservation | undefined, candidate: PublicOfferObservation): PublicOfferObservation {
  if (!current || candidate.observed_at > current.observed_at) return candidate;
  if (candidate.observed_at < current.observed_at) return current;
  return canonicalObservationOrder(candidate, current) < 0 ? candidate : current;
}

export function latestObservationByPair(offers: PublicOffersDataset): Map<string, PublicOfferObservation> {
  const result = new Map<string, PublicOfferObservation>();
  for (const observation of offers.observations) {
    const key = `${observation.mpn}\u0000${observation.retailer_id}`;
    result.set(key, chooseLatest(result.get(key), observation));
  }
  return result;
}

export function buildOfferMatrix(offers: PublicOffersDataset, comparison: RetailerComparisonDataset): OfferMatrixRow[] {
  const latest = latestObservationByPair(offers);
  return [...offers.products]
    .sort((a, b) => compareText(a.mpn, b.mpn))
    .map((product) => ({
      product,
      cells: comparison.retailers.map((retailer) => ({
        retailer,
        observation: latest.get(`${product.mpn}\u0000${retailer.retailer_id}`) ?? null,
      })),
    }));
}

export function selectSpotlightOffers(offers: PublicOffersDataset, comparison: RetailerComparisonDataset): SpotlightOffer[] {
  const byProduct = new Map<string, PublicOfferObservation>();
  for (const observation of offers.observations) {
    byProduct.set(observation.mpn, chooseLatest(byProduct.get(observation.mpn), observation));
  }
  const ranked = offers.products
    .flatMap((product) => {
      const observation = byProduct.get(product.mpn);
      return observation ? [{ product, observation }] : [];
    })
    .sort((a, b) => a.observation.item_price_minor - b.observation.item_price_minor
      || compareText(a.product.mpn, b.product.mpn)
      || canonicalObservationOrder(a.observation, b.observation));
  if (!ranked.length) return [];
  const indexes = Array.from(new Set([0, Math.floor((ranked.length - 1) / 2), ranked.length - 1]));
  const labels = indexes.length === 3
    ? comparison.spotlight_labels
    : indexes.map((_, index) => comparison.spotlight_labels[index === indexes.length - 1 ? 2 : index]);
  return indexes.map((rankedIndex, index) => ({ label: labels[index], ...ranked[rankedIndex] }));
}
