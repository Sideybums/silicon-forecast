import assert from "node:assert/strict";
import test from "node:test";
import {
  SCHEDULE,
  collectTarget,
  detectMissedSlots,
  extractKingstonMemoryShop,
  isAllowedByRobots,
  runCollection,
} from "../lib/canonical-collector.mjs";

// A stub response so no test ever touches the network.
const reply = (body, status = 200) => ({ status, url: "https://example.test/p", text: async () => body });

const KMS_PAGE = `
<h1 class="mobile-product-name">32GB (16GB x2) Kingston FURY Beast KF560C36BWE2K2-32 DDR5 6000MT/s Memory DIMM - White</h1>
<div>Model: <span>KF560C36BWE2K2-32</span></div>
<div itemprop="offers" itemscope itemtype="http://schema.org/Offer">
  <link itemprop="availability" href="http://schema.org/InStock" />
  <div itemprop="priceCurrency" content="GBP">
    <span itemprop="price" content="531.57"> &pound;531.57 <span>(inc. VAT)</span></span>
    &pound;442.98 (ex. VAT)
  </div>
</div>
<div class="product-grid-item"><span>&pound;40.27 <span>(inc. VAT)</span></span></div>
<div>Andorra FedEx/TNT Express - 3-5 Business Days* &pound;35.99</div>`;

test("KingstonMemoryShop reads price, identity, VAT and stock from the offer scope", () => {
  const r = extractKingstonMemoryShop(KMS_PAGE);
  assert.deepEqual(r.reasons, []);
  assert.equal(r.mpn, "KF560C36BWE2K2-32");
  assert.equal(r.amount_minor, 53157);
  assert.equal(r.vat_included, true);
  assert.equal(r.capacity_gb, 32);
  assert.equal(r.module_count, 2);
  assert.equal(r.availability, "In stock");
});

test("a delivery charge or a grid tile can never become the price", () => {
  // The page states £35.99 delivery and a £40.27 related product. Neither may
  // be mistaken for the £531.57 the product actually costs.
  const r = extractKingstonMemoryShop(KMS_PAGE);
  assert.notEqual(r.amount_minor, 3599);
  assert.notEqual(r.amount_minor, 4027);
  assert.equal(r.amount_minor, 53157);
});

test("a discontinued line abstains instead of reporting a stray figure", () => {
  const page = KMS_PAGE.replace("<div itemprop=\"offers\"", "<div>Discontinued - Contact Us For Alternative</div><div itemprop=\"offers\"");
  const r = extractKingstonMemoryShop(page);
  assert.ok(r.reasons.includes("PRODUCT_DISCONTINUED"));
});

test("laptop memory is rejected even when the capacity matches", () => {
  const page = KMS_PAGE.replace("Memory DIMM - White", "Non-ECC Memory SODIMM");
  const r = extractKingstonMemoryShop(page);
  assert.ok(r.reasons.includes("NOT_A_DESKTOP_DIMM"));
});

test("an inconsistent ex-VAT figure is flagged rather than trusted", () => {
  const page = KMS_PAGE.replace("442.98", "999.99");
  const r = extractKingstonMemoryShop(page);
  assert.ok(r.reasons.includes("VAT_ARITHMETIC_INCONSISTENT"));
});

test("robots.txt disallow is honoured, and the most specific rule wins", () => {
  assert.equal(isAllowedByRobots("", "/anything"), true);
  assert.equal(isAllowedByRobots("User-agent: *\nDisallow: /", "/product/x"), false);
  assert.equal(isAllowedByRobots("User-agent: *\nDisallow: /admin", "/product/x"), true);
  assert.equal(isAllowedByRobots("User-agent: *\nDisallow: /admin", "/admin/x"), false);
  // Longer, more specific Allow beats a broad Disallow.
  assert.equal(isAllowedByRobots("User-agent: *\nDisallow: /\nAllow: /product", "/product/x"), true);
  // A group naming our agent takes precedence over the wildcard group.
  assert.equal(
    isAllowedByRobots("User-agent: *\nDisallow: /\n\nUser-agent: silicon-forecast-collector\nAllow: /", "/p"),
    true,
  );
  assert.equal(
    isAllowedByRobots("User-agent: *\nAllow: /\n\nUser-agent: silicon-forecast-collector\nDisallow: /", "/p"),
    false,
  );
  // Comments and blank lines must not break parsing.
  assert.equal(isAllowedByRobots("# hello\n\nUser-agent: *\nDisallow: /x # trailing", "/x/y"), false);
});

