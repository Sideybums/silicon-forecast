#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderPrivateCandidateRetailReport } from "../lib/primary-retail-report.mjs";

function usageError() {
  throw new Error("usage: node scripts/render-private-candidate-retail-report.mjs <candidate-retail.json>");
}

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) usageError();

const inputPath = resolve(args[0]);
const fixture = JSON.parse(await readFile(inputPath, "utf8"));
process.stdout.write(renderPrivateCandidateRetailReport(fixture));
