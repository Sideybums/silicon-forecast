import assert from "node:assert/strict";
import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const privateJsonFiles = [
  ...globSync("data/observations/candidate/**/*.json"),
  ...globSync("data/fixtures/private-candidate*.json"),
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
      /^(tranche_id|observation_id|source_key|source_url|archive_url|original_url|extract_path|extract_sha256|response_sha256|observed_at|legal_name|mpn_expected|mpn_observed)$/u.test(childKey)
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

function assertFilesExcludePrivateMaterial(files, privateTokens, scope) {
  const content = files.map((file) => readFileSync(file).toString("utf8")).join("\n");
  for (const marker of [
    "candidate_private_immutable",
    "candidate_diagnostic_available",
    "private-candidate-quoted-item-relative-diagnostic",
  ]) {
    assert.equal(content.includes(marker), false, `${scope} contains private candidate marker ${marker}`);
  }
  for (const token of privateTokens) {
    assert.equal(content.includes(token), false, `${scope} contains private candidate value ${token}`);
  }
}

test("private candidate identifiers and prices stay out of public app code", () => {
  assert.ok(privateJsonFiles.length > 0, "expected private candidate fixtures or observations");
  const privateTokens = new Set();
  for (const file of privateJsonFiles) {
    collectPrivateTokens(JSON.parse(readFileSync(file, "utf8")), privateTokens);
  }
  assert.ok(privateTokens.size > 0, "expected private boundary tokens");
  assertFilesExcludePrivateMaterial(publicSourceFiles, privateTokens, "public app source");
});

test("private candidate identifiers and prices stay out of the static build when present", {
  skip: publicBuildFiles.length === 0 ? "static build not present" : false,
}, () => {
  const privateTokens = new Set();
  for (const file of privateJsonFiles) {
    collectPrivateTokens(JSON.parse(readFileSync(file, "utf8")), privateTokens);
  }
  assertFilesExcludePrivateMaterial(publicBuildFiles, privateTokens, "static public build");
});
