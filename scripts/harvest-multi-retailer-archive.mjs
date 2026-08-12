// Deterministic bulk harvester for archived UK retailer 32GB (2x16GB) DDR5
// product pages, covering CCL Online, AWD-IT and Novatech. It is the
// multi-retailer counterpart to harvest-scan-archive.mjs and follows the same
// rule: identity, price, kit shape and VAT state come from visible or labelled
// fields in the fetched bytes, or they are recorded as abstentions with a
// reason code. Nothing is inferred, and a URL slug is never the authority for
// what a product is.
//
// Retailer-specific hazards this encodes, each established from real captures
// rather than assumed:
//
//  - CCL renders a JSON-LD price on sold-out pages that show no price at all.
//    A price nobody could have paid is not an observable offer, so a displayed
//    figure is required. CCL's JSON-LD price also carries full precision
//    (101.64282 against a displayed £101.64), so the displayed figure is
//    authoritative and the JSON-LD value is only a cross-check.
//  - CCL's page header holds a VAT toggle ("inc VAT" beside TaxSwitch(false))
//    whose label could be read as either the current mode or the switch
//    target. It is NOT used. The determination comes from the inline "inc VAT"
//    label sitting immediately after the price inside pnlPriceText.
//  - AWD-IT (Magento) renders both a VAT-inclusive finalPrice and a
//    VAT-exclusive basePrice. Taking the wrong one understates by 1/6.
//  - AWD-IT's itemprop="sku" is its own internal stock code (173-B87-AF9), not
//    the MPN — the same trap as Scan's LN126476. The MPN is the title suffix,
//    and is only accepted when the URL slug independently confirms it.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&pound;/g, "£")
    .replace(/&amp;/g, "&")
    .replace(/&#x20;/g, " ")
    .replace(/&#x28;/g, "(")
    .replace(/&#x29;/g, ")")
    .replace(/\s+/g, " ")
    .trim();

// A displayed money figure may be split across tags (£ 101 .64), so tags are
// stripped before matching and stray inner spaces are tolerated.
function poundsToMinor(text) {
  const m = text.match(/£\s*([\d,]+)\s*\.\s*(\d{2})/);
  if (!m) return null;
  return Number(m[1].replace(/,/g, "")) * 100 + Number(m[2]);
}

// Kit shape must be stated in the page's own visible text.
function kitShapeFrom(text, out) {
  // Retailers word this as "32GB (2x16GB)", "32GB Kit (2 x 16GB)" and — AWD-IT
  // and KingstonMemoryShop among them — with the factors reversed as
  // "32GB (16GB x2)". Both orderings must be accepted: requiring only the first
  // silently rejected live AWD-IT pages that state the kit shape perfectly
  // clearly. A short run of plain words is tolerated between the two figures,
  // with digits and brackets excluded from that gap so the match cannot
  // straddle a neighbouring product's capacity.
  if (/\b32\s*GB\b[^()\d]{0,12}\(?\s*(?:2\s*x\s*16\s*GB|16\s*GB\s*x\s*2)\s*\)?/i.test(text)) {
    out.capacity_gb = 32;
    out.module_count = 2;
  } else out.reasons.push("CAPACITY_NOT_VISIBLE");
  if (!/DDR5/i.test(text)) out.reasons.push("DDR5_NOT_CONFIRMED");
}

// --- CCL Online -------------------------------------------------------------

export function extractCcl(html) {
  const out = { reasons: [] };

  const title = html.match(/<h1[^>]*>([\s\S]{0,240}?)<\/h1>/i);
  out.title = title ? strip(title[1]) : "";
  kitShapeFrom(out.title, out);

  // Identity: the visible part-number heading is the authority; JSON-LD is an
  // independent cross-check and a disagreement is fatal, never silently
  // resolved in favour of one of them.
  const visible = html.match(/id="pnlPartNumber"[^>]*>\s*<h2[^>]*>\s*([A-Z0-9][A-Z0-9._\/-]{4,})\s*<\/h2>/i);
  const ld = html.match(/"mpn"\s*:\s*"([^"]{5,60})"/i);
  const vMpn = visible ? visible[1].trim().toUpperCase() : null;
  const lMpn = ld ? ld[1].trim().toUpperCase() : null;
  if (vMpn && lMpn && vMpn !== lMpn) out.reasons.push("MPN_SOURCES_DISAGREE");
  out.mpn = vMpn ?? lMpn ?? null;
  if (!out.mpn) out.reasons.push("MPN_NOT_VISIBLE");
  else if (!vMpn) out.reasons.push("MPN_NOT_VISIBLE_ONLY_STRUCTURED");

  // Availability first: a sold-out CCL page renders no price, and its JSON-LD
  // price must not be promoted into an observation.
  const soldOut = /soldout-box/.test(html) || /schema\.org\/OutOfStock/i.test(html);
  out.availability = soldOut ? "Sold out" : /schema\.org\/InStock/i.test(html) ? "In stock" : null;

  const region = html.indexOf('id="pnlPriceText"');
  if (region === -1) {
    out.reasons.push("PRICE_NOT_VISIBLE");
    if (soldOut) out.reasons.push("SOLD_OUT_NO_DISPLAYED_PRICE");
  } else {
    const block = strip(html.slice(region, region + 700));
    const minor = poundsToMinor(block);
    if (minor === null) out.reasons.push("PRICE_NOT_VISIBLE");
    else out.amount_minor = minor;

    // VAT from the label adjacent to the displayed price, not the header toggle.
    const near = block.slice(0, 220);
    if (/inc\.?\s*VAT/i.test(near)) out.vat_included = true;
    else if (/ex\.?\s*VAT/i.test(near)) out.vat_included = false;
    else {
      out.vat_included = null;
      out.reasons.push("VAT_DISPLAY_MODE_NOT_VISIBLE");
    }

    const ldPrice = html.match(/"price"\s*:\s*([\d.]+)/);
    if (ldPrice && out.amount_minor != null) {
      // Rounded, because CCL's structured price carries more precision than
      // the figure it displays.
      out.structured_price_agrees = Math.round(Number(ldPrice[1]) * 100) === out.amount_minor;
      if (!out.structured_price_agrees) out.reasons.push("PRICE_SOURCES_DISAGREE");
    }
  }
  return out;
}

// --- AWD-IT -----------------------------------------------------------------

export function extractAwdit(html, url = "") {
  const out = { reasons: [] };

  const title = html.match(/<h1[^>]*class="page-title"[^>]*>([\s\S]{0,320}?)<\/h1>/i);
  out.title = title ? strip(title[1]) : "";
  kitShapeFrom(out.title, out);

  // Identity: AWD-IT publishes no MPN microdata (itemprop="sku" is its own
  // stock code), so the MPN is read from the title suffix and only accepted
  // when the URL slug independently carries the same token.
  const suffix = out.title.split(/\s+-\s+/).pop();
  const candidate = suffix && /^[A-Z0-9][A-Z0-9._\/-]{5,}$/i.test(suffix.trim()) ? suffix.trim().toUpperCase() : null;
  if (!candidate) out.reasons.push("MPN_NOT_VISIBLE");
  else {
    const slug = url.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (slug.includes(candidate.toLowerCase().replace(/[^a-z0-9]/g, ""))) {
      out.mpn = candidate;
      out.mpn_basis = "title_suffix_confirmed_by_url";
    } else out.reasons.push("MPN_NOT_CONFIRMED_BY_URL");
  }

  // Price. An AWD-IT product page carries ~200 price-including-tax elements,
  // almost all of them grid widgets for unrelated products, and the first in
  // document order is a strikethrough old-price for a prebuilt PC. Matching on
  // that class alone read £1399.99 for a £239.99 memory kit. The main product
  // is instead identified by itemprop="price", which appears exactly once.
  const priceTags = [...html.matchAll(/itemprop="price"\s+content="([\d.]+)"/gi)];
  if (priceTags.length !== 1) {
    out.reasons.push(priceTags.length === 0 ? "PRICE_NOT_VISIBLE" : "PRICE_AMBIGUOUS_MULTIPLE_ITEMPROP");
  } else {
    out.amount_minor = Math.round(Number(priceTags[0][1]) * 100);
  }

  // VAT. Magento renders a VAT-inclusive finalPrice beside a VAT-exclusive
  // basePrice, so the determination has to prove which of the two the recorded
  // figure is. Locating the main product by id is not reliable across AWD-IT's
  // templates — on later pages the dataLayer sku reads
  // "TRUSTPILOT_SKU_VALUE_37707,603-9FC-680" rather than a bare number, and
  // falling back to data-product-id picks up an unrelated grid widget.
  //
  // Instead the pair itself is the evidence: find the inclusive element whose
  // amount equals the recorded price, and require its same-id exclusive sibling
  // to be that amount net of VAT. A grid item that coincidentally shares the
  // price cannot corrupt the recorded figure, which comes from itemprop, and
  // cannot change the conclusion, which is the same either way.
  if (out.amount_minor != null) {
    const pairs = [...html.matchAll(
      /id="price-including-tax-product-price-(\d+)"[\s\S]{0,240}?data-price-amount="([\d.]+)"/gi,
    )];
    for (const [, id, incAmt] of pairs) {
      if (Math.round(Number(incAmt) * 100) !== out.amount_minor) continue;
      const exc = html.match(
        new RegExp(`id="price-excluding-tax-product-price-${id}"[\\s\\S]{0,240}?data-price-amount="([\\d.]+)"`, "i"),
      );
      if (!exc) continue;
      const excMinor = Math.round(Number(exc[1]) * 100);
      // Tolerance absorbs Magento's unrounded base figure (199.99166566667).
      if (Math.abs(Math.round(excMinor * 1.2) - out.amount_minor) <= 3) {
        out.vat_included = true;
        out.vat_basis = "inclusive_exclusive_pair_reconciled";
        out.product_id = id;
        out.ex_vat_minor = excMinor;
        break;
      }
    }
  }
  if (out.vat_included == null) {
    out.vat_included = null;
    out.reasons.push("VAT_DISPLAY_MODE_NOT_VISIBLE");
  }

  const avail = html.match(/class="stock (available|unavailable)"/i);
  out.availability = avail ? (avail[1].toLowerCase() === "available" ? "In stock" : "Out of stock") : null;
  return out;
}

// --- Novatech ---------------------------------------------------------------

export function extractNovatech(html) {
  const out = { reasons: [] };

  const title = html.match(/<h1[^>]*>([\s\S]{0,300}?)<\/h1>/i);
  out.title = title ? strip(title[1]) : "";
  kitShapeFrom(out.title, out);

  const mpn = html.match(/itemprop="mpn"\s+content="([^"]{4,60})"/i);
  if (mpn) out.mpn = mpn[1].trim().toUpperCase();
  else out.reasons.push("MPN_NOT_VISIBLE");

  const price = html.match(/itemprop="price"\s+content="([\d.]+)"/i);
  if (price) out.amount_minor = Math.round(Number(price[1]) * 100);
  else out.reasons.push("PRICE_NOT_VISIBLE");

  // Novatech shows both figures with explicit wording. The inc-VAT figure is
  // the one carried in the price microdata; that is confirmed per capture by
  // checking the stated ex-VAT figure against it rather than assumed.
  const text = strip(html);
  const exVat = text.match(/£\s*([\d,]+\.\d{2})\s*ex vat/i);
  if (/inc vat/i.test(text)) {
    out.vat_included = true;
    out.vat_basis = "labelled_inc_vat_text";
    if (exVat && out.amount_minor != null) {
      const exMinor = Math.round(Number(exVat[1].replace(/,/g, "")) * 100);
      out.ex_vat_consistent = Math.abs(Math.round(exMinor * 1.2) - out.amount_minor) <= 2;
      if (!out.ex_vat_consistent) out.reasons.push("VAT_ARITHMETIC_INCONSISTENT");
    }
  } else {
    out.vat_included = null;
    out.reasons.push("VAT_DISPLAY_MODE_NOT_VISIBLE");
  }

  const avail = html.match(/>(Out of stock|Pre-order|In Stock|In stock)</i);
  out.availability = avail ? strip(avail[1]) : null;
  return out;
}

// --- Overclockers UK --------------------------------------------------------

export function extractOcuk(html) {
  const out = { reasons: [] };

  const title = html.match(/<h1[^>]*>([\s\S]{0,260}?)<\/h1>/i);
  out.title = title ? strip(title[1]) : "";
  kitShapeFrom(out.title, out);

  // Identity from JSON-LD. Deliberately NOT "sku" — that is Overclockers' own
  // stock code (MY-008-GI), which also forms the URL suffix, so neither the sku
  // nor the slug identifies the product across retailers.
  const mpn = html.match(/"mpn"\s*:\s*"([^"]{4,60})"/i);
  if (mpn) out.mpn = mpn[1].trim().toUpperCase();
  else out.reasons.push("MPN_NOT_VISIBLE");

  // Price and VAT together. The page carries two figures whose ratio is exactly
  // 1.2 — an inc-VAT one as a quoted JSON string and an ex-VAT one as a bare
  // number. Telling them apart by JSON quoting would be far too fragile, so the
  // displayed element is used instead: price-current carries the figure and the
  // adjacent price-incl-vat-info span states "(incl. VAT)" in visible text.
  // data-qa="price-current" alone is not enough: it also marks carousel items,
  // and taking the first occurrence read £649.99 from a neighbouring product on
  // a £119.94 memory kit. The product's own price lives in the CTA box, so that
  // is the anchor and everything else is read from within it.
  const anchor = html.indexOf("js-ck-product-cta-box-price");
  if (anchor === -1) out.reasons.push("PRICE_NOT_VISIBLE");
  else {
    const box = html.slice(anchor, anchor + 700);
    const attr = box.match(/data-price=['"]([\d.]+)['"]/i);

    // On a discounted product the box holds two figures: price-original (the
    // struck-through was-price) followed by price-current. Taking the first £
    // in the box therefore recorded the pre-discount price on every sale item,
    // biasing those observations upward. The current price is read from its own
    // labelled element, and a box without one is an abstention rather than a
    // guess at which figure was meant.
    const current = box.match(/data-qa="price-current"[^>]*>([\s\S]{0,90}?)<\/span>/i);
    const minor = current ? poundsToMinor(strip(current[1])) : null;
    if (minor === null) out.reasons.push("PRICE_NOT_VISIBLE");
    else out.amount_minor = minor;

    // Retained as provenance: it records that the capture showed a discount,
    // and is never substituted for the price actually being asked.
    const original = box.match(/data-qa="price-original"[^>]*>([\s\S]{0,90}?)<\/span>/i);
    if (original) out.was_price_minor = poundsToMinor(strip(original[1]));

    // The displayed figure and the box's own data-price attribute must agree.
    if (attr && out.amount_minor != null && Math.round(Number(attr[1]) * 100) !== out.amount_minor) {
      out.reasons.push("PRICE_SOURCES_DISAGREE");
    }

    if (/price-incl-vat-info/i.test(box) && /incl\.?\s*VAT/i.test(strip(box))) {
      out.vat_included = true;
      out.vat_basis = "labelled_price_incl_vat_info_adjacent_to_price";
    } else if (/excl\.?\s*VAT/i.test(strip(box))) out.vat_included = false;
    else {
      out.vat_included = null;
      out.reasons.push("VAT_DISPLAY_MODE_NOT_VISIBLE");
    }

    // Third independent check against the schema.org Offer.
    const offer = html.match(/"@type"\s*:\s*"Offer"[\s\S]{0,200}?"price"\s*:\s*"([\d.]+)"/i);
    if (offer && out.amount_minor != null) {
      out.structured_price_agrees = Math.round(Number(offer[1]) * 100) === out.amount_minor;
      if (!out.structured_price_agrees) out.reasons.push("PRICE_SOURCES_DISAGREE");
    }
  }

  out.availability = /schema\.org\/InStock/i.test(html)
    ? "In stock"
    : /schema\.org\/OutOfStock/i.test(html)
      ? "Out of stock"
      : null;
  return out;
}

export const EXTRACTORS = { ccl: extractCcl, awdit: extractAwdit, novatech: extractNovatech, ocuk: extractOcuk };

// --- harness ----------------------------------------------------------------

async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "silicon-forecast-research/1.0" },
        signal: AbortSignal.timeout(90000),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(5000 * (i + 1));
        continue;
      }
      return { status: res.status, body: await res.text() };
    } catch {
      await sleep(3000 * (i + 1));
    }
  }
  return { status: 0, body: "" };
}

