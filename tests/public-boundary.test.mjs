import assert from "node:assert/strict";
import { existsSync, globSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import test from "node:test";

const privateJsonFiles = [
  ...globSync("data/observations/candidate/**/*.json"),
  ...globSync("data/fixtures/private-candidate*.json"),
  ...globSync("data/reviews/**/*.json"),
];

const publicSourceFiles = globSync([
  "app/**/*",
  "components/**/*",
  "public/**/*",
  "lib/site.ts",
]).filter((file) => statSync(file).isFile());

const publicBuildFiles = existsSync("out")
  ? globSync("out/**/*").filter((file) => statSync(file).isFile())
  : [];

function collectPrivateTokens(value, tokens = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectPrivateTokens(item, tokens);
    return tokens;
  }
  if (!value || typeof value !== "object") return tokens;

  for (const [childKey, childValue] of Object.entries(value)) {
    if (
      typeof childValue === "string" &&
      /^(tranche_id|observation_id|source_key|source_url|archive_url|original_url|extract_path|extract_sha256|response_sha256|observed_at|legal_name|mpn_expected|mpn_observed|review_id|approval_id)$/u.test(childKey)
    ) {
      tokens.add(childValue);
    }
    if (childKey === "item_price" && childValue && typeof childValue === "object") {
      const amount = childValue.amount_minor;
      if (Number.isInteger(amount) && amount > 100) {
        tokens.add(`£${(amount / 100).toFixed(2)}`);
        tokens.add((amount / 100).toFixed(2));
        tokens.add(`GBP ${(amount / 100).toFixed(2)}`);
      }
    }
    collectPrivateTokens(childValue, tokens);
  }
  return tokens;
}

function collectAllDistinctStrings(value, tokens = new Set()) {
  if (typeof value === "string") {
    if (value.length >= 12) tokens.add(value);
    return tokens;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAllDistinctStrings(item, tokens);
    return tokens;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectAllDistinctStrings(item, tokens);
  }
  return tokens;
}

function workerRunFiles() {
  return globSync("data/private-worker-runs/**/*").filter((file) => statSync(file).isFile());
}

function collectWorkerRunTokens(files = workerRunFiles()) {
  const tokens = new Set();
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    try {
      collectAllDistinctStrings(JSON.parse(content), tokens);
    } catch {
      for (const token of content.match(/[A-Za-z0-9][A-Za-z0-9._:@/-]{11,}/gu) ?? []) tokens.add(token);
    }
  }
  return tokens;
}

function readJoined(files) {
  return files.map((file) => readFileSync(file).toString("utf8")).join("\n");
}

function assertContentExcludesPrivateMaterial(content, privateTokens, scope) {
  for (const marker of [
    "candidate_private_immutable",
    "candidate_diagnostic_available",
    "private-candidate-quoted-item-relative-diagnostic",
    "candidate_private_unapproved",
    "captured_candidate_private_unapproved",
  ]) {
    assert.equal(content.includes(marker), false, `${scope} contains private candidate marker ${marker}`);
  }
  for (const token of privateTokens) assert.equal(content.includes(token), false, `${scope} contains private candidate value ${token}`);
}

function assertFilesExcludePrivateMaterial(files, privateTokens, scope) {
  assertContentExcludesPrivateMaterial(readJoined(files), privateTokens, scope);
}

function repositoryPrivateTokens() {
  const tokens = new Set();
  for (const file of privateJsonFiles) collectPrivateTokens(JSON.parse(readFileSync(file, "utf8")), tokens);
  for (const token of collectWorkerRunTokens()) tokens.add(token);
  return tokens;
}

test("private candidate/review identifiers, prices, and worker-run values stay out of public app code", () => {
  assert.ok(privateJsonFiles.length > 0, "expected private candidate fixtures, observations, or reviews");
  const privateTokens = repositoryPrivateTokens();
  assert.ok(privateTokens.size > 0, "expected private boundary tokens");
  assertFilesExcludePrivateMaterial(publicSourceFiles, privateTokens, "public app source");
});

test("private candidate/review identifiers, prices, and worker-run values stay out of the static build when present", {
  skip: publicBuildFiles.length === 0 ? "static build not present" : false,
}, () => {
  assertFilesExcludePrivateMaterial(publicBuildFiles, repositoryPrivateTokens(), "static public build");
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
