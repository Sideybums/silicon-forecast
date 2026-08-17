import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicationGate, seriesIsPublic } from "../lib/publication-gate.ts";

const APPROVED_SHAPED_OPTIONS = {
  configPath: "/tmp/attacker-controlled-release.json",
  reviewsDir: "/tmp/attacker-controlled-reviews",
  manifestPath: "/tmp/attacker-controlled-manifest.json",
  env: "approved",
};

test("publication activation is structurally unavailable during recovery", () => {
  const decision = publicationGate(APPROVED_SHAPED_OPTIONS);
  assert.equal(decision.isPublic, false);
  assert.match(decision.reason, /not implemented/u);
});

test("environment values cannot open the gate", () => {
  for (const env of [undefined, "withheld", "approved", "public", "true", "1", "yes"]) {
    assert.equal(publicationGate({ env }).isPublic, false);
  }
});

test("repository paths and approval-shaped data cannot open the gate", () => {
  assert.equal(publicationGate({
    configPath: "config/public-release.v1.json",
    reviewsDir: "data/reviews",
    manifestPath: "data/public-projection/manifest.v1.json",
  }).isPublic, false);
});

test("the committed gate and private candidate manifest remain closed", () => {
  assert.equal(seriesIsPublic(), false);
  const config = JSON.parse(readFileSync("config/public-release.v1.json", "utf8"));
  const manifest = JSON.parse(readFileSync("data/public-projection/manifest.v1.json", "utf8"));
  assert.equal(config.public_series_release, "withheld");
  assert.equal(config.approval_ref, null);
  assert.equal(manifest.artifact_status, "private_candidate");
  assert.equal(manifest.publication_eligible, false);
  assert.deepEqual(Object.values(manifest.approvals), [false, false, false, false, false]);
  for (const lock of ["external_publish", "source_approval", "basket_approval", "editorial_activation", "methodology_change", "production_activation"]) {
    assert.ok(config.still_locked_regardless.includes(lock), `${lock} must remain listed as locked`);
  }
});
