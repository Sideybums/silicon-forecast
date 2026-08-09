import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  renderPrivateCandidateRetailMovementReport,
  renderPrivateCandidateRetailReport,
} from "../lib/primary-retail-report.mjs";

const fixtureUrl = new URL("../data/fixtures/primary-retail-observations.gb.v1.json", import.meta.url);
const fixturePath = fileURLToPath(fixtureUrl);
const trancheUrl = new URL("../data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json", import.meta.url);
const tranchePath = fileURLToPath(trancheUrl);
const scriptPath = fileURLToPath(new URL("../scripts/render-private-candidate-retail-report.mjs", import.meta.url));
const loadFixture = async () => JSON.parse(await readFile(fixtureUrl, "utf8"));

function runCli(cwd, inputPath = fixturePath) {
  return execFileSync(process.execPath, [scriptPath, inputPath], { cwd, encoding: "utf8" });
}

test("private candidate report renders deterministic guard rails, lines, prices, movements and lineage", async () => {
  const fixture = await loadFixture();
  const report = renderPrivateCandidateRetailMovementReport(fixture);
  const reordered = structuredClone(fixture);
  reordered.observations.reverse();

  assert.equal(renderPrivateCandidateRetailMovementReport(reordered), report);
  assert.match(report, /^# PRIVATE CANDIDATE-RETAIL MOVEMENT REPORT\n\n> \*\*CANDIDATE \/ PRIVATE — NOT AN INDEX — NOT METHODOLOGY-APPROVED — NOT PUBLIC\*\*/u);
  assert.match(report, /Production import allowed: \*\*NO\*\*/u);
  assert.match(report, /Index inclusion allowed: \*\*NO\*\*/u);
  assert.match(report, /Publication allowed: \*\*NO\*\*/u);
  assert.match(report, /### kingston-fury-beast-kf560c30bbek2-32 — scan-fixture/u);
  assert.match(report, /2026-08-01T09:10:00Z \| £99\.99 GBP \| fixture-scan-beast-2026-08-01 \| https:\/\/scan\.example\.test\/products\/KF560C30BBEK2-32/u);
  assert.match(report, /2026-08-01 → 2026-08-08 \| down \| £99\.99 \| £94\.98 \| -£5\.01 \| -501 \| fixture-scan-beast-2026-08-01 → fixture-scan-beast-2026-08-08/u);
  assert.match(report, /\*\*INSUFFICIENT HISTORY\*\* — reason code: `requires_at_least_two_eligible_dates`\./u);
  assert.match(report, /### fixture-scan-beast-2026-08-08-vat-unknown[\s\S]*Reason codes: `vat_inclusion_unresolved`[\s\S]*Source lineage: https:\/\/scan\.example\.test\/adversarial\/VAT-UNKNOWN/u);
  assert.match(report, /### fixture-scan-patriot-2026-08-08-mpn-missing[\s\S]*Reason codes: `exact_mpn_unresolved`[\s\S]*Retained factual lineage: Family and capacity shown; Exact MPN absent/u);
  assert.match(report, /\*\*END OF PRIVATE CANDIDATE REPORT — NOT AN INDEX — NOT FOR PUBLICATION\*\*\n$/u);
});

test("CLI requires an explicit JSON path and output is independent of caller working directory", () => {
  const fromProject = runCli(fileURLToPath(new URL("..", import.meta.url)));
  const fromTemporaryDirectory = runCli("/tmp");
  assert.equal(fromTemporaryDirectory, fromProject);

  const missingPath = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  assert.notEqual(missingPath.status, 0);
  assert.match(missingPath.stderr, /usage: node scripts\/render-private-candidate-retail-report\.mjs <candidate-retail\.json>/u);
});

test("immutable live tranche renders retained item-price history without inventing a movement", async () => {
  const tranche = JSON.parse(await readFile(trancheUrl, "utf8"));
  const report = renderPrivateCandidateRetailReport(tranche);
  const cliReport = runCli("/tmp", tranchePath);

  assert.equal(cliReport, report);
  assert.match(report, /^# PRIVATE CANDIDATE PRIMARY-RETAIL OBSERVATION HISTORY/u);
  assert.match(report, /Observations retained: 3/u);
  assert.match(report, /Derived movements: \*\*NONE\*\*/u);
  assert.match(report, /F5-6000J3636F16GX2-FX5[\s\S]*£469\.99 GBP/u);
  assert.match(report, /KF560C30BBEK2-32[\s\S]*£611\.44 GBP/u);
  assert.match(report, /KF564C32RSK2-32[\s\S]*£620\.26 GBP/u);
  assert.match(report, /availability_semantics_ambiguous/u);
  assert.match(report, /delivery_destination_not_fixed/u);
  assert.doesNotMatch(report, /source_not_approved_for_production/u);
  assert.match(report, /END OF PRIVATE CANDIDATE OBSERVATION HISTORY — NOT AN INDEX — NOT FOR PUBLICATION/u);

  const unlocked = structuredClone(tranche);
  unlocked.governance.publication_allowed = true;
  assert.throws(() => renderPrivateCandidateRetailReport(unlocked), /publication_allowed must remain false/u);
});

test("CLI validates the supplied JSON through candidate fixture guard rails", async () => {
  const fixture = await loadFixture();
  fixture.governance.index_inclusion_allowed = true;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "sf-private-report-"));
  try {
    const invalidPath = join(temporaryDirectory, "unlocked.json");
    await writeFile(invalidPath, JSON.stringify(fixture));
    const validation = spawnSync(process.execPath, [scriptPath, invalidPath], { encoding: "utf8" });
    assert.notEqual(validation.status, 0);
    assert.match(validation.stderr, /index_inclusion_allowed must remain false/u);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
