import assert from "node:assert/strict";
import test from "node:test";
import { selectCollectionTargets, targetSelectionKey } from "../lib/canonical-collector.mjs";

const target = (mpn, priority = 3, seller = "Fixture Retailer") => ({
  mpn,
  seller_display_name: seller,
  url: `https://fixture.invalid/${mpn.toLowerCase()}`,
  collection_priority: priority,
});

const registry = ["A-32", "B-32", "C-32", "D-32", "E-32", "F-32"].map((mpn) => target(mpn));
const keys = (selection) => selection.targets.map(targetSelectionKey);
const completed = (targetSelection) => ({ outcome: "completed", targets_attempted: targetSelection.selected_target_keys.length, target_selection: targetSelection });

test("legacy first-slice history migrates once to the unattempted second window", () => {
  const selection = selectCollectionTargets(registry, {
    maxPriority: 4,
    maxTargets: 3,
    priorRuns: [{ outcome: "completed", targets_attempted: 3 }],
  });
  assert.deepEqual(keys(selection), registry.slice(3).map(targetSelectionKey));
  assert.equal(selection.state.cursor_basis, "legacy_first_window_migration");
  assert.equal(selection.state.started_after_target_key, targetSelectionKey(registry[2]));
});

test("two committed windows cover every eligible target without starvation", () => {
  const secondWindow = selectCollectionTargets(registry, {
    maxPriority: 4,
    maxTargets: 3,
    priorRuns: [{ outcome: "completed", targets_attempted: 3 }],
  });
  const wrappedWindow = selectCollectionTargets(registry, {
    maxPriority: 4,
    maxTargets: 3,
    priorRuns: [{ outcome: "completed", targets_attempted: 3 }, completed(secondWindow.state)],
  });
  assert.deepEqual(new Set([...keys(secondWindow), ...keys(wrappedWindow)]), new Set(registry.map(targetSelectionKey)));
  assert.deepEqual(keys(wrappedWindow), registry.slice(0, 3).map(targetSelectionKey));
  assert.equal(wrappedWindow.state.cursor_basis, "prior_committed_selection");
});

test("an uncommitted failed attempt cannot advance the durable cursor", () => {
  const priorRuns = [{ outcome: "completed", targets_attempted: 3 }];
  const firstAttempt = selectCollectionTargets(registry, { maxPriority: 4, maxTargets: 3, priorRuns });
  const failedLedgerRow = { outcome: "failed", targets_attempted: 0, target_selection: firstAttempt.state };
  const retry = selectCollectionTargets(registry, { maxPriority: 4, maxTargets: 3, priorRuns: [...priorRuns, failedLedgerRow] });
  assert.deepEqual(keys(retry), keys(firstAttempt));
});

test("cursor recovery tolerates additions, removals, holds and abstentions", () => {
  const first = selectCollectionTargets(registry, {
    maxPriority: 4,
    maxTargets: 3,
    priorRuns: [{ outcome: "completed", targets_attempted: 3 }],
  });
  const changed = [target("NEW-32"), registry[0], registry[1], registry[2], registry[3], { ...registry[4], collection_priority: 5 }];
  const next = selectCollectionTargets(changed, {
    maxPriority: 4,
    maxTargets: 3,
    priorRuns: [{ outcome: "completed", targets_attempted: 3 }, completed(first.state)],
  });
  assert.equal(next.state.started_after_target_key, targetSelectionKey(registry[3]), "removed/held tail falls back to latest still-eligible selected key");
  assert.deepEqual(keys(next), [targetSelectionKey(changed[0]), targetSelectionKey(registry[0]), targetSelectionKey(registry[1])]);
});

test("whole-window removal falls back to the newest older committed cursor", () => {
  const secondWindow = selectCollectionTargets(registry, { maxPriority: 4, maxTargets: 3, priorRuns: [{ outcome: "completed", targets_attempted: 3 }] });
  const wrappedWindow = selectCollectionTargets(registry, { maxPriority: 4, maxTargets: 3, priorRuns: [{ outcome: "completed", targets_attempted: 3 }, completed(secondWindow.state)] });
  const changed = [registry[3], registry[4], registry[5], target("NEW-32")];
  const recovered = selectCollectionTargets(changed, {
    maxPriority: 4,
    maxTargets: 3,
    priorRuns: [{ outcome: "completed", targets_attempted: 3 }, completed(secondWindow.state), completed(wrappedWindow.state)],
  });
  assert.equal(recovered.state.cursor_basis, "older_committed_selection_fallback");
  assert.equal(recovered.state.started_after_target_key, targetSelectionKey(registry[5]));
  assert.deepEqual(keys(recovered), [targetSelectionKey(changed[3]), targetSelectionKey(registry[3]), targetSelectionKey(registry[4])]);
});

test("a 45-of-86 legacy roster immediately covers all 41 previously starved targets", () => {
  const largeRegistry = Array.from({ length: 86 }, (_, index) => target(`MPN-${String(index).padStart(3, "0")}`));
  const selection = selectCollectionTargets(largeRegistry, {
    maxPriority: 4,
    maxTargets: 45,
    priorRuns: [{ outcome: "completed", targets_attempted: 45 }],
  });
  assert.deepEqual(keys(selection).slice(0, 41), largeRegistry.slice(45).map(targetSelectionKey));
  assert.deepEqual(keys(selection).slice(41), largeRegistry.slice(0, 4).map(targetSelectionKey));
  assert.equal(new Set(keys(selection)).size, 45);
});

test("duplicate same-retailer normalised-MPN targets fail closed", () => {
  assert.throws(
    () => selectCollectionTargets([target("KF560"), { ...target(" Kf560 "), url: "https://fixture.invalid/duplicate" }], { maxPriority: 4, maxTargets: 1, priorRuns: [] }),
    /duplicate eligible retailer\/MPN target/u,
  );
});
