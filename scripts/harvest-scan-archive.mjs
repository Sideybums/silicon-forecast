// Deterministic bulk harvester for archived Scan Computers 32GB (2x16GB) DDR5
// product pages. Enumerates every capture per URL via the Wayback CDX API, then
// fetches each capture and extracts identity, price, VAT display mode and
// availability from visible/labelled fields only.
//
// Never infers a price, capacity or VAT state. Anything not present in the
// fetched bytes is recorded as an abstention with a reason code.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const OUT = new URL("./scan-harvest.json", import.meta.url);
const CDX = "https://web.archive.org/cdx/search/cdx";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "silicon-forecast-research/1.0" } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(4000 * (i + 1));
        continue;
      }
      return { status: res.status, body: await res.text() };
    } catch {
      await sleep(2500 * (i + 1));
    }
  }
  return { status: 0, body: "" };
}

// --- extraction -------------------------------------------------------------

const strip = (s) => s.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function extractScan(html) {
  const out = { reasons: [] };

  // Identity from schema.org microdata, which is the same value rendered under
  // the visible "Manufacturer code:" label. Deliberately NOT itemprop="sku" —
  // that is Scan's own internal stock code (e.g. LN126476), not the MPN.
  const mpn = html.match(/itemprop="mpn"[^>]*>\s*([A-Z0-9][A-Z0-9._\/-]{4,})\s*</i);
  if (mpn) out.mpn = mpn[1].trim().toUpperCase();
  else out.reasons.push("MPN_NOT_VISIBLE");
  // Guard: the label must also be present, so a page that carries mpn microdata
  // without displaying it is not silently treated as visible evidence.
  if (mpn && !/Manufacturer code:/i.test(html)) out.reasons.push("MPN_LABEL_NOT_VISIBLE");

  // Capacity and module count from the visible description heading.
  const desc = html.match(/<h2[^>]*itemprop="description"[^>]*>([\s\S]{0,300}?)<\/h2>/i);
  const descText = desc ? strip(desc[1]) : "";
  out.description = descText;
  if (/\b32GB\s*\(\s*2\s*x\s*16GB\s*\)/i.test(descText)) {
    out.capacity_gb = 32;
    out.module_count = 2;
  } else out.reasons.push("CAPACITY_NOT_VISIBLE");
  if (!/DDR5/i.test(descText)) out.reasons.push("DDR5_NOT_CONFIRMED");

  const title = html.match(/<h1[^>]*itemprop="name"[^>]*>([\s\S]{0,200}?)<\/h1>/i);
  out.title = title ? strip(title[1]) : "";

  // Price: schema.org microdata, which mirrors the displayed figure.
  const price = html.match(/itemprop="price"\s+content="([\d]+\.\d{2})"/i);
  if (price) out.amount_minor = Math.round(Number(price[1]) * 100);
  else out.reasons.push("PRICE_NOT_VISIBLE");

  // VAT display mode. data-exvat="false" => the rendered price INCLUDES VAT.
  const toggle = html.match(/data-action="vatToggle"\s+data-exvat="(true|false)"/i);
  if (toggle) out.vat_included = toggle[1].toLowerCase() === "false";
  else {
    out.vat_included = null;
    out.reasons.push("VAT_DISPLAY_MODE_NOT_VISIBLE");
  }

  const avail = html.match(/title="Item in stock">\s*([^<]{2,40})/i)
    || html.match(/>(Out of stock|Pre-order|Awaiting stock|In stock)</i);
  out.availability = avail ? strip(avail[1]) : null;

  return out;
}

// --- main -------------------------------------------------------------------

const IS_MAIN = import.meta.url === `file://${process.argv[1]}`;

if (IS_MAIN && process.argv[2] === "selftest") {
  const f = new URL("./scan-20220703173438.html", import.meta.url);
  const r = extractScan(readFileSync(f, "utf8"));
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

if (!IS_MAIN) {
  // imported for testing: do not run the harvest
} else {

const cdxUrl = `${CDX}?url=scan.co.uk/products/32gb-2x16gb*&output=json&from=2021&to=2026&filter=statuscode:200&limit=4000`;
process.stdout.write("enumerating captures...\n");
const idx = await getText(cdxUrl);
const rows = JSON.parse(idx.body || "[]").slice(1).filter((r) => /ddr5/i.test(r[2]));

// One fetch per URL per calendar month keeps the series dense without
// re-fetching near-duplicate same-day captures.
const wanted = new Map();
for (const [, timestamp, original] of rows) {
  const key = `${original.split("?")[0]}|${timestamp.slice(0, 6)}`;
  if (!wanted.has(key)) wanted.set(key, { timestamp, original: original.split("?")[0] });
}
const targets = [...wanted.values()];
process.stdout.write(`${rows.length} capture rows -> ${targets.length} url-months to fetch\n`);

const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { results: [] };
const seen = new Set(done.results.map((r) => `${r.original}|${r.timestamp}`));

let ok = 0;
let skipped = 0;
for (const [i, t] of targets.entries()) {
  const id = `${t.original}|${t.timestamp}`;
  if (seen.has(id)) continue;
  const url = `https://web.archive.org/web/${t.timestamp}id_/${t.original}`;
  const res = await getText(url);
  if (res.status !== 200 || res.body.length < 2000) {
    done.results.push({ ...t, http_status: res.status, reasons: ["FETCH_FAILED_OR_EMPTY"] });
    skipped += 1;
  } else {
    const parsed = extractScan(res.body);
    done.results.push({
      ...t,
      http_status: res.status,
      response_bytes: Buffer.byteLength(res.body),
      response_sha256: sha256(res.body),
      ...parsed,
    });
    if (parsed.mpn && parsed.amount_minor && parsed.capacity_gb === 32) ok += 1;
    else skipped += 1;
  }
  if (i % 20 === 0) {
    writeFileSync(OUT, JSON.stringify(done, null, 1));
    process.stdout.write(`  ${i}/${targets.length}  usable=${ok} unusable=${skipped}\n`);
  }
  await sleep(320);
}
writeFileSync(OUT, JSON.stringify(done, null, 1));
process.stdout.write(`DONE ${done.results.length} records, usable=${ok}, unusable=${skipped}\n`);

}
