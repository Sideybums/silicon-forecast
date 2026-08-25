import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { buildDailyMarketDataset } from "../lib/daily-market.ts";
import { publicationGate, seriesIsPublic } from "../lib/publication-gate.ts";

// What the public site is allowed to say.
//
// The previous version of this file pinned exact sentences and exact bytes of
// the stylesheet. That made it a very good regression net for a site that never
// changed and a very bad one for a site that had to. These tests assert
// properties that dishonest output cannot satisfy instead: that a withheld
// series leaves no trace of its numbers, that no marker claims causation, that
// every source is credited, that unexplained movements stay counted, and that a
// category with no data cannot render as though it had some.
//
// Every assertion below is written to hold in *both* gate states. The gate is
// read, not assumed, so the same suite proves the closed build is closed and the
// open build is honest.

const REGISTRY = readFileSync("lib/components-registry.ts", "utf8");
const INDEX = JSON.parse(readFileSync("data/public-projection/index-ram.v1.json", "utf8"));
const PRODUCTS = JSON.parse(readFileSync("data/public-projection/products-ram.v1.json", "utf8"));
const EVENTS = JSON.parse(readFileSync("data/public-projection/events-ram.v1.json", "utf8"));
const OFFERS = JSON.parse(readFileSync("data/public-offers/offers-ram.v1.json", "utf8"));
const DAILY_MARKET = buildDailyMarketDataset(OFFERS);
const PROJECTION_FILES = globSync("data/public-projection/**/*.json");

const isPublic = seriesIsPublic();

/**
 * Whether `out/` was built from the sources and gate config as they stand now.
 *
 * These assertions compare a rendered build against the gate that produced it,
 * so a build left over from a different gate state would fail them for the wrong
 * reason — reporting a leak where there is only a stale artefact. `npm run
 * build` rebuilds immediately before running this file, so there the check is
 * always fresh and the invariants run for real. A bare `npm test` may find an
 * old directory, and says so rather than crying wolf.
 */
function buildIsStale() {
  if (!existsSync("out/index.html")) return true;
  const built = statSync("out/index.html").mtimeMs;
  const inputs = globSync([
    "app/**/*",
    "components/**/*",
    "lib/**/*",
    "config/*.json",
    "data/public-projection/*.json",
    "data/public-offers/*.json",
  ]).filter((file) => statSync(file).isFile());
  return inputs.some((file) => statSync(file).mtimeMs > built);
}

const htmlFiles = existsSync("out")
  ? globSync("out/**/*.html").filter((file) => statSync(file).isFile())
  : [];
const pages = new Map(htmlFiles.map((file) => [file, readFileSync(file, "utf8")]));
const allHtml = [...pages.values()].join("\n");
const needsBuild = htmlFiles.length === 0
  ? "static build not present"
  : buildIsStale()
    ? "static build is older than its inputs — run npm run build"
    : false;

// Local source-only test runs remain convenient, but a release caller can make
// rendered assertions mandatory. In that mode stale or absent output is an
// error, never a skip that can accidentally bless yesterday's export.
const requireFreshBuild = process.env.SF_REQUIRE_FRESH_BUILD === "1";
const renderedSkip = requireFreshBuild ? false : needsBuild;
test("release-mode rendered checks have a fresh static build", () => {
  if (!requireFreshBuild) return;
  assert.equal(needsBuild, false, needsBuild || "expected a fresh static build");
});

