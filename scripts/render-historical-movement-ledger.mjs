import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  ELIGIBLE_TRANCHES,
  normaliseObservation,
  applyVatResolutions,
  VAT_RESOLUTION_FILE,
} from "../lib/historical-observed-price-envelope.mjs";
import { deriveHistoricalMovements } from "../lib/historical-movement-explanations.mjs";

const root = new URL("../", import.meta.url);

export function deriveMovementsFromRepository(base = root) {
  const records = [];
  for (const tranche of ELIGIBLE_TRANCHES) {
    const parsed = JSON.parse(
      readFileSync(new URL(`data/observations/candidate/${tranche.file}`, base), "utf8"),
    );
    for (const raw of parsed.observations) {
      records.push(normaliseObservation(raw, { sourceFile: tranche.file, captureKind: tranche.captureKind }));
    }
  }
  const resolution = JSON.parse(readFileSync(new URL(VAT_RESOLUTION_FILE, base), "utf8"));
  const resolved = applyVatResolutions(records, resolution.resolutions, resolution.resolution_id);
  return deriveHistoricalMovements(resolved);
}

function main() {
  const movements = deriveMovementsFromRepository(root);

  const targetDir = new URL("research/evidence/historical-movement-explanations-2026-08-10/", root);
  mkdirSync(targetDir, { recursive: true });
  const target = new URL("ledger.v1.json", targetDir);

  const ledger = {
    schema_version: 1,
    ledger_id: "sf-historical-movement-explanations-2026-08-10",
    status: "candidate_private_immutable",
    created_at: "2026-08-10",
    movements,
    explanations: [],
    explanations_pending_reason:
      "The research half of this task (locating, fetching, hashing and evaluating dated " +
      "reportable sources for each movement, and running a genuine counterevidence search) " +
      "was deferred deliberately for session capacity reasons. It is not deferred because no " +
      "counterevidence exists, and it is not a signal that the movements above are unexplained " +
      "by anything real. The empty explanations array reflects work not yet attempted, not a " +
      "completed null result.",
    governance: {
      research_performed: false,
      sources_fetched: false,
      sources_hashed: false,
      counterevidence_search_performed: false,
      causal_language_reviewed: false,
      publication_eligible: false,
    },
  };

  writeFileSync(target, `${JSON.stringify(ledger, null, 2)}\n`);
  process.stdout.write(`wrote ${movements.length} movements (0 explanations) to ${target.pathname}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
