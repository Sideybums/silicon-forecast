import assert from "node:assert/strict";
import test from "node:test";
import {
  bounds,
  contiguousRuns,
  niceTicks,
  path,
  permilleAcross,
  plotArea,
  polyline,
  xFor,
  yFor,
} from "../components/chart/geometry.ts";

// A deterministic pseudo-random source, so a failure is reproducible.
function* lcg(seed = 20260813) {
  let s = seed;
  for (;;) {
    s = (s * 1103515245 + 12345) % 2147483648;
    yield s / 2147483648;
  }
}

test("no geometry string can contain a decimal point", () => {
  // The property that makes a price literal collision impossible rather than
  // unlikely. 100.00, 200.00, 120.00 and 50.00 are all currently banned
  // substrings and all are natural chart coordinates.
  const rand = lcg();
  const area = plotArea();
  for (let i = 0; i < 4000; i += 1) {
    const count = 2 + Math.floor(rand.next().value * 40);
    const min = rand.next().value * 400;
    const max = min + rand.next().value * 400 + 1;
    const points = Array.from({ length: count }, (_, k) => ({
      x: xFor(k, count, area),
      y: yFor(min + rand.next().value * (max - min), min, max, area),
    }));
    for (const geometry of [polyline(points), path(points)]) {
      assert.match(geometry, /^[MLZ0-9 ,-]*$/u, `geometry contained a forbidden character: ${geometry.slice(0, 80)}`);
      assert.doesNotMatch(geometry, /\./u, "geometry contained a decimal point");
    }
  }
});

test("axis ticks and permille positions are whole numbers", () => {
  const rand = lcg(99);
  for (let i = 0; i < 2000; i += 1) {
    const min = rand.next().value * 500;
    const max = min + rand.next().value * 900 + 1;
    for (const tick of niceTicks(min, max)) {
      assert.ok(Number.isInteger(tick), `tick ${tick} is not an integer`);
      assert.doesNotMatch(String(tick), /\./u);
    }
    const b = bounds([min, max]);
    assert.ok(Number.isInteger(b.min) && Number.isInteger(b.max));
    const count = 1 + Math.floor(rand.next().value * 30);
    const p = permilleAcross(Math.floor(rand.next().value * count), count);
    assert.ok(Number.isInteger(p) && p >= 0 && p <= 1000);
  }
});

test("ticks span the data and stay inside it", () => {
  const ticks = niceTicks(86, 336, 4);
  assert.ok(ticks.length >= 3, `expected several ticks, got ${ticks.join(",")}`);
  assert.ok(ticks[0] >= 86);
  assert.ok(ticks[ticks.length - 1] <= 336);
  // Monotonic and evenly stepped.
  const step = ticks[1] - ticks[0];
  for (let i = 1; i < ticks.length; i += 1) assert.equal(ticks[i] - ticks[i - 1], step);
});

test("a gap breaks the line rather than being drawn across", () => {
  // Both derivation modules refuse to join across a period with insufficient
  // evidence. The chart must not undo that in pixels.
  assert.deepEqual(contiguousRuns([null, 1, 2, 3, null, 5, 6, null]), [[1, 2, 3], [5, 6]]);
  assert.deepEqual(contiguousRuns([1, 2, 3]), [[0, 1, 2]]);
  assert.deepEqual(contiguousRuns([null, null]), []);
  assert.deepEqual(contiguousRuns([]), []);
  // A single observed period between two gaps is its own run, not silently
  // dropped: it is real evidence and must still be drawn as a point.
  assert.deepEqual(contiguousRuns([null, 7, null]), [[1]]);
});

test("the real index series breaks exactly where the chain stops", async () => {
  const { readFileSync } = await import("node:fs");
  const index = JSON.parse(readFileSync("data/public-projection/index-ram.v1.json", "utf8"));
  const runs = contiguousRuns(index.periods.map((p) => p.index_milli));
  assert.equal(runs.length, 1, "the real chain is continuous between its two stopping points");
  const drawn = runs[0].length;
  const observed = index.periods.filter((p) => p.state === "observed").length;
  assert.equal(drawn, observed, "every observed period is drawn and no gap is");
  assert.ok(index.periods.length > observed, "the gaps at either end must still be present as periods");
});

test("degenerate inputs do not produce NaN geometry", () => {
  // A single-point series and a flat series are both real cases for a thin
  // dataset, and NaN in a path attribute renders nothing with no error.
  assert.ok(Number.isInteger(xFor(0, 1)));
  assert.ok(Number.isInteger(yFor(5, 5, 5)));
  assert.equal(polyline([]), "");
  assert.equal(path([]), "");
  for (const value of [polyline([{ x: xFor(0, 1), y: yFor(5, 5, 5) }]), path([{ x: 0, y: 0 }])]) {
    assert.doesNotMatch(value, /NaN|Infinity|undefined/u);
  }
  assert.deepEqual(niceTicks(5, 5), [5]);
  assert.deepEqual(bounds([]), { min: 0, max: 1 });
});