test("a disallowed target is not fetched at all", async () => {
  let fetched = 0;
  const r = await collectTarget(
    { mpn: "KF560C36BWE2K2-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/p" },
    {
      fetchImpl: async () => { fetched += 1; return reply(KMS_PAGE); },
      robotsFor: async () => "User-agent: *\nDisallow: /",
    },
  );
  assert.deepEqual(r.reasons, ["ROBOTS_DISALLOWED"]);
  assert.equal(r.usable, undefined);
  assert.equal(fetched, 0, "a disallowed URL must not be requested");
});

test("a URL that now serves a different product is refused, not recorded", async () => {
  // Retailers re-slug URLs. Trusting the URL rather than the page is how a
  // series silently acquires another product's prices.
  const r = await collectTarget(
    { mpn: "SOMETHING-ELSE-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/p" },
    { fetchImpl: async () => reply(KMS_PAGE), robotsFor: async () => "" },
  );
  assert.ok(r.reasons.includes("MPN_MISMATCH_URL_MAY_HAVE_MOVED"));
  assert.equal(r.usable, false);
});

test("a good target is collected with its bytes bound by hash", async () => {
  const r = await collectTarget(
    { mpn: "KF560C36BWE2K2-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/p" },
    { fetchImpl: async () => reply(KMS_PAGE), robotsFor: async () => "" },
  );
  assert.equal(r.usable, true);
  assert.equal(r.amount_minor, 53157);
  assert.match(r.response_sha256, /^[0-9a-f]{64}$/u);
  assert.ok(r.response_bytes > 0);
});

test("a non-200 response abstains and reports the status", async () => {
  const r = await collectTarget(
    { mpn: "X-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/p" },
    { fetchImpl: async () => reply("", 404), robotsFor: async () => "" },
  );
  assert.deepEqual(r.reasons, ["HTTP_404"]);
});

test("a network failure abstains rather than throwing the run away", async () => {
  const r = await collectTarget(
    { mpn: "X-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/p" },
    { fetchImpl: async () => { throw new Error("ECONNRESET"); }, robotsFor: async () => "" },
  );
  assert.deepEqual(r.reasons, ["FETCH_FAILED"]);
  assert.match(r.error, /ECONNRESET/u);
});

test("an unknown seller abstains instead of guessing a parser", async () => {
  const r = await collectTarget(
    { mpn: "X-32", seller_display_name: "Some New Shop", url: "https://example.test/p" },
    { fetchImpl: async () => reply(KMS_PAGE), robotsFor: async () => "" },
  );
  assert.deepEqual(r.reasons, ["NO_EXTRACTOR_FOR_SELLER"]);
});

test("one failing target does not abort the rest of the run", async () => {
  const targets = [
    { mpn: "KF560C36BWE2K2-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/a" },
    { mpn: "BROKEN-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/b" },
    { mpn: "KF560C36BWE2K2-32", seller_display_name: "KingstonMemoryShop", url: "https://www.kingstonmemoryshop.co.uk/c" },
  ];
  const results = await runCollection(targets, {
    delayMs: 0,
    fetchImpl: async (url) => (url.endsWith("/b") ? reply("", 500) : reply(KMS_PAGE)),
  });
  assert.equal(results.length, 3);
  assert.equal(results.filter((r) => r.usable).length, 2);
  assert.deepEqual(results[1].reasons, ["HTTP_500"]);
});

// --- missed-slot detection --------------------------------------------------

test("a day the machine was asleep is recorded as a missed slot", () => {
  // Ran Monday 11:30, next run Thursday 14:00. Tuesday and Wednesday are gone
  // and must be recorded; launchd only ever catches up once.
  const missed = detectMissedSlots("2026-08-10T11:30:00", new Date(2026, 7, 13, 14, 0), SCHEDULE);
  assert.deepEqual(missed, ["2026-08-11T11:30:00", "2026-08-12T11:30:00"]);
});

test("consecutive daily runs report no missed slots", () => {
  assert.deepEqual(detectMissedSlots("2026-08-11T11:30:00", new Date(2026, 7, 12, 11, 30), SCHEDULE), []);
});

test("a run before its own day's slot leaves that slot outstanding", () => {
  // Ran at 09:00, so that day's 11:30 slot went unserved. The following day's
  // slot is not a miss: the run happening now is the one serving it.
  const missed = detectMissedSlots("2026-08-11T09:00:00", new Date(2026, 7, 12, 14, 0), SCHEDULE);
  assert.deepEqual(missed, ["2026-08-11T11:30:00"]);
});