function pagesUnder(prefix) {
  return [...pages].filter(([file]) => file.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// 1. Gate honesty, measured by absence
// ---------------------------------------------------------------------------

test("a private aggregate series renders no index geometry or period-labelled levels", { skip: renderedSkip }, () => {
  if (isPublic) {
    assert.ok(allHtml.includes("index-chart"), "an open aggregate gate must render its chart");
    return;
  }
  assert.equal(allHtml.includes("index-chart"), false, "the aggregate gate is closed but index geometry rendered");
  for (const period of INDEX.periods) {
    assert.equal(allHtml.includes(period.period_id), false, `${period.period_id} leaked from the private aggregate series`);
  }
});

// ---------------------------------------------------------------------------
// 2. The gate fails closed
// ---------------------------------------------------------------------------

test("publication activation is structurally unavailable during recovery", () => {
  for (const env of [undefined, "withheld", "approved", "public", "true", "1"]) {
    const decision = publicationGate({
      configPath: "/tmp/attacker-release.json",
      manifestPath: "/tmp/attacker-manifest.json",
      reviewsDir: "/tmp/attacker-reviews",
      env,
    });
    assert.equal(decision.isPublic, false);
    assert.match(decision.reason, /not implemented/u);
  }

  // Whatever the build state, any approval reference is never rendered:
  // approval and review identifiers are a banned key class.
  const config = JSON.parse(readFileSync("config/public-release.v1.json", "utf8"));
  if (config.approval_ref) assert.equal(allHtml.includes(config.approval_ref), false);
});

// ---------------------------------------------------------------------------
// 3. No marker claims causation
// ---------------------------------------------------------------------------

const CAUSAL = /\b(caused|because of|due to|drove|triggered|led to|resulted in)\b/iu;
const ALLOWED_CAUSAL_LEVELS = new Set(["temporal_association_only", "contributory_hypothesis", "reported_by_publisher"]);

test("no event marker claims that an article explains a price movement", () => {
  for (const marker of EVENTS.markers) {
    assert.ok(
      ALLOWED_CAUSAL_LEVELS.has(marker.causal_language_level),
      `${marker.marker_id} uses causal language level ${marker.causal_language_level}`,
    );
  }
  // The site's own words around an event must not read as a causal claim. A
  // publisher's headline is exempt because rewriting someone's title to suit our
  // caveats would be worse than the risk it removes.
  const eventCopy = readFileSync("components/chart/EventLine.tsx", "utf8");
  assert.doesNotMatch(eventCopy, CAUSAL);
  assert.match(eventCopy, /Temporal association only/u);
});

test("no page uses causal language of its own", { skip: renderedSkip }, () => {
  const quoted = EVENTS.markers.flatMap((m) => [m.source.title, m.source.publisher, m.source.author]);
  for (const [file, content] of pages) {
    const ours = quoted.reduce((text, phrase) => text.split(phrase).join(" "), content);
    assert.doesNotMatch(ours, CAUSAL, `${file} states a cause in the site's own words`);
  }
});

// ---------------------------------------------------------------------------
// 4. Attribution is complete, and every marker is a real outbound link
// ---------------------------------------------------------------------------

test("every marker credits a title, a publisher and an author or its explicit absence", () => {
  for (const marker of EVENTS.markers) {
    const { source } = marker;
    assert.ok(source.title?.trim(), `${marker.marker_id} has no title`);
    assert.ok(source.publisher?.trim(), `${marker.marker_id} has no publisher`);
    assert.ok(
      source.author?.trim(),
      `${marker.marker_id} has no author and no statement that the publisher named none`,
    );
    assert.ok(source.published_on?.trim(), `${marker.marker_id} has no publication date`);
    assert.match(source.url, /^https:\/\//u, `${marker.marker_id} does not link to an https original`);
    assert.doesNotMatch(source.url, /fixture\.invalid/u, `${marker.marker_id} links to a fixture host`);
  }
});

test("outbound source links and markers correspond exactly", { skip: renderedSkip }, () => {
  const linked = new Set();
  for (const content of pages.values()) {
    for (const match of content.matchAll(/<a[^>]*href="([^"]+)"[^>]*rel="nofollow noopener external"/gu)) {
      linked.add(match[1]);
    }
  }
  const expected = new Set(EVENTS.markers.map((marker) => marker.source.url));
  // No orphan link that no marker accounts for, and no marker the reader cannot
  // follow back to whoever wrote it.
  assert.deepEqual([...linked].sort(), [...expected].sort());
});

// ---------------------------------------------------------------------------
// 5. Unexplained movements stay visible
// ---------------------------------------------------------------------------

test("explained and unexplained movements account for every movement", () => {
  assert.equal(
    EVENTS.explained_movement_count + EVENTS.unexplained_movement_count,
    EVENTS.movement_count,
    "movements were dropped between the ledger and the public count",
  );
  assert.equal(EVENTS.explained_movement_count, EVENTS.markers.length);
});

test("private candidate movement counts are withheld with the closed series", { skip: renderedSkip }, () => {
  const research = pages.get("out/research/index.html");
  assert.ok(research, "expected the research page");
  assert.match(research, /No event-line data is public yet/iu);
  assert.doesNotMatch(research, new RegExp(`${EVENTS.movement_count} price movements`, "u"));
});

// ---------------------------------------------------------------------------
// 6. Geometry safety
// ---------------------------------------------------------------------------

const TWO_DECIMALS = /\d\.\d{2}(?!\d)/u;

test("no two-decimal value exists in the public projection", () => {
  for (const file of PROJECTION_FILES) {
    const content = readFileSync(file, "utf8");
    assert.doesNotMatch(content, TWO_DECIMALS, `${file} contains a two-decimal value`);
  }
});

test("factual observation charts render points without invented connecting geometry", { skip: renderedSkip }, () => {
  const productPages = pagesUnder("out/price-history/ram/").filter(([file]) => file.split("/").length === 5);
  assert.equal(productPages.length, OFFERS.products.length);
  for (const [file, content] of productPages) {
    const svgs = [...content.matchAll(/<svg[\s\S]*?<\/svg>/gu)].map((match) => match[0]);
    assert.equal(svgs.length, 1, `${file} should render one raw-observation plot`);
    assert.match(svgs[0], /viewBox="/u);
    assert.doesNotMatch(svgs[0], /<svg[^>]*\swidth="/u);
    assert.match(svgs[0], /<circle/u, `${file} has no observation points`);
    assert.doesNotMatch(svgs[0], /<(?:path|polyline)\b/u, `${file} joins sparse observations`);
    assert.match(content, /points are not a continuous series/iu, `${file} does not explain the point legend`);
    assert.match(svgs[0], /aria-label="Dated price observations"/u, `${file} has no accessible point group`);
  }
  if (!isPublic) assert.equal(allHtml.includes("index-chart"), false);
});

// ---------------------------------------------------------------------------
// 7. Money reaches public output only through the factual-offer contract
// ---------------------------------------------------------------------------

const MONEY_KEY = /minor|amount|price|gbp|cost/iu;

test("the public projection is a money-free zone", () => {
  const offending = [];
  const walk = (value, at, file) => {
    if (Array.isArray(value)) return value.forEach((item, i) => walk(item, `${at}[${i}]`, file));
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (MONEY_KEY.test(key)) offending.push(`${file}${at}.${key}`);
        walk(child, `${at}.${key}`, file);
      }
      return;
    }
    if (typeof value === "string" && /£|\bGBP\b/u.test(value)) offending.push(`${file}${at} = ${value}`);
  };
  for (const file of PROJECTION_FILES) walk(JSON.parse(readFileSync(file, "utf8")), "", file);
  assert.deepEqual(offending, [], "money reached the public projection");
});

test("every rendered currency amount comes from the approved factual-offer payload or its approved daily calculation", { skip: renderedSkip }, () => {
  const approved = new Set(OFFERS.observations.map((item) => `£${(item.item_price_minor / 100).toFixed(2)}`));
  for (const point of DAILY_MARKET.points) {
    for (const amount of [point.low_minor, point.typical_minor, point.high_minor]) approved.add(`£${(amount / 100).toFixed(2)}`);
  }
  const rendered = [...allHtml.matchAll(/£\d+(?:,\d{3})*\.\d{2}/gu)].map((match) => match[0].replace(",", ""));
  assert.ok(rendered.length > 0, "the useful offer release rendered no prices");
  for (const amount of rendered) assert.ok(approved.has(amount), `${amount} is neither an approved factual offer nor an approved daily derivation`);
  assert.doesNotMatch(allHtml, /\bGBP\s*\d/u);
});

test("the homepage and RAM workspace expose the approved daily dashboard without opening the formal index", { skip: renderedSkip }, () => {
  for (const file of ["out/index.html", "out/price-history/ram/index.html"]) {
    const content = pages.get(file);
    assert.ok(content, `missing ${file}`);
    assert.match(content, /Daily market snapshot · RAM/u);
    assert.match(content, /Latest typical observed price/u);
    assert.match(content, /not the whole UK market/iu);
    assert.match(content, /No reviewed market events published yet/u);
    assert.match(content, /<legend>Chart range<\/legend>/u);
    assert.match(content, /daily-market-chart/u);
    assert.equal(content.includes("index-chart"), false, `${file} opened the formal aggregate index`);
  }
  const dashboardSource = readFileSync("components/dashboard/DailyMarketDashboard.tsx", "utf8");
  assert.doesNotMatch(dashboardSource, /Observed days|unobserved calendar/u);
  assert.match(dashboardSource, /Monthly average of daily typical prices/u);
  assert.match(dashboardSource, /range === "3M" \|\| range === "1Y" \|\| range === "ALL"/u);
});

test("retailer matrix and spotlight surface are explicit, accessible and bounded", () => {
  const roster = JSON.parse(readFileSync("data/public-offers/retailer-comparison-ram.v1.json", "utf8"));
  assert.equal(roster.retailers.length, 8);
  assert.deepEqual(roster.spotlight_labels, ["Lower retained observation", "Middle retained observation", "Higher retained observation"]);
  const pageSource = readFileSync("app/price-history/[slug]/page.tsx", "utf8");
  assert.match(pageSource, /selectSpotlightOffers/u);
  assert.match(pageSource, /<OfferMatrix/u);
  const matrixSource = readFileSync("components/offers/OfferMatrix.tsx", "utf8");
  for (const required of ["<caption>", "scope=\"col\"", "scope=\"row\"", "tabIndex={0}", "A blank does not mean unavailable"]) assert.ok(matrixSource.includes(required), required);
  assert.match(matrixSource, /target="_blank"/u);
  assert.match(matrixSource, /rel="noopener noreferrer"/u);
});

test("daily dashboard evidence and derived values resolve only to approved factual observations", () => {
  const approvedIds = new Set(OFFERS.observations.map((item) => item.public_observation_id));
  const approvedUrls = new Set(OFFERS.observations.map((item) => item.source_url));
  for (const point of DAILY_MARKET.points) {
    assert.ok(point.typical_minor >= point.low_minor && point.typical_minor <= point.high_minor);
    assert.ok(point.product_count <= point.declared_product_count);
    for (const evidence of [...point.low_evidence, ...point.high_evidence]) {
      assert.ok(approvedIds.has(evidence.public_observation_id));
      assert.ok(approvedUrls.has(evidence.source_url));
    }
  }
  assert.equal(DAILY_MARKET.excluded.sentinel_price_count, 0);
});

const decodeHtml = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#x27;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");
const textFromHtml = (value) => decodeHtml(value.replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim();
const offerDate = (value) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London", timeZoneName: "short",
}).format(new Date(value));
const offerPrice = (minor) => `£${(minor / 100).toFixed(2)}`;

test("offer links preserve approved MPN, retailer, capture, price and URL tuples", { skip: renderedSkip }, () => {
  const approvedUrls = new Set(OFFERS.observations.map((item) => item.source_url));

  for (const product of OFFERS.products) {
    const file = `out/price-history/ram/${product.mpn}/index.html`;
    const content = pages.get(file);
    assert.ok(content, `missing offer history page for ${product.mpn}`);
    const rows = [...content.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gu)].map((match) => match[1]);

    for (const item of OFFERS.observations.filter((observation) => observation.mpn === product.mpn)) {
      const matching = rows.filter((row) => {
        const href = row.match(/<a[^>]*href="([^"]+)"[^>]*target="_blank"/u)?.[1];
        const text = textFromHtml(row);
        return href && decodeHtml(href) === item.source_url
          && text.includes(item.retailer_name)
          && text.includes(offerDate(item.observed_at))
          && text.includes(offerPrice(item.item_price_minor));
      });
      assert.equal(
        matching.length,
        1,
        `rendered offer tuple drifted: ${[product.mpn, item.retailer_name, item.observed_at, item.item_price_minor, item.source_url].join(" | ")}`,
      );
    }

    for (const match of content.matchAll(/<a([^>]*)href="([^"]+)"([^>]*)target="_blank"([^>]*)>/gu)) {
      const href = decodeHtml(match[2]);
      assert.ok(approvedUrls.has(href), `${file} has an external offer link outside the approved payload: ${href}`);
    }
  }
});

