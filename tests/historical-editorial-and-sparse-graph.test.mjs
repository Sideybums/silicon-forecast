import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const anchorsPath = "research/evidence/historical-editorial-price-anchors-2026-08-10/anchors.v1.json";
const fixturePath = "data/fixtures/historical-exact-mpn-sparse-graph.v1.json";
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("editorial anchors keep exact-MPN and matched-spec evidence separate and locked", async () => {
  const bytes = await readFile(new URL(anchorsPath, root));
  assert.equal(sha256(bytes), "e94f8d7e8247ff684f6847687286b65ffbf17c6caecb22f95c4bcff36ae56548");
  const ledger = JSON.parse(bytes.toString("utf8"));
  assert.equal(ledger.status, "candidate_private_immutable");
  assert.equal(ledger.anchors.length, 5);
  assert.deepEqual(Object.values(ledger.governance), [false, false, false, false, false, false, false]);

  const exact = ledger.anchors.filter((item) => item.identity.basis === "exact_mpn");
  const matched = ledger.anchors.filter((item) => item.identity.basis === "matched_specification_only");
  assert.equal(exact.length, 3);
  assert.equal(matched.length, 2);
  for (const item of exact) assert.match(item.identity.mpn, /^[A-Z0-9-]+$/u);
  for (const item of matched) {
    assert.equal(item.identity.mpn, null);
    assert.equal(item.identity.abstention_reason, "article_does_not_state_exact_mpn");
  }
  for (const item of ledger.anchors) {
    assert.ok(item.price_statement.amount_minor > 0);
    assert.equal(item.source.http_status, 200);
    assert.match(item.source.response_sha256, /^[a-f0-9]{64}$/u);
    assert.equal(item.source.response_bytes_retained, false);
    assert.ok(item.minimal_quote.length > 20);
  }
});

test("sparse graph fixture resolves every point to an immutable observation and never invents continuity", async () => {
  const bytes = await readFile(new URL(fixturePath, root));
  assert.equal(sha256(bytes), "ae77e655ef8c4b3b9c9b1725a392170e5ea8a5fa405b6cd88d82e7941daff015");
  const fixture = JSON.parse(bytes.toString("utf8"));
  assert.equal(fixture.render_contract.mark, "point");
  assert.equal(fixture.render_contract.vat_state_must_be_visible, true);
  assert.equal(fixture.render_contract.vat_unresolved_points_must_not_be_compared_or_aggregated, true);
  for (const key of ["connect_points", "interpolate", "forward_fill", "backcast", "aggregate_across_products", "aggregate_across_sellers"])
    assert.equal(fixture.render_contract[key], false, `${key} must remain false`);
  assert.deepEqual(Object.values(fixture.governance), [false, false, false, false, false, false, false]);
  assert.equal(fixture.series.length, 6);

  let pointCount = 0;
  for (const series of fixture.series) {
    assert.ok(series.coverage_gaps.length > 0);
    const times = series.points.map((point) => point.observed_at);
    assert.deepEqual(times, [...times].sort());
    for (const point of series.points) {
      pointCount += 1;
      const artifact = await readJson(point.source_artifact);
      const source = artifact.observations.find((item) => item.observation_id === point.observation_id);
      assert.ok(source, `${point.observation_id} missing from ${point.source_artifact}`);
      const sourceMpn = source.identity?.mpn_observed ?? source.product?.mpn;
      const sourceAmount = source.item_price?.amount_minor ?? source.price?.item_price_minor;
      const sourceVat = source.item_price?.vat_state === "included" ? true : source.price?.vat_included;
      const sourceLandedAbstains = source.landed_price?.eligibility === "abstain" || source.eligibility?.landed_price_eligible === false;
      assert.equal(sourceMpn, series.mpn);
      assert.equal(source.observed_at, point.observed_at);
      assert.equal(sourceAmount, point.amount_minor);
      assert.equal(point.vat_included, sourceVat);
      assert.equal(sourceLandedAbstains, true);
    }
  }
  assert.equal(pointCount, 15);
});
