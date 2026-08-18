import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import Ajv from "ajv";
import { assertPublicEventLine } from "../lib/event-line.ts";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("the public Event Line is an explicitly empty structure-only projection", () => {
  const policy = readJson("config/event-line-publication-policy.v1.json");
  const dataset = readJson("data/public-dashboard/event-line-ram.v1.json");
  assert.equal(policy.status, "implemented_structure_for_review");
  assert.equal(policy.scope.real_markers, false);
  assert.equal(policy.authority.publish_real_marker, false);
  assert.equal(dataset.status, "empty_pending_review");
  assert.deepEqual(dataset.markers, []);
  assert.doesNotMatch(readFileSync("data/public-dashboard/event-line-ram.v1.json", "utf8"), /review_id/);
});

test("the executable Event Line schema and public bridge fail closed", () => {
  const schema = readJson("schemas/event-line.v1.schema.json");
  const dataset = readJson("data/public-dashboard/event-line-ram.v1.json");
  const validate = new Ajv({ allErrors: true }).compile(schema);
  assert.equal(validate(dataset), true, JSON.stringify(validate.errors));
  const invalid = { ...dataset, markers: [{ event_id: "unreviewed" }] };
  assert.equal(validate(invalid), false);
  assert.throws(() => assertPublicEventLine(invalid), /empty Event Line contains markers/);
  assert.throws(() => assertPublicEventLine({ ...dataset, status: "reviewed_markers_published" }), /contains no markers/);
});

test("marker records require citations, cautious interpretation, uncertainty, counter-evidence, revision and review", () => {
  const policy = readJson("config/event-line-publication-policy.v1.json");
  assert.deepEqual(policy.required_review_record_fields, [
    "event_id", "headline", "publisher", "author", "source_url", "publication_date", "event_date",
    "interpretation", "uncertainty", "counter_evidence", "revision", "review_id",
  ]);
  assert.deepEqual(policy.public_marker_fields, policy.required_review_record_fields.filter((field) => field !== "review_id"));
  assert.equal(policy.wording_contract.chronology_only, true);
  assert.equal(policy.wording_contract.causation_prohibited, true);
  assert.equal(policy.wording_contract.numeric_influence, false);
  assert.equal(policy.wording_contract.separate_exact_revision_approval_required, true);
});

test("the Event Line payload is checksum-bound and has no reviewed input by construction", () => {
  const manifest = readJson("data/public-dashboard/event-line-ram.manifest.v1.json");
  for (const binding of [manifest.generator, manifest.policy, manifest.schema]) {
    assert.equal(binding.sha256, sha256(readFileSync(binding.path)), binding.path);
  }
  assert.equal(manifest.output.sha256, sha256(readFileSync(manifest.output.path)));
  assert.deepEqual(manifest.reviewed_inputs, []);
});

test("event policy cannot approve sources, interpretations, price changes or deployment", () => {
  const authority = readJson("config/event-line-publication-policy.v1.json").authority;
  for (const key of ["select_research", "approve_source", "approve_interpretation", "alter_prices_or_index", "production_deployment"]) {
    assert.equal(authority[key], false, key);
  }
});