test("archive and direct-retailer actions describe the source they open", { skip: renderedSkip }, () => {
  const approvedByUrl = new Map(OFFERS.observations.map((item) => [item.source_url, item]));
  let waybackLinks = 0;
  for (const [file, content] of pages) {
    for (const match of content.matchAll(/<a[^>]*href="([^"]+)"[^>]*target="_blank"[^>]*>([\s\S]*?)<\/a>/gu)) {
      const href = decodeHtml(match[1]);
      const item = approvedByUrl.get(href);
      if (!item) continue;
      const action = textFromHtml(match[2]);
      if (href.startsWith("https://web.archive.org/web/")) {
        waybackLinks += 1;
        assert.equal(item.observation_kind, "archived_retail_observation", `${file} has an untyped Wayback link`);
        assert.match(action, /Open archived snapshot/iu, `${file} disguises a Wayback action as a live source`);
        const rowStart = content.lastIndexOf("<tr", match.index);
        const cardStart = content.lastIndexOf('<article class="offer-card', match.index);
        const blockStart = Math.max(rowStart, cardStart);
        const rowEnd = content.indexOf("</tr>", match.index);
        const cardEnd = content.indexOf("</article>", match.index);
        const candidateEnds = [rowEnd, cardEnd].filter((position) => position >= match.index);
        const blockEnd = candidateEnds.length ? Math.min(...candidateEnds) : match.index + match[0].length;
        const sourceBlock = content.slice(Math.max(0, blockStart), blockEnd);
        assert.match(sourceBlock, /Archived snapshot/iu, `${file} has a Wayback link without a visible archive label`);
      } else {
        assert.equal(item.observation_kind, "direct_retail_observation", `${file} has a direct URL typed as an archive`);
        assert.match(action, /Visit retailer/iu, `${file} labels a direct retailer action incorrectly`);
        assert.doesNotMatch(action, /archived snapshot/iu);
      }
    }
  }
  assert.ok(waybackLinks > 0, "the archive wording test found no rendered Wayback links");
  assert.doesNotMatch(allHtml, />\s*(?:In stock|Available to order)\s*</u, "availability is presented without capture qualification");
});

