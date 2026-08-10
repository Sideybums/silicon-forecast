import { writeFileSync } from "node:fs";
import { buildEnvelopeFromRepository, canonicalEnvelopeBytes } from "../lib/historical-observed-price-envelope.mjs";

const root = new URL("../", import.meta.url);
const target = new URL("data/fixtures/historical-observed-price-envelope.v1.json", root);
const envelope = buildEnvelopeFromRepository(root);
writeFileSync(target, canonicalEnvelopeBytes(envelope));
const observed = envelope.periods.filter((p) => p.state === "observed").length;
process.stdout.write(`wrote ${envelope.periods.length} quarters (${observed} observed) to ${target.pathname}\n`);