test("the slot the current run is serving is never recorded as missed", () => {
  // Otherwise every ordinary run — launchd fires a few minutes late — would
  // stamp a false gap on the day it actually collected.
  assert.deepEqual(detectMissedSlots("2026-08-11T11:30:00", new Date(2026, 7, 12, 11, 32), SCHEDULE), []);
  assert.deepEqual(detectMissedSlots("2026-08-11T11:30:00", new Date(2026, 7, 12, 23, 59), SCHEDULE), []);
});

test("a run after its own day's slot does not re-report that slot", () => {
  const missed = detectMissedSlots("2026-08-11T14:00:00", new Date(2026, 7, 12, 12, 0), SCHEDULE);
  assert.deepEqual(missed, []);
});

test("a long outage records every missing day, not just one", () => {
  // Aug 2 through Aug 11 are unrecoverable; Aug 12 is served by this run.
  const missed = detectMissedSlots("2026-08-01T11:30:00", new Date(2026, 7, 12, 14, 0), SCHEDULE);
  assert.equal(missed.length, 10);
  assert.equal(missed[0], "2026-08-02T11:30:00");
  assert.equal(missed.at(-1), "2026-08-11T11:30:00");
});

test("with no previous run there is nothing to call missed", () => {
  assert.deepEqual(detectMissedSlots(null, new Date(2026, 7, 12, 14, 0), SCHEDULE), []);
});

test("missed-slot detection validates its inputs", () => {
  assert.throws(() => detectMissedSlots("2026-08-11T11:30:00", "not a date"), /must be a valid Date/u);
  assert.throws(() => detectMissedSlots("nonsense", new Date()), /not a valid instant/u);
});

// --- kit-shape wording ------------------------------------------------------

test("both orderings of the kit shape are recognised", async () => {
  const { extractAwdit } = await import("../scripts/harvest-multi-retailer-archive.mjs");
  const page = (title) => `
    <h1 class="page-title"><span itemprop="name">${title}</span></h1>
    <meta itemprop="price" content="123.45" />
    <span id="price-including-tax-product-price-99" data-price-amount="123.45"></span>
    <span id="price-excluding-tax-product-price-99" data-price-amount="102.88"></span>
    <script>{"sku": "99"}</script>`;
  const url = "https://www.awd-it.co.uk/x-32gb-16gb-x2-ddr5-f5-6000j3636f16gx2-fx5.html";

  // AWD-IT's live wording puts the module count second. Requiring only
  // "(2x16GB)" rejected real pages that state the shape unambiguously.
  const reversed = extractAwdit(page("G.SKILL FLARE X5 32GB (16GB x2) DDR5 6000MT/s CL36 - F5-6000J3636F16GX2-FX5"), url);
  assert.equal(reversed.capacity_gb, 32);
  assert.equal(reversed.module_count, 2);
  assert.ok(!reversed.reasons.includes("CAPACITY_NOT_VISIBLE"));

  const forward = extractAwdit(page("G.SKILL FLARE X5 32GB (2x16GB) DDR5 6000MT/s CL36 - F5-6000J3636F16GX2-FX5"), url);
  assert.equal(forward.capacity_gb, 32);

  // A genuinely different kit must still be refused.
  const wrong = extractAwdit(page("G.SKILL FLARE X5 64GB (16GB x4) DDR5 6000MT/s CL36 - F5-6000J3636F16GX2-FX5"), url);
  assert.ok(wrong.reasons.includes("CAPACITY_NOT_VISIBLE"));
});

// --- established kit shape --------------------------------------------------

const SCAN_NO_SHAPE = `
<h1 itemprop="name">CORSAIR Vengeance Black 32GB 6000MHz DDR5 Memory Kit</h1>
<span itemprop="mpn">CMK32GX5M2B6000C36</span> Manufacturer code: CMK32GX5M2B6000C36
<span itemprop="price" content="523.99"></span>
<a data-action="vatToggle" data-exvat="false">inc VAT</a>
<div>In stock</div>`;

const shapes = () =>
  new Map([["CMK32GX5M2B6000C36", { capacity_gb: 32, module_count: 2, established_by: "sf-hist-scan-x-2023" }]]);