test("every new-tab link prevents opener access", { skip: renderedSkip }, () => {
  for (const [file, content] of pages) {
    for (const match of content.matchAll(/<a([^>]*)target="_blank"([^>]*)>/gu)) {
      const attributes = `${match[1]} ${match[2]}`;
      const rel = attributes.match(/rel="([^"]+)"/u)?.[1]?.split(/\s+/u) ?? [];
      assert.ok(rel.includes("noopener"), `${file} has target=_blank without rel=noopener`);
    }
  }
});

// ---------------------------------------------------------------------------
// 8. No invented coverage
// ---------------------------------------------------------------------------

function registryEntries() {
  // Read the registry as data rather than importing TypeScript into every test
  // context: slug and dataset are all that is needed and both are literals.
  return [...REGISTRY.matchAll(/slug:\s*"([a-z0-9-]+)"[\s\S]*?dataset:\s*(null|"[a-z0-9-]+")/gu)].map((m) => ({
    slug: m[1],
    dataset: m[2] === "null" ? null : m[2].slice(1, -1),
  }));
}

test("a category with no observations renders no chart and says so", { skip: renderedSkip }, () => {
  const entries = registryEntries();
  assert.ok(entries.length >= 2, "expected the registry to parse");
  assert.ok(entries.some((entry) => entry.dataset === null), "expected at least one uncollected category");

  for (const entry of entries.filter((e) => e.dataset === null)) {
    const [[file, content]] = pagesUnder(`out/price-history/${entry.slug}/`);
    assert.ok(content.includes("No observations collected"), `${file} does not state that nothing was collected`);
    assert.ok(content.includes("No category research underway"), `${file} implies category research has started`);
    assert.equal(content.includes("index-chart"), false, `${file} renders an index chart with no data behind it`);
    assert.equal(content.includes("collection-chart"), false, `${file} implies collection has started`);
  }
});

