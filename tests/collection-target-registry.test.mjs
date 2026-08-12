import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const repo = new URL("../", import.meta.url);
const registry = JSON.parse(readFileSync(new URL("data/catalogue/collection-targets.v1.json", repo), "utf8"));

// A target filed under the wrong retailer would send the collector to one shop
// and record the answer against another, so the URL's host is pinned per seller.
const HOSTS = {
  "AWD-IT": "awd-it.co.uk",
  "CCL Online": "cclonline.com",
  Novatech: "novatech.co.uk",
  "Overclockers UK": "overclockers.co.uk",
  KingstonMemoryShop: "kingstonmemoryshop.co.uk",
};

test("every target is completely specified", () => {
  assert.ok(registry.targets.length > 0);
  assert.equal(registry.target_count, registry.targets.length);
  for (const t of registry.targets) {
    assert.match(t.mpn, /^[A-Z0-9][A-Z0-9._/-]{3,}$/u, `bad mpn: ${t.mpn}`);
    assert.ok(t.seller_display_name, "seller_display_name required");
    assert.match(t.url, /^https:\/\//u, `target url must be https: ${t.url}`);
    assert.ok(["active_collection", "archived_capture"].includes(t.provenance), `bad provenance: ${t.provenance}`);
    assert.ok(
      ["observed_live_by_canonical_collector", "unverified_pending_collector_check"].includes(t.url_state),
      `bad url_state: ${t.url_state}`,
    );
    assert.ok(Number.isInteger(t.collection_priority) && t.collection_priority >= 1 && t.collection_priority <= 6);
  }
});

test("each target's URL belongs to the retailer it is filed under", () => {
  for (const t of registry.targets) {
    const expected = HOSTS[t.seller_display_name];
    assert.ok(expected, `no known host for seller ${t.seller_display_name}`);
    const host = new URL(t.url).host.replace(/^www\./u, "");
    assert.equal(host, expected, `${t.mpn} filed under ${t.seller_display_name} but points at ${host}`);
  }
});

test("no retailer is asked for the same product twice", () => {
  const keys = registry.targets.map((t) => `${t.mpn}|${t.seller_display_name}`);
  assert.equal(new Set(keys).size, keys.length, "duplicate (mpn, seller) target");
});

test("targets already being collected are never dropped by a rebuild", () => {
  // These three are the only live-verified targets in the project. Losing one
  // silently would break the continuity of the only forward series that exists.
  const active = registry.targets.filter((t) => t.provenance === "active_collection");
  assert.equal(active.length, 3, "expected the three currently collected targets");
  const mpns = active.map((t) => t.mpn).sort();
  assert.deepEqual(mpns, ["F5-6000J3636F16GX2-FX5", "KF560C30BBEK2-32", "KF564C32RSK2-32"]);
  for (const t of active) {
    assert.equal(t.url_state, "observed_live_by_canonical_collector");
    assert.equal(t.collection_priority, 1, "live targets must sort first");
  }
});

test("archive-derived URLs are not presented as verified", () => {
  const archived = registry.targets.filter((t) => t.provenance === "archived_capture");
  assert.ok(archived.length > 0);
  for (const t of archived) {
    assert.equal(
      t.url_state,
      "unverified_pending_collector_check",
      "an archived URL must not claim to be live-verified without a collector fetch",
    );
  }
});

test("staleness stays visible on every target", () => {
  for (const t of registry.targets) {
    assert.match(t.last_observed_at, /^\d{4}-\d{2}-\d{2}T/u, `bad timestamp: ${t.last_observed_at}`);
    assert.equal(t.recently_seen, t.last_observed_at >= "2026-01");
  }
});

test("the registry disclaims being an index basket and approves nothing", () => {
  assert.match(registry.not_an_index_basket, /selects nothing/iu);
  assert.deepEqual(registry.governance, {
    source_approved: false,
    methodology_approved: false,
    basket_approved: false,
    index_eligible: false,
    production_eligible: false,
    publication_eligible: false,
  });
});

test("the registry materially widens collection beyond the three live targets", () => {
  assert.ok(registry.distinct_mpn_count >= 50, `only ${registry.distinct_mpn_count} distinct MPNs`);
  const highConfidence = registry.targets.filter((t) => t.collection_priority <= 4);
  assert.ok(highConfidence.length >= 30, `only ${highConfidence.length} recently-seen targets`);
  assert.ok(Object.keys(registry.targets_by_seller).length >= 4, "expected several retailers represented");
});
