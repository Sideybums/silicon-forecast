// tests/historical-movement-explanations.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

test("the comparability review is additive, scoped and approves no production capability", async () => {
  const review = await readJson("data/reviews/historical-context-comparability-review-2026-08-10.json");
  assert.equal(review.status, "human_approved_additive_decision");
  assert.equal(review.scope, "context_layer_only");
  assert.equal(review.decisions.length, 3);
  const expectedGovernanceKeys = [
    "methodology_approved",
    "aggregation_rule_approved",
    "source_approved",
    "basket_approved",
    "reference_period_approved",
    "index_eligible",
    "production_eligible",
    "publication_eligible",
  ].sort();
  assert.deepEqual(Object.keys(review.governance).sort(), expectedGovernanceKeys);
  for (const [flag, value] of Object.entries(review.governance)) {
    assert.equal(value, false, `governance flag ${flag} must be false`);
  }
  for (const decision of review.decisions) {
    assert.ok(decision.rationale.length > 0);
    assert.ok(decision.known_cost.length > 0);
    assert.ok(Array.isArray(decision.constraints) && decision.constraints.length > 0);
  }
});