test("RAM exposes factual price history without making the private index a user-facing caveat", { skip: renderedSkip }, () => {
  const ram = pages.get("out/price-history/ram/index.html");
  assert.ok(ram, "expected the RAM workspace");
  assert.match(ram, /Validated retail prices and exact-product histories are public\./u);
  assert.doesNotMatch(ram, /aggregate RAM index|No publishable index point|index withheld/iu);
  assert.match(ram, /Visit retailer/u);
  assert.equal(ram.includes("index-chart"), false, "closed aggregate RAM index rendered numerical geometry");
  assert.equal(isPublic, false, "factual offer publication must not open the aggregate methodology gate");
});

test("the number of factual-offer product pages equals the approved products exactly", { skip: renderedSkip }, () => {
  const productPages = globSync("out/price-history/*/*/index.html");
  const named = productPages.map((file) => file.split("/").at(-2));
  assert.deepEqual(
    [...named].sort(),
    OFFERS.products.map((product) => product.mpn).sort(),
    "factual-offer product pages and approved products have drifted apart",
  );
});

test("a product whose observations stopped early says so wherever it is drawn", { skip: renderedSkip }, () => {
  if (!isPublic) return;

  // 15 of the 20 products showing a fall stop being observed before the 2025
  // surge. Drawn on their own span they looked identical to a product still
  // being followed, so a series that ended before the market moved read as a
  // price that had fallen and stayed down. Every sparkline is now drawn on the
  // dataset's full span and the unobserved stretch is shaded, but the visual
  // alone is not enough: the fact must survive in text.
  const latest = PRODUCTS.products
    .map((product) => product.last_month)
    .filter(Boolean)
    .sort()
    .at(-1);
  const stale = PRODUCTS.products.filter((product) => product.last_month && product.last_month < latest);
  assert.ok(stale.length > 0, "expected some products to have stopped being observed");

  for (const product of stale) {
    const page = pages.get(`out/price-history/ram/${product.mpn}/index.html`);
    assert.ok(page, `no page for ${product.mpn}`);
    assert.ok(
      page.includes(product.last_month),
      `${product.mpn} never states the month its observations stop`,
    );
  }

  // And the shared axis is genuinely shared: a stale series must be marked in
  // the markup, not merely drawn slightly shorter.
  const listing = pages.get("out/price-history/ram/index.html");
  assert.match(listing, /data-ends-early="true"/u, "no product is marked as having stopped early");
});

