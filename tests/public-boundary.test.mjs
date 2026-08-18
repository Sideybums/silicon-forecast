import assert from "node:assert/strict";
import { existsSync, globSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import test from "node:test";
import {
  MATCHING_STATE_KEYS,
  PRIVATE_MARKERS,
  collectAllDistinctStrings,
  collectPrivateTokens,
  collectWorkerRunTokens,
  privateJsonFiles,
  repositoryPrivateTokens,
  repositoryReasonCodes,
  workerRunFiles,
} from "./helpers/private-tokens.mjs";

// The generated public projection is scanned alongside hand-written source.
// It is committed and boundary-tested on every run even while the site ships
// gated, so the safety question is answered now rather than on the day the
// deploy gate opens.
const publicSourceFiles = globSync([
  "app/**/*",
  "components/**/*",
  "public/**/*",
  "lib/site.ts",
  "lib/public-data.ts",
  "lib/daily-market.ts",
  "lib/components-registry.ts",
  "lib/publication-gate.ts",
  "data/public-projection/**/*",
  "data/public-offers/**/*",
  "data/public-dashboard/**/*",
]).filter((file) => statSync(file).isFile());

const publicBuildFiles = existsSync("out")
  ? globSync("out/**/*").filter((file) => statSync(file).isFile())
  : [];

const projectionFiles = globSync(["data/public-projection/**/*.json", "data/public-offers/**/*.json"]);
const releasedOffers = JSON.parse(readFileSync("data/public-offers/offers-ram.v1.json", "utf8"));

function unreleasedPrivateTokens() {
  const tokens = repositoryPrivateTokens();
  const approvedPublicContent = JSON.stringify(releasedOffers);
  for (const token of tokens) if (approvedPublicContent.includes(token)) tokens.delete(token);
  for (const observation of releasedOffers.observations) {
    tokens.delete(observation.source_url);
    tokens.delete(observation.observed_at);
    tokens.delete(`£${(observation.item_price_minor / 100).toFixed(2)}`);
    tokens.delete((observation.item_price_minor / 100).toFixed(2));
    tokens.delete(`GBP ${(observation.item_price_minor / 100).toFixed(2)}`);
  }
  return tokens;
}

function readJoined(files) {
  return files.map((file) => readFileSync(file).toString("utf8")).join("\n");
}

function assertContentExcludesPrivateMaterial(content, privateTokens, scope) {
  for (const marker of PRIVATE_MARKERS) {
    assert.equal(content.includes(marker), false, `${scope} contains private candidate marker ${marker}`);
  }
  for (const token of privateTokens) assert.equal(content.includes(token), false, `${scope} contains private candidate value ${token}`);
}

function assertFilesExcludePrivateMaterial(files, privateTokens, scope) {
  assertContentExcludesPrivateMaterial(readJoined(files), privateTokens, scope);
}

test("unreleased private identifiers, prices, and worker-run values stay out of public app code", () => {
  assert.ok(privateJsonFiles().length > 0, "expected private candidate fixtures, observations, or reviews");
  const privateTokens = unreleasedPrivateTokens();
  assert.ok(privateTokens.size > 0, "expected private boundary tokens");
  assertFilesExcludePrivateMaterial(publicSourceFiles, privateTokens, "public app source");
});

test("unreleased private identifiers, prices, and worker-run values stay out of the static build when present", {
  skip: publicBuildFiles.length === 0 ? "static build not present" : false,
}, () => {
  assertFilesExcludePrivateMaterial(publicBuildFiles, unreleasedPrivateTokens(), "static public build");
});

// --- replacements for the narrowed part-number ban ---------------------------
//
// data/reviews/part-number-disclosure-ruling-2026-08-13.json narrowed the ban so
// that a manufacturer part number may be published. These three tests carry the
// thing that ban was actually protecting: the identity comparison and its
// reasoning, which stay private.

test("the part-number ruling is recorded and its replacements are in force", () => {
  const ruling = JSON.parse(readFileSync("data/reviews/part-number-disclosure-ruling-2026-08-13.json", "utf8"));
  assert.ok(ruling.decided_by?.trim(), "a ruling narrowing a boundary control must name who decided it");
  assert.ok(ruling.decided_at?.trim());
  assert.deepEqual(ruling.narrowed.removed_from_banned_key_regex, ["mpn_expected", "mpn_observed"]);
  assert.equal(ruling.governance.publication_eligible, false, "narrowing an identifier ban grants no publication authority");
  const assertions = ruling.replacement_assertions.map((entry) => entry.assertion);
  assert.deepEqual(assertions, [
    "no_expected_and_observed_pair_in_public_output",
    "no_matching_or_eligibility_reason_codes_in_public_output",
    "no_match_basis_or_identity_exact_in_public_output",
  ]);
});

test("public output never carries the identity comparison, only a single part number", () => {
  const offending = [];
  const walk = (value, path, file) => {
    if (Array.isArray(value)) return value.forEach((item, i) => walk(item, `${path}[${i}]`, file));
    if (!value || typeof value !== "object") return;
    const keys = Object.keys(value);
    // Publishing both sides of the comparison would expose what we expected
    // against what we saw, which is the working state the ban protected.
    if (keys.includes("mpn_expected") && keys.includes("mpn_observed")) {
      offending.push(`${file}${path} carries both mpn_expected and mpn_observed`);
    }
    for (const key of MATCHING_STATE_KEYS.filter((k) => k !== "mpn_expected" && k !== "mpn_observed")) {
      if (keys.includes(key)) offending.push(`${file}${path} carries ${key}`);
    }
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`, file);
  };
  for (const file of projectionFiles) walk(JSON.parse(readFileSync(file, "utf8")), "", file);
  assert.deepEqual(offending, [], "matching state reached the public projection");

  // match_basis and identity_exact must not appear as literals anywhere public.
  const content = readJoined([...publicSourceFiles, ...publicBuildFiles]);
  for (const key of ["match_basis", "identity_exact"]) {
    assert.equal(content.includes(key), false, `public output contains the identity-decision field ${key}`);
  }
});

test("collector abstention and eligibility reason codes stay out of public output", () => {
  const codes = repositoryReasonCodes();
  assert.ok(codes.size > 5, `expected a reason-code vocabulary from the data, found ${codes.size}`);
  // These describe how confident we were and why. They are private working
  // state, and several would read as a claim about a retailer.
  const content = readJoined([...publicSourceFiles, ...publicBuildFiles]);
  for (const code of codes) {
    assert.equal(content.includes(code), false, `public output contains the reason code ${code}`);
  }
});

test("an ignored temporary raw worker run is discovered without committed runtime data", () => {
  const directory = "data/private-worker-runs/public-boundary-test";
  const file = `${directory}/temporary-run.json`;
  const marker = "PRIVATE_WORKER_RUNTIME_NONCE_9f65c4a72e31";
  try {
    mkdirSync(directory, { recursive: true });
    writeFileSync(file, JSON.stringify({ raw_worker_claim: marker }));
    assert.ok(workerRunFiles().includes(file));
    const tokens = collectWorkerRunTokens();
    assert.ok(tokens.has(marker));
    assert.throws(
      () => assertContentExcludesPrivateMaterial(`public leak ${marker}`, tokens, "synthetic public content"),
      /contains private candidate value/u,
    );
    assertFilesExcludePrivateMaterial(publicSourceFiles, tokens, "public app source");
    if (publicBuildFiles.length > 0) assertFilesExcludePrivateMaterial(publicBuildFiles, tokens, "static public build");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the shared token collector still catches what it always did", () => {
  // Guards the extraction itself: the helper must behave like the inlined
  // version it replaced.
  const tokens = collectPrivateTokens({
    nested: [{ observation_id: "sf-obs-1", item_price: { amount_minor: 12999 } }],
    seller: { legal_name: "Some Ltd" },
    harmless: { mpn: "CMK32GX5M2B6000Z30" },
  });
  assert.ok(tokens.has("sf-obs-1"));
  assert.ok(tokens.has("Some Ltd"));
  assert.ok(tokens.has("£129.99") && tokens.has("129.99") && tokens.has("GBP 129.99"));
  // A part number is no longer banned, and a bare mpn key never was.
  assert.ok(!tokens.has("CMK32GX5M2B6000Z30"));
  // A price at or below GBP 1.00 was never banned.
  assert.equal(collectPrivateTokens({ item_price: { amount_minor: 100 } }).size, 0);
  assert.ok(collectAllDistinctStrings({ a: "short", b: "long-enough-string" }).has("long-enough-string"));
});
