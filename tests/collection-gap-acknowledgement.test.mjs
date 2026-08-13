import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const repo = new URL("../", import.meta.url);
const ledger = JSON.parse(readFileSync(new URL("data/collection-runs/ledger.v1.json", repo), "utf8"));

test("acknowledgements are appended records carrying who and when", () => {
  assert.ok(Array.isArray(ledger.acknowledgements), "the ledger must carry an acknowledgements array");
  for (const a of ledger.acknowledgements) {
    assert.match(a.scheduled_for, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/u);
    assert.ok(a.acknowledged_by?.trim(), "an acknowledgement must name who made it");
    assert.match(a.acknowledged_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
    assert.equal(a.effect, "record_of_human_review_only_no_data_created");
  }
});

test("an acknowledgement only ever refers to a gap the collector recorded", () => {
  const recorded = new Set(ledger.missed_slots.map((m) => m.scheduled_for));
  for (const a of ledger.acknowledgements) {
    assert.ok(recorded.has(a.scheduled_for), `acknowledges a slot never flagged as missed: ${a.scheduled_for}`);
  }
});

test("no slot is acknowledged twice", () => {
  const slots = ledger.acknowledgements.map((a) => a.scheduled_for);
  assert.equal(new Set(slots).size, slots.length, "a gap was acknowledged more than once");
});

test("the derived flag agrees with the appended records", () => {
  const done = new Set(ledger.acknowledgements.map((a) => a.scheduled_for));
  for (const m of ledger.missed_slots) {
    assert.equal(
      m.operator_acknowledged,
      done.has(m.scheduled_for),
      `${m.scheduled_for} flag disagrees with the acknowledgement records`,
    );
  }
});

test("an acknowledged gap is still a gap", () => {
  // The whole risk of an acknowledgement mechanism is that it quietly becomes a
  // way to fill a hole. Acknowledging must never mint an observation.
  assert.match(ledger.acknowledgement_rule, /never creates, infers or backfills/iu);
  for (const m of ledger.missed_slots) {
    assert.equal(m.state, "unobserved_no_run", "an acknowledged slot must keep its unobserved state");
    assert.ok(!("observations" in m) && !("item_price_minor" in m), "a gap record must carry no price data");
  }
});
