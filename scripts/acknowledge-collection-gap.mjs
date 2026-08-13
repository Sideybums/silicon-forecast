#!/usr/bin/env node
// Records that a human has seen and accepted a scheduled slot that produced no
// observation.
//
// This is appended, not toggled. The run ledger is append-only — entries are
// never edited — so an acknowledgement is a new record carrying who accepted
// the gap and when, rather than a boolean flipped in place with no provenance.
// operator_acknowledged on each missed slot is a derived convenience recomputed
// from these records; the acknowledgements array is the authority.
//
// Acknowledging a gap changes nothing about the data. It does not create,
// infer or backfill an observation for the missed day, and the day remains a
// gap in every derived series exactly as before. It records only that the
// absence has been reviewed rather than overlooked.
//
// Usage:
//   node scripts/acknowledge-collection-gap.mjs --slot 2026-08-11T13:45:00 [--by "Name"] [--note "..."]
//   node scripts/acknowledge-collection-gap.mjs --list
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const repo = new URL("../", import.meta.url);
const LEDGER = new URL("data/collection-runs/ledger.v1.json", repo);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const a = process.argv[i];
  if (a === "--list") { args.set("list", true); continue; }
  if (!a.startsWith("--")) throw new Error(`unexpected argument: ${a}`);
  args.set(a.slice(2), process.argv[++i]);
}

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
ledger.acknowledgements ??= [];

const acknowledgedSlots = () => new Set(ledger.acknowledgements.map((a) => a.scheduled_for));

if (args.get("list") === true || !args.has("slot")) {
  const done = acknowledgedSlots();
  const open = ledger.missed_slots.filter((m) => !done.has(m.scheduled_for));
  process.stdout.write(`${ledger.missed_slots.length} recorded gap(s), ${open.length} awaiting acknowledgement\n`);
  for (const m of ledger.missed_slots) {
    const ack = ledger.acknowledgements.find((a) => a.scheduled_for === m.scheduled_for);
    process.stdout.write(
      `  ${m.scheduled_for}  ${ack ? `acknowledged by ${ack.acknowledged_by} on ${ack.acknowledged_at.slice(0, 10)}` : "AWAITING ACKNOWLEDGEMENT"}\n`,
    );
  }
  if (!args.has("slot")) process.exit(0);
}

const slot = args.get("slot");
const known = ledger.missed_slots.find((m) => m.scheduled_for === slot);
if (!known) {
  process.stderr.write(`no recorded gap for ${slot}. Acknowledging a slot the collector never flagged would assert a review of something that was never missed.\n`);
  process.exit(2);
}
if (acknowledgedSlots().has(slot)) {
  process.stderr.write(`${slot} is already acknowledged; acknowledgements are recorded once and never rewritten.\n`);
  process.exit(2);
}

const by =
  args.get("by") ??
  (() => {
    try {
      return execFileSync("git", ["config", "user.name"], { encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  })();
if (!by) {
  process.stderr.write("could not determine who is acknowledging; pass --by \"Name\"\n");
  process.exit(2);
}

ledger.acknowledgements.push({
  scheduled_for: slot,
  acknowledged_by: by,
  acknowledged_at: `${new Date().toISOString().slice(0, 19)}Z`,
  note: args.get("note") ?? "Gap reviewed and accepted. No observation exists for this slot and none is created by this acknowledgement.",
  effect: "record_of_human_review_only_no_data_created",
});

// Derived from the acknowledgements above, which remain the authority.
const done = acknowledgedSlots();
for (const m of ledger.missed_slots) m.operator_acknowledged = done.has(m.scheduled_for);

ledger.acknowledgement_rule =
  "Acknowledgements are appended to the acknowledgements array with who accepted the gap and when; operator_acknowledged on each missed slot is derived from them. Acknowledging records that a human has seen and accepted an unobserved slot. It never creates, infers or backfills an observation, and the day remains a gap in every derived series whether acknowledged or not.";

writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
process.stdout.write(`\nacknowledged ${slot} by ${by}\n`);
process.stdout.write(`${ledger.missed_slots.filter((m) => !m.operator_acknowledged).length} gap(s) still awaiting acknowledgement\n`);
