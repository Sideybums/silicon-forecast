import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { publicationGate, seriesIsPublic } from "../lib/publication-gate.ts";

// Each case builds a throwaway config and reviews directory, so the real
// committed gate is never touched by a test.
function scenario({ config, review }) {
  const dir = mkdtempSync(path.join(tmpdir(), "sf-gate-"));
  const reviewsDir = path.join(dir, "reviews");
  mkdirSync(reviewsDir, { recursive: true });
  const configPath = path.join(dir, "public-release.v1.json");
  if (config !== undefined) writeFileSync(configPath, typeof config === "string" ? config : JSON.stringify(config));
  if (review) writeFileSync(path.join(reviewsDir, "approval.json"), JSON.stringify(review));
  return { configPath, reviewsDir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const APPROVED = { public_series_release: "approved", approval_ref: "sf-approval-1" };
const SIGNED = { review_id: "sf-approval-1", decided_by: "David Sidebottom", decided_at: "2026-08-13T00:00:00Z" };

function gate(opts, env = undefined) {
  const s = scenario(opts);
  try {
    return publicationGate({ configPath: s.configPath, reviewsDir: s.reviewsDir, env });
  } finally {
    s.cleanup();
  }
}

test("a fully signed approval opens the gate", () => {
  const decision = gate({ config: APPROVED, review: SIGNED });
  assert.equal(decision.isPublic, true);
  assert.match(decision.reason, /David Sidebottom/u);
});

test("a missing config closes the gate", () => {
  assert.equal(gate({ review: SIGNED }).isPublic, false);
});

test("a malformed config closes the gate", () => {
  const decision = gate({ config: "{ not json", review: SIGNED });
  assert.equal(decision.isPublic, false);
  assert.match(decision.reason, /missing or unreadable/u);
});

test("withheld stays withheld", () => {
  assert.equal(gate({ config: { public_series_release: "withheld", approval_ref: null }, review: SIGNED }).isPublic, false);
});

test("approved with no approval_ref closes the gate", () => {
  const decision = gate({ config: { public_series_release: "approved", approval_ref: null }, review: SIGNED });
  assert.equal(decision.isPublic, false);
  assert.match(decision.reason, /names no approval record/u);
});

test("approved naming a record that does not exist closes the gate", () => {
  const decision = gate({ config: { public_series_release: "approved", approval_ref: "sf-does-not-exist" }, review: SIGNED });
  assert.equal(decision.isPublic, false);
  assert.match(decision.reason, /does not exist/u);
});

test("an approval record with no human decision closes the gate", () => {
  // An approved flag pointing at an unsigned record is how a gate becomes
  // decorative.
  const decision = gate({ config: APPROVED, review: { review_id: "sf-approval-1", decided_by: "  ", decided_at: "" } });
  assert.equal(decision.isPublic, false);
  assert.match(decision.reason, /carries no decision/u);
});

test("the environment can close an open gate", () => {
  assert.equal(gate({ config: APPROVED, review: SIGNED }, "withheld").isPublic, false);
});

test("the environment can never open a closed gate", () => {
  // The asymmetry is the point: CI misconfiguration must not be able to publish.
  for (const env of ["approved", "public", "true", "1", "yes"]) {
    assert.equal(
      gate({ config: { public_series_release: "withheld", approval_ref: null }, review: SIGNED }, env).isPublic,
      false,
      `env value ${env} must not open the gate`,
    );
  }
});

test("the committed gate is currently closed, and says what opening it would publish", () => {
  assert.equal(seriesIsPublic(), false, "the repository must ship with the series withheld");
  const config = JSON.parse(readFileSync("config/public-release.v1.json", "utf8"));
  assert.equal(config.public_series_release, "withheld");
  assert.equal(config.approval_ref, null);
  assert.ok(config.what_opening_this_would_publish.length > 60);
  // Opening this gate must not be mistaken for unlocking the wider controls.
  for (const lock of ["external_publish", "source_approval", "editorial_activation"]) {
    assert.ok(config.still_locked_regardless.includes(lock), `${lock} must remain listed as locked`);
  }
});