// ---------------------------------------------------------------------------
// 9. Parameters travel with the index, wherever it appears
// ---------------------------------------------------------------------------

test("every page showing the index also shows how it was built", { skip: renderedSkip }, () => {
  const charted = [...pages].filter(([, content]) => content.includes('class="index-chart"'));
  if (isPublic) assert.ok(charted.length > 0, "an open gate must render the index somewhere");

  for (const [file, content] of charted) {
    assert.ok(content.includes("chart-caveat"), `${file} shows the index with no disclosure attached`);
    assert.match(content, /Every product counts equally/u, `${file} does not state the weighting`);
    assert.match(content, /the line stops rather than bridging/u, `${file} does not state the gap policy`);
    if (!INDEX.parameters_public.approved) {
      assert.match(
        content,
        /research figure, not an approved statistic/u,
        `${file} shows an unapproved index without saying so`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 10. Methodology moved, not duplicated
// ---------------------------------------------------------------------------

// The operator's requirement was that methodology leave the homepage, not that
// it be copied to a second location. A claim that exists in two places has no
// single current version, so these strings are pinned to exactly one page.
const METHODOLOGY_ONLY = [
  "VAT-inclusive landed price",
  "Four required checks before any future public price enters.",
  "retailer of record",
];

test("methodology lives on the methodology page and nowhere else", { skip: renderedSkip }, () => {
  const methodology = [...pages].filter(([file]) => file.startsWith("out/methodology/"));
  assert.equal(methodology.length, 1, "expected exactly one methodology page");
  const [, methodologyHtml] = methodology[0];

  for (const claim of METHODOLOGY_ONLY) {
    assert.ok(methodologyHtml.includes(claim), `the methodology page does not carry: ${claim.slice(0, 60)}`);
    for (const [file, content] of pages) {
      if (file.startsWith("out/methodology/")) continue;
      assert.equal(content.includes(claim), false, `${file} repeats a methodology claim: ${claim.slice(0, 60)}`);
    }
  }

  const home = pages.get("out/index.html");
  assert.ok(home, "expected a homepage");
  assert.match(home, /href="\/methodology\/?"/u, "the homepage does not link to the methodology");
});

// ---------------------------------------------------------------------------
// 11. The projection is deterministic
// ---------------------------------------------------------------------------

test("regenerating the public projection reproduces the committed bytes", () => {
  execFileSync(process.execPath, ["scripts/build-public-site-data.mjs", "--check"], { stdio: "pipe" });
});

// ---------------------------------------------------------------------------
// Structure that replaced the byte-pinned stylesheet
// ---------------------------------------------------------------------------
//
// The tests these replace pinned exact CSS declarations and did catch real
// mobile-layout regressions. These do not: an explicit narrow-viewport rule can
// exist and still be wrong. The 390px and 1440px checks in the release checklist
// are what actually cover that, and this only proves the rules were not deleted.

test("the stylesheet still carries explicit narrow-viewport rules", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /@media\(max-width:650px\)/u, "the narrow-viewport breakpoint is gone");
  assert.match(css, /@media\(max-width:900px\)/u, "the intermediate breakpoint is gone");
  for (const selector of [".index-chart", ".method-figures", ".product-list"]) {
    assert.ok(css.includes(selector), `${selector} has no styling at all`);
  }
});

// ---------------------------------------------------------------------------
// Publisher, deploy and channel controls carried forward unchanged
// ---------------------------------------------------------------------------

test("affiliate verification is network-neutral and honest", () => {
  const source = globSync(["app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts"])
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  assert.match(source, /affiliate-network-verification/u);
  for (const network of ["Awin", "Webgains", "CJ Affiliate"]) assert.match(source, new RegExp(network, "u"));
  assert.match(source, /multiple affiliate networks/iu);
  assert.doesNotMatch(source, /Affiliate partnerships provided through/iu);
});

test("the public frontend is retail-first and exposes no deferred channel", () => {
  const source = globSync(["app/**/*.tsx", "components/**/*.tsx", "lib/site.ts", "lib/components-registry.ts"])
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const about = readFileSync("app/about/page.tsx", "utf8");
  const disclosure = readFileSync("app/affiliate-disclosure/page.tsx", "utf8");
  assert.match(readFileSync("app/page.tsx", "utf8"), /Primary retail only/u);
  assert.match(about, /ordinary, uncompensated links/iu);
  assert.match(disclosure, /ordinary, uncompensated links/iu);
  assert.match(about, /future affiliate link will be[^.]*labelled/iu);
  assert.match(disclosure, /future affiliate link will be[^.]*labelled/iu);
  assert.doesNotMatch(`${about}\n${disclosure}`, /No outbound product links are currently published/iu);
  assert.doesNotMatch(`${about}\n${disclosure}`, /(?:approved|endorsed|partnered) (?:by|with) (?:a |any )?(?:retailer|affiliate|network)/iu);
  assert.doesNotMatch(source, /marketplace|second-hand|resale/iu);
  assert.doesNotMatch(source, /ObservedPriceBoard|MarketChannelCharts/u);
});

test("required publisher routes exist", () => {
  for (const route of ["about", "contact", "privacy", "affiliate-disclosure", "price-history", "research", "methodology"]) {
    assert.ok(readFileSync(`app/${route}/page.tsx`, "utf8").length > 300, `${route} is missing or empty`);
  }
});

test("the project email is operational", () => {
  const contact = readFileSync("app/contact/page.tsx", "utf8");
  assert.match(contact, /active project address/iu);
  assert.doesNotMatch(contact, /will become active|must be purchased|non-working contact route/iu);
});

test("no tracking package", () => {
  assert.doesNotMatch(
    readFileSync("package.json", "utf8"),
    /google-analytics|gtag|plausible|posthog|segment|facebook-pixel/iu,
  );
});

test("Cloudflare target remains static and deployment is bound to the approved dashboard preview", () => {
  const config = readFileSync("wrangler.jsonc", "utf8");
  assert.match(config, /"directory"\s*:\s*"\.\/out"/u);
  assert.doesNotMatch(config, /opennext/iu);
  assert.match(config, /"pattern"\s*:\s*"siliconforecast\.com"/u);
  assert.match(config, /"pattern"\s*:\s*"www\.siliconforecast\.com"/u);
  assert.match(config, /"custom_domain"\s*:\s*true/u);
  const deploy = JSON.parse(readFileSync("package.json", "utf8")).scripts.deploy;
  assert.equal(deploy, "node scripts/deploy-approved-public-preview.mjs");
  const approval = JSON.parse(readFileSync("config/factual-offer-deployment-approval.v1.json", "utf8"));
  assert.equal(approval.status, "approved");
  const approvedKeys = ["factual_offers", "retailer_links", "raw_exact_mpn_history", "daily_market_dashboard", "empty_event_line", "retailer_comparison"];
  const lockedKeys = ["aggregate_index", "methodology", "basket", "baseline", "historical_reference", "deflator", "research_publication", "recommendations", "paid_affiliate_tracking", "new_product_approval", "source_family_approval", "threshold_selection", "current_price_or_stock_claims", "causal_claims", "production_database_mutation"];
  if (approval.decision === "deploy_factual_offers_and_retailer_comparison_public_preview") {
    assert.deepEqual(Object.keys(approval.scope), [...approvedKeys, ...lockedKeys]);
    for (const approved of approvedKeys) assert.equal(approval.scope[approved], true, `${approved} must be explicitly approved`);
    for (const locked of lockedKeys) assert.equal(approval.scope[locked], false, `${locked} must remain locked`);
    assert.match(approval.bindings.deployment_source_sha256, /^[0-9a-f]{64}$/u);
    assert.match(approval.bindings.deployment_artifact_sha256, /^[0-9a-f]{64}$/u);
    assert.ok(Number.isInteger(approval.bindings.deployment_artifact_file_count));
  } else {
    assert.throws(
      () => execFileSync(process.execPath, ["scripts/deploy-approved-public-preview.mjs", "--check-material"], { encoding: "utf8", stdio: "pipe" }),
      /Command failed/u,
      "an obsolete approval must fail closed until the exact source and output artifact are reviewed",
    );
  }
  const dashboardPolicy = JSON.parse(readFileSync("config/daily-market-dashboard-policy.v1.json", "utf8"));
  assert.equal(dashboardPolicy.unrelated_authorities.production_deployment, false);
});

test("deployment digest covers every approved authority, artefact and canonical-remote guard", () => {
  const deployScript = readFileSync("scripts/deploy-approved-public-preview.mjs", "utf8");
  const comparisonBuilder = readFileSync("scripts/build-retailer-comparison.mjs", "utf8");
  for (const required of [
    "data/public-dashboard",
    "config/daily-market-dashboard-policy.v1.json",
    "config/event-line-publication-policy.v1.json",
    "scripts/build-daily-market.mjs",
    "scripts/build-event-line.mjs",
    "schemas/daily-market-dashboard.v1.schema.json",
    "schemas/event-line.v1.schema.json",
    "config/retailer-comparison-roster.v1.json",
    "scripts/build-retailer-comparison.mjs",
    "schemas/retailer-comparison.v1.schema.json",
    "data/public-offers/retailer-comparison-ram.manifest.v1.json",
    "data/public-offers/retailer-comparison-ram.v1.json",
    "ls-remote",
    "refs/heads/main",
    "...SURFACE_ROOTS, ...SURFACE_FILES",
  ]) assert.ok(deployScript.includes(required), required);
  assert.match(comparisonBuilder, /OUTPUT_PATH = "data\/public-offers\/retailer-comparison-ram\.v1\.json"/u);
  assert.match(comparisonBuilder, /MANIFEST_PATH = "data\/public-offers\/retailer-comparison-ram\.manifest\.v1\.json"/u);
});

test("the Pages workflow is manual, withheld and cannot deploy", () => {
  const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");
  assert.match(workflow, /SF_PUBLIC_SERIES:\s*withheld/u, "CI does not force the series closed");
  assert.match(workflow, /run:\s*npm run deploy/u);
  assert.doesNotMatch(workflow, /actions\/deploy-pages|actions\/upload-pages-artifact|pages:\s*write/u);
  assert.doesNotMatch(workflow, /push:\s*$/mu);
});
