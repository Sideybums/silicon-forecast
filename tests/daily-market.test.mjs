import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import Ajv from "ajv";
import {
  buildDailyMarketDataset,
  calendarDayDistance,
  contiguousMonthlySegments,
  contiguousSegments,
  meanMinor,
  medianMinor,
  monthlyAveragePoints,
  pointsForRange,
  previousCalendarDayChangePermille,
  rangeStartDate,
} from "../lib/daily-market.ts";

const product = (mpn) => ({
  mpn,
  manufacturer: "Test",
  model: mpn,
  memory_type: "DDR5",
  capacity_gb: 32,
  module_count: 2,
  speed_mt_s: 6000,
  form_factor: "UDIMM",
});

const observation = ({ id, at, mpn, retailer, price, availability = "in_stock", kind = "direct_retail_observation" }) => ({
  public_observation_id: id,
  observed_at: at,
  observation_kind: kind,
  mpn,
  retailer_id: retailer,
  retailer_name: retailer.toUpperCase(),
  item_price_minor: price,
  currency: "GBP",
  vat_state: "included",
  availability,
  delivery_state: "excluded_not_verified",
  source_url: `https://${retailer}.example/${id}`,
});

function fixture(observations) {
  return {
    schema_version: 1,
    dataset_id: "ram",
    market: "GB",
    currency: "GBP",
    latest_observed_at: "2026-08-17T10:30:06Z",
    price_basis: "item price",
    labels: { observation: "test", price: "test", scope: "test" },
    products: [product("A"), product("B")],
    retailers: [
      { retailer_id: "r1", display_name: "R1" },
      { retailer_id: "r2", display_name: "R2" },
    ],
    observations,
  };
}

test("minor-unit median is deterministic and rounds an even half-penny midpoint up", () => {
  assert.equal(medianMinor([301, 100, 200]), 200);
  assert.equal(medianMinor([100, 101]), 101);
  assert.equal(medianMinor([100, 102]), 101);
  assert.throws(() => medianMinor([]), /no prices/u);
});

test("daily projection gives one retailer and one product one vote", () => {
  const data = buildDailyMarketDataset(fixture([
    observation({ id: "old-r1-a", at: "2026-08-17T08:00:00Z", mpn: "A", retailer: "r1", price: 10000 }),
    observation({ id: "new-r1-a", at: "2026-08-17T09:00:00Z", mpn: "A", retailer: "r1", price: 11000 }),
    observation({ id: "r2-a", at: "2026-08-17T09:30:00Z", mpn: "A", retailer: "r2", price: 13000 }),
    observation({ id: "r1-b", at: "2026-08-17T09:40:00Z", mpn: "B", retailer: "r1", price: 20000 }),
  ]));
  const [day] = data.points;
  assert.equal(day.observation_count, 3);
  assert.equal(day.products.find((item) => item.mpn === "A").median_minor, 12000);
  assert.equal(day.typical_minor, 16000);
  assert.equal(day.low_minor, 11000);
  assert.equal(day.high_minor, 20000);
  assert.equal(day.product_count, 2);
  assert.equal(day.coverage_permille, 1000);
  assert.equal(day.low_evidence[0].public_observation_id, "new-r1-a");
  assert.equal(day.high_evidence[0].public_observation_id, "r1-b");
});

test("non-stock and the configured placeholder price are quarantined from every statistic", () => {
  const data = buildDailyMarketDataset(fixture([
    observation({ id: "good", at: "2026-08-17T09:00:00Z", mpn: "A", retailer: "r1", price: 12000 }),
    observation({ id: "order", at: "2026-08-17T09:00:00Z", mpn: "B", retailer: "r1", price: 9000, availability: "available_to_order" }),
    observation({ id: "placeholder", at: "2026-08-17T09:00:00Z", mpn: "B", retailer: "r2", price: 9999999 }),
  ]));
  assert.equal(data.points[0].typical_minor, 12000);
  assert.equal(data.points[0].product_count, 1);
  assert.equal(data.points[0].coverage_permille, 500);
  assert.deepEqual(data.excluded, { not_in_stock_count: 1, sentinel_price_count: 1 });
});

test("Europe/London calendar dates are used at the midnight boundary", () => {
  const data = buildDailyMarketDataset(fixture([
    observation({ id: "bst", at: "2026-08-16T23:30:00Z", mpn: "A", retailer: "r1", price: 12000 }),
  ]));
  assert.equal(data.points[0].date, "2026-08-17");
});

