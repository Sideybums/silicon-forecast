// Seeds the collection run ledger from the prospective tranches that already
// exist, so gap detection has a baseline to measure from.
//
// Without this the first scheduled run would see no prior run and therefore
// report no missed days, quietly swallowing the outage between 2026-08-10 and
// whenever collection resumes. Those days are exactly what the operator asked
// to be able to review after the fact.
//
// Runs reconstructed here are marked as such: they were performed by an
// orchestrated session rather than by this collector, and their target counts
// are what the tranche records, not what was attempted.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { SCHEDULE, detectMissedSlots } from "../lib/canonical-collector.mjs";

const repo = new URL("../", import.meta.url);
const LEDGER = new URL("data/collection-runs/ledger.v1.json", repo);
if (existsSync(LEDGER)) {
  process.stderr.write("run ledger already exists; refusing to overwrite it (it is append-only)\n");
  process.exit(1);
}

const dir = new URL("data/observations/candidate/", repo);
const prospective = readdirSync(dir)
  .filter((f) => /^uk-primary-retail-\d{4}-\d{2}-\d{2}T\d{6}Z\.v1\.json$/u.test(f))
  .sort();

const runs = prospective.map((file) => {
  const t = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
  return {
    run_id: `sf-collection-run-${t.created_at.replace(/[-:]/gu, "").slice(0, 15)}Z`,
    collector_version: null,
    started_at: t.created_at,
    completed_at: t.created_at,
    outcome: "completed",
    performed_by: "orchestrated_session_before_scheduled_collector_existed",
    targets_attempted: t.observations.length,
    observations_retained: t.observations.length,
    abstentions: 0,
    abstention_reasons: {},
    tranche_file: `data/observations/candidate/${file}`,
    evidence_ledger: null,
    reconstructed: true,
    reconstruction_note:
      "Recorded retrospectively from the tranche this run produced. Attempt counts reflect retained observations only; what else may have been tried is not recoverable.",
  };
});

const now = new Date();
const last = runs.length ? runs.at(-1).started_at : null;
const missed = detectMissedSlots(last, now, SCHEDULE).map((slot) => ({
  scheduled_for: slot,
  state: "unobserved_no_run",
  detected_at: `${now.toISOString().slice(0, 19)}Z`,
  detected_by_run: "sf-collection-run-ledger-seed",
  operator_acknowledged: false,
  note: "No collection run occurred at this scheduled slot. No observation exists for it and none may be inferred; the gap is recorded so it can be reviewed rather than passing unnoticed.",
}));

const ledger = {
  schema_version: 1,
  ledger_id: "sf-canonical-collector-run-ledger-v1",
  status: "candidate_private_immutable",
  policy:
    "Append-only. Every attempted run is recorded whether it succeeded or not, and every scheduled slot that passed without a run is recorded as an unobserved gap for the operator to review after the fact. Entries are never edited or removed; corrections are additive.",
  acknowledgement_rule:
    "operator_acknowledged marks that a human has seen and accepted a gap. It never creates, infers or backfills an observation for the missed day, and a gap remains a gap in every derived series whether acknowledged or not.",
  schedule: SCHEDULE,
  runs,
  missed_slots: missed,
};

mkdirSync(new URL("data/collection-runs/", repo), { recursive: true });
writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

process.stdout.write(`seeded ${runs.length} reconstructed runs\n`);
for (const r of runs) process.stdout.write(`  ${r.started_at}  ${r.observations_retained} observations\n`);
process.stdout.write(`recorded ${missed.length} missed slots since ${last}\n`);
for (const m of missed) process.stdout.write(`  ${m.scheduled_for}  ${m.state}\n`);
