import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildOfferMatrix, selectSpotlightOffers } from "../lib/public-offer-view.ts";

const offers = JSON.parse(readFileSync("data/public-offers/offers-ram.v1.json", "utf8"));
const comparison = JSON.parse(readFileSync("data/public-offers/retailer-comparison-ram.v1.json", "utf8"));

test("comparison roster is the exact approved eight-retailer axis", () => {
  assert.deepEqual(comparison.retailers.map((retailer) => retailer.retailer_id), [
    "awd-it",
    "box-uk",
    "ccl",
    "currys",
    "kingston-memory-shop",
    "novatech",
    "overclockers-uk",
    "scan-computers",
  ]);
});

test("matrix creates every released-MPN and approved-retailer pair with honest blanks", () => {
  const matrix = buildOfferMatrix(offers, comparison);
  assert.equal(matrix.length, offers.products.length);
  assert.ok(matrix.every((row) => row.cells.length === comparison.retailers.length));
  const populated = matrix.flatMap((row) => row.cells).filter((cell) => cell.observation);
  assert.equal(populated.length, 8);
  assert.equal(matrix.flatMap((row) => row.cells).length - populated.length, 16);
  assert.ok(matrix.every((row) => row.cells.find((cell) => cell.retailer.retailer_id === "currys")?.observation === null));
});

test("matrix selects the latest released observation for each exact pair independent of input order", () => {
  const forward = buildOfferMatrix(offers, comparison);
  const reversed = buildOfferMatrix({ ...offers, observations: [...offers.observations].reverse() }, comparison);
  const tuples = (matrix) => matrix.map((row) => [row.product.mpn, row.cells.map((cell) => cell.observation?.public_observation_id ?? null)]);
  assert.deepEqual(tuples(reversed), tuples(forward));
});

test("spotlights are exactly three unique deterministic lower, middle and higher product observations", () => {
  const spotlights = selectSpotlightOffers(offers, comparison);
  assert.equal(spotlights.length, 3);
  assert.equal(new Set(spotlights.map((spotlight) => spotlight.product.mpn)).size, 3);
  assert.deepEqual(spotlights.map((spotlight) => spotlight.label), comparison.spotlight_labels);
  assert.deepEqual(spotlights.map((spotlight) => spotlight.product.mpn), [
    "CMK32GX5M2B6000C36",
    "KF560C30BBEK2-32",
    "KF564C32RSK2-32",
  ]);
  assert.ok(spotlights[0].observation.item_price_minor <= spotlights[1].observation.item_price_minor);
  assert.ok(spotlights[1].observation.item_price_minor <= spotlights[2].observation.item_price_minor);
});

test("spotlights never fabricate or repeat cards when fewer than three products exist", () => {
  const oneProduct = { ...offers, products: offers.products.slice(0, 1), observations: offers.observations.filter((observation) => observation.mpn === offers.products[0].mpn) };
  const spotlights = selectSpotlightOffers(oneProduct, comparison);
  assert.equal(spotlights.length, 1);
  assert.equal(spotlights[0].label, "Higher retained observation");
});