test("a shape established for the MPN rescues a page that no longer states it", async () => {
  // Scan's live template dropped the module count. Without carry-forward every
  // Scan target abstains forever despite Scan being the largest source.
  const r = await collectTarget(
    { mpn: "CMK32GX5M2B6000C36", seller_display_name: "Scan Computers", url: "https://www.scan.co.uk/products/x" },
    { fetchImpl: async () => reply(SCAN_NO_SHAPE), robotsFor: async () => "", establishedShapes: shapes() },
  );
  assert.equal(r.usable, true);
  assert.equal(r.capacity_gb, 32);
  assert.equal(r.capacity_basis, "established_for_mpn_from_prior_evidence");
  assert.equal(r.capacity_basis_reference, "sf-hist-scan-x-2023");
  // The waiver stays auditable rather than vanishing.
  assert.ok(r.shape_reasons_waived.includes("CAPACITY_NOT_VISIBLE"));
});

test("a page that states the shape itself is recorded as having done so", async () => {
  const withShape = SCAN_NO_SHAPE.replace(
    "<h1 itemprop=\"name\">CORSAIR Vengeance Black 32GB",
    "<h2 itemprop=\"description\">32GB (2x16GB) CORSAIR DDR5 Vengeance</h2><h1 itemprop=\"name\">CORSAIR Vengeance Black 32GB",
  );
  const r = await collectTarget(
    { mpn: "CMK32GX5M2B6000C36", seller_display_name: "Scan Computers", url: "https://www.scan.co.uk/products/x" },
    { fetchImpl: async () => reply(withShape), robotsFor: async () => "", establishedShapes: shapes() },
  );
  assert.equal(r.capacity_basis, "visible_on_page");
  assert.equal(r.shape_reasons_waived, undefined);
});

test("an MPN with no established shape still abstains", async () => {
  const r = await collectTarget(
    { mpn: "CMK32GX5M2B6000C36", seller_display_name: "Scan Computers", url: "https://www.scan.co.uk/products/x" },
    { fetchImpl: async () => reply(SCAN_NO_SHAPE), robotsFor: async () => "", establishedShapes: new Map() },
  );
  assert.equal(r.usable, false);
  assert.ok(r.reasons.includes("CAPACITY_NOT_VISIBLE"));
  assert.equal(r.capacity_basis, null);
});

test("a moved URL cannot inherit the shape of the product that used to be there", async () => {
  // Identity is checked before any carry-forward, so a re-slugged page serving
  // a different product can never borrow the target's established shape.
  const r = await collectTarget(
    { mpn: "SOME-OTHER-MPN-32", seller_display_name: "Scan Computers", url: "https://www.scan.co.uk/products/x" },
    { fetchImpl: async () => reply(SCAN_NO_SHAPE), robotsFor: async () => "", establishedShapes: shapes() },
  );
  assert.equal(r.usable, false);
  assert.ok(r.reasons.includes("MPN_MISMATCH_URL_MAY_HAVE_MOVED"));
  assert.equal(r.capacity_basis, null);
});

test("the waiver never rescues a page with a different problem", async () => {
  // Only the two shape reasons may be waived. A missing price must still fail.
  const noPrice = SCAN_NO_SHAPE.replace('<span itemprop="price" content="523.99"></span>', "");
  const r = await collectTarget(
    { mpn: "CMK32GX5M2B6000C36", seller_display_name: "Scan Computers", url: "https://www.scan.co.uk/products/x" },
    { fetchImpl: async () => reply(noPrice), robotsFor: async () => "", establishedShapes: shapes() },
  );
  assert.equal(r.usable, false);
  assert.ok(r.reasons.includes("PRICE_NOT_VISIBLE"), `reasons were ${JSON.stringify(r.reasons)}`);
  assert.equal(r.capacity_basis, null, "shape must not be carried forward past an unrelated failure");
});

test("only evidence that saw the shape on the page may establish it", async () => {
  const { buildEstablishedKitShapes } = await import("../lib/canonical-collector.mjs");
  const shapeMap = buildEstablishedKitShapes([
    {
      observations: [
        {
          observation_id: "seen",
          observed_at: "2023-01-01T00:00:00Z",
          product: { mpn: "SEEN-32", capacity_gb: 32, module_count: 2 },
          eligibility: { capacity_basis: "visible_on_page" },
        },
        {
          observation_id: "inherited",
          observed_at: "2023-01-01T00:00:00Z",
          product: { mpn: "INHERITED-32", capacity_gb: 32, module_count: 2 },
          // Already carried forward once; must not become a source of truth.
          eligibility: { capacity_basis: "established_from_sibling_capture" },
        },
      ],
    },
  ]);
  assert.ok(shapeMap.has("SEEN-32"));
  assert.ok(!shapeMap.has("INHERITED-32"), "a carried-forward shape must not re-establish itself");
});