test("range anchors are deterministic and contiguous segments never bridge missing days", () => {
  assert.equal(rangeStartDate("2026-08-17", "7D"), "2026-08-11");
  assert.equal(rangeStartDate("2026-08-17", "30D"), "2026-07-19");
  assert.equal(calendarDayDistance("2026-08-16", "2026-08-17"), 1);
  const base = fixture([
    observation({ id: "d1", at: "2026-08-13T09:00:00Z", mpn: "A", retailer: "r1", price: 10000 }),
    observation({ id: "d2", at: "2026-08-14T09:00:00Z", mpn: "A", retailer: "r1", price: 11000 }),
    observation({ id: "d4", at: "2026-08-16T09:00:00Z", mpn: "A", retailer: "r1", price: 12000 }),
    observation({ id: "d5", at: "2026-08-17T09:00:00Z", mpn: "A", retailer: "r1", price: 13000 }),
  ]);
  const data = buildDailyMarketDataset(base);
  assert.deepEqual(contiguousSegments(data.points).map((segment) => segment.map((point) => point.date)), [
    ["2026-08-13", "2026-08-14"],
    ["2026-08-16", "2026-08-17"],
  ]);
  assert.equal(pointsForRange(data, "7D").length, 4);
  assert.equal(previousCalendarDayChangePermille(data.points), 83);
});

test("ranges longer than 30 days use one deterministic average point per observed month", () => {
  assert.equal(meanMinor([100, 101]), 101);
  const data = buildDailyMarketDataset(fixture([
    observation({ id: "jan-a", at: "2026-01-02T09:00:00Z", mpn: "A", retailer: "r1", price: 10000 }),
    observation({ id: "jan-b", at: "2026-01-20T09:00:00Z", mpn: "B", retailer: "r1", price: 20000 }),
    observation({ id: "mar-a", at: "2026-03-02T09:00:00Z", mpn: "A", retailer: "r1", price: 30000 }),
  ]));
  const monthly = monthlyAveragePoints(data.points);
  assert.deepEqual(monthly.map((point) => ({ month: point.month, typical: point.typical_minor, days: point.daily_point_count })), [
    { month: "2026-01", typical: 15000, days: 2 },
    { month: "2026-03", typical: 30000, days: 1 },
  ]);
  assert.deepEqual(contiguousMonthlySegments(monthly).map((segment) => segment.map((point) => point.month)), [["2026-01"], ["2026-03"]]);
});

test("the committed factual-offer payload produces a sparse, source-bound daily dashboard", () => {
  const offers = JSON.parse(readFileSync("data/public-offers/offers-ram.v1.json", "utf8"));
  const data = buildDailyMarketDataset(offers);
  assert.equal(data.policy_id, "sf-daily-market-dashboard-v1");
  assert.equal(data.latest_date, new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(offers.latest_observed_at)));
  assert.equal(data.declared_products.length, offers.products.length);
  assert.ok(data.points.length >= 10);
  assert.ok(data.points.some((point) => point.capture_basis === "archive"));
  const approvedIds = new Set(offers.observations.map((item) => item.public_observation_id));
  for (const point of data.points) {
    assert.ok(point.typical_minor >= point.low_minor && point.typical_minor <= point.high_minor);
    for (const evidence of [...point.low_evidence, ...point.high_evidence]) {
      assert.ok(approvedIds.has(evidence.public_observation_id));
    }
  }
});

test("the committed dashboard payload is an exact replay bound to policy, schema, generator and input", () => {
  const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
  const sha256 = (value) => createHash("sha256").update(value).digest("hex");
  const offers = readJson("data/public-offers/offers-ram.v1.json");
  const committed = readJson("data/public-dashboard/daily-market-ram.v1.json");
  const manifest = readJson("data/public-dashboard/daily-market-ram.manifest.v1.json");
  assert.deepEqual(committed, buildDailyMarketDataset(offers));
  for (const binding of [manifest.generator, manifest.calculation_engine, manifest.policy, manifest.schema, manifest.input]) {
    assert.equal(binding.sha256, sha256(readFileSync(binding.path)), binding.path);
  }
  assert.equal(manifest.output.sha256, sha256(readFileSync(manifest.output.path)));
});

test("dashboard authority stays narrow while deployment, sources and formal methodology remain locked", () => {
  const policy = JSON.parse(readFileSync("config/daily-market-dashboard-policy.v1.json", "utf8"));
  assert.equal(policy.status, "approved_for_repository_publication");
  assert.equal(policy.quality.temporal_outlier_suppression, false);
  assert.deepEqual(policy.quality.excluded_exact_item_price_minor, [9999999]);
  assert.ok(Object.values(policy.unrelated_authorities).every((value) => value === false));
});

test("the dashboard payload passes its executable schema", () => {
  const schema = JSON.parse(readFileSync("schemas/daily-market-dashboard.v1.schema.json", "utf8"));
  const dashboard = JSON.parse(readFileSync("data/public-dashboard/daily-market-ram.v1.json", "utf8"));
  const validate = new Ajv({ allErrors: true }).compile(schema);
  assert.equal(validate(dashboard), true, JSON.stringify(validate.errors));
});

test("direction is suppressed when adjacent days contain different product sets", () => {
  const point = (date, typical_minor, mpns) => ({ date, typical_minor, products: mpns.map((mpn) => ({ mpn })) });
  assert.equal(previousCalendarDayChangePermille([
    point("2026-08-17", 10000, ["A"]),
    point("2026-08-18", 20000, ["B"]),
  ]), null);
  assert.equal(previousCalendarDayChangePermille([
    point("2026-08-17", 10000, ["A", "B"]),
    point("2026-08-18", 11000, ["B", "A"]),
  ]), 100);
});