const IS_MAIN = import.meta.url === `file://${process.argv[1]}`;

if (IS_MAIN) {
  const targetsFile = process.argv[2];
  const outFile = process.argv[3];
  if (!targetsFile || !outFile) {
    process.stderr.write("usage: harvest-multi-retailer-archive.mjs <targets.json> <out.json> [retailer...]\n");
    process.exit(2);
  }
  const only = process.argv.slice(4);
  const targets = JSON.parse(readFileSync(targetsFile, "utf8"));

  const done = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : { results: [] };
  const seen = new Set(done.results.map((r) => `${r.retailer}|${r.original}|${r.timestamp}`));

  const queue = [];
  for (const [retailer, list] of Object.entries(targets)) {
    if (only.length && !only.includes(retailer)) continue;
    if (!EXTRACTORS[retailer]) continue;
    for (const t of list) queue.push({ retailer, ...t });
  }
  process.stdout.write(`${queue.length} url-months queued (${seen.size} already done)\n`);

  let ok = 0;
  let unusable = 0;
  for (const [i, t] of queue.entries()) {
    if (seen.has(`${t.retailer}|${t.original}|${t.timestamp}`)) continue;
    const res = await getText(`https://web.archive.org/web/${t.timestamp}id_/${t.original}`);
    if (res.status !== 200 || res.body.length < 2000) {
      done.results.push({ ...t, http_status: res.status, reasons: ["FETCH_FAILED_OR_EMPTY"] });
      unusable += 1;
    } else {
      const parsed = EXTRACTORS[t.retailer](res.body, t.original);
      done.results.push({
        ...t,
        http_status: res.status,
        response_bytes: Buffer.byteLength(res.body),
        response_sha256: sha256(res.body),
        ...parsed,
      });
      if (parsed.mpn && parsed.amount_minor && parsed.capacity_gb === 32 && parsed.vat_included != null) ok += 1;
      else unusable += 1;
    }
    if (i % 25 === 0) {
      writeFileSync(outFile, JSON.stringify(done, null, 1));
      process.stdout.write(`  ${i}/${queue.length}  usable=${ok} unusable=${unusable}\n`);
    }
    await sleep(400);
  }
  writeFileSync(outFile, JSON.stringify(done, null, 1));
  process.stdout.write(`DONE ${done.results.length} records, usable=${ok}, unusable=${unusable}\n`);
}
