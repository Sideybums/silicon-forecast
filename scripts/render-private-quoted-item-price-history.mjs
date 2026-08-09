#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildQuotedItemPriceHistory,
  renderQuotedItemPriceHistoryHtml,
  renderQuotedItemPriceHistorySvg,
} from "../lib/private-quoted-item-price-history.mjs";

const DEFAULT_ARCHIVE = "data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json";
const DEFAULT_CURRENT = "data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json";
const DEFAULT_OUTPUT = "research/reports/private-quoted-item-price-history-2026-08-09";

function usageError() {
  throw new Error("usage: node scripts/render-private-quoted-item-price-history.mjs [archive.json current.json output-prefix]");
}

const args = process.argv.slice(2);
if (![0, 3].includes(args.length) || args.some((arg) => arg.startsWith("-"))) usageError();
const [archivePath, currentPath, outputPrefix] = (args.length === 0 ? [DEFAULT_ARCHIVE, DEFAULT_CURRENT, DEFAULT_OUTPUT] : args).map((path) => resolve(path));
const loadJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const history = buildQuotedItemPriceHistory(await Promise.all([loadJson(archivePath), loadJson(currentPath)]));
const svg = renderQuotedItemPriceHistorySvg(history);
const html = renderQuotedItemPriceHistoryHtml(history, svg);
await mkdir(dirname(outputPrefix), { recursive: true });
await Promise.all([
  writeFile(`${outputPrefix}.svg`, svg, "utf8"),
  writeFile(`${outputPrefix}.html`, html, "utf8"),
]);
process.stdout.write(`Rendered ${history.observationCount} retained observations across ${history.lines.length} private quoted-item-price lines.\n${outputPrefix}.svg\n${outputPrefix}.html\n`);
