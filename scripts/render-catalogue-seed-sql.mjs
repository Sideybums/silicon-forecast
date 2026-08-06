import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { loadJson, validateCatalogue } from "../lib/catalogue-fixtures.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const catalogue = loadJson(resolve(projectRoot, "data/catalogue/ddr5-32gb-seed.v1.json"));
validateCatalogue(catalogue, { evidenceExists: (reference) => existsSync(resolve(projectRoot, reference)) });

function stableUuid(key) {
  const chars = createHash("sha256").update(`silicon-forecast:${key}`).digest("hex").slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = "8";
  const hex = chars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sql(value) {
  const text = String(value);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) throw new Error("refusing to render SQL containing control characters");
  return `'${text.replaceAll("'", "''")}'`;
}

const creatorId = "00000000-0000-0000-0000-000000000001";
const lines = [
  "BEGIN;",
  "SET LOCAL standard_conforming_strings = on;",
  "-- Generated from data/catalogue/ddr5-32gb-seed.v1.json.",
  "-- Fresh disposable database only; repeated application must fail rather than merge silently.",
  "-- Candidate fixture data only: all revisions remain draft and unapproved.",
];

const manufacturers = new Map();
for (const product of catalogue.products) manufacturers.set(product.manufacturer.key, product.manufacturer);
for (const manufacturer of [...manufacturers.values()].sort((a, b) => a.key.localeCompare(b.key))) {
  lines.push(
    "INSERT INTO silicon_forecast.manufacturer (id, stable_key, name) VALUES (" +
    `${sql(stableUuid(`manufacturer:${manufacturer.key}`))}, ${sql(manufacturer.key)}, ${sql(manufacturer.name)});`,
  );
}

for (const product of [...catalogue.products].sort((a, b) => a.product_key.localeCompare(b.product_key))) {
  const manufacturerId = stableUuid(`manufacturer:${product.manufacturer.key}`);
  const productId = stableUuid(`product:${product.product_key}`);
  const revisionId = stableUuid(`product-revision:${product.product_key}:${product.revision_no}`);
  const evidence = JSON.stringify(product.review.evidence_references);
  const spec = product.specification;

  lines.push(
    `INSERT INTO silicon_forecast.canonical_product (id, stable_key) VALUES (${sql(productId)}, ${sql(product.product_key)});`,
    "INSERT INTO silicon_forecast.canonical_product_revision (" +
      "id, canonical_product_id, revision_no, manufacturer_id, model, mpn_raw, mpn_normalized, " +
      "memory_generation, total_capacity_gb, module_count, capacity_per_module_gb, speed_mt_s, " +
      "form_factor, ecc, registered, buffering, review_status, evidence_reference, created_by" +
      ") VALUES (" +
      [
        revisionId, productId, product.revision_no, manufacturerId, product.model,
        product.mpn_raw, product.mpn_normalized, spec.memory_generation,
        spec.total_capacity_gb, spec.module_count, spec.capacity_per_module_gb,
        spec.speed_mt_s, spec.form_factor, spec.ecc, spec.registered, spec.buffering,
        product.review.status, evidence, creatorId,
      ].map((value) => typeof value === "boolean" || typeof value === "number" ? String(value) : sql(value)).join(", ") +
      ");",
  );

  const sortedIdentifiers = [...product.identifiers].sort((a, b) =>
    `${a.type}:${a.normalized_value}`.localeCompare(`${b.type}:${b.normalized_value}`),
  );
  for (const identifier of sortedIdentifiers) {
    lines.push(
      "INSERT INTO silicon_forecast.canonical_product_identifier (" +
      "id, canonical_product_revision_id, manufacturer_id, identifier_type, raw_value, normalized_value, is_primary, evidence_reference" +
      ") VALUES (" +
      [
        stableUuid(`identifier:${product.product_key}:${product.revision_no}:${identifier.type}:${identifier.normalized_value}`),
        revisionId, manufacturerId, identifier.type, identifier.raw_value,
        identifier.normalized_value, identifier.is_primary, identifier.evidence_reference,
      ].map((value) => typeof value === "boolean" ? String(value) : sql(value)).join(", ") +
      ");",
    );
  }
}

lines.push("COMMIT;", "");
process.stdout.write(lines.join("\n"));
