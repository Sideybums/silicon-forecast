import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
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
const PROJECTION_FILES = globSync("data/public-projection/**/*.json");

const isPublic = seriesIsPublic();

const htmlFiles = existsSync("out")
  ? globSync("out/**/*.html").filter((file) => statSync(file).isFile())
  : [];
const pages = new Map(htmlFiles.map((file) => [file, readFileSync(file, "utf8")]));
const allHtml = [...pages.values()].join("\n");
const needsBuild = htmlFiles.length === 0 ? "static build not present" : false;

/** The empty state the site must show wherever a withheld chart would go. */
const EMPTY_STATE = [
  "No publishable index point exists",
  "index scale begins only after the basket and baseline receive methodology approval",
];

/**
 * Every string form an index level could plausibly reach the page as.
 *
 * The site formats to one decimal place, but the point of this list is to catch
 * a level that escaped through some *other* route — a stray toFixed(2), a raw
 * integer dumped into an attribute — so it covers more than the site emits.
 */
function renderings(milli) {
  return [(milli / 1000).toFixed(1), (milli / 1000).toFixed(2), String(milli)];
}

function pagesUnder(prefix) {
  return [...pages].filter(([file]) => file.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// 1. Gate honesty, measured by absence
// ---------------------------------------------------------------------------

test("a withheld series leaves no index level anywhere in the build", { skip: needsBuild }, () => {
  if (isPublic) {
    // The mirror image: an open gate must actually show the number, otherwise
    // "no index level found" would pass for the wrong reason forever.
    const latest = renderings(INDEX.summary.latest_index_milli)[0];
    assert.ok(allHtml.includes(latest), `an open gate must render the latest level ${latest}`);
    for (const phrase of EMPTY_STATE) {
      assert.equal(allHtml.includes(phrase), false, `an open gate must not still claim: ${phrase}`);
    }
    return;
  }

  for (const period of INDEX.periods) {
    if (period.index_milli === null) continue;
    for (const form of renderings(period.index_milli)) {
      assert.equal(
        allHtml.includes(form),
        false,
        `${period.period_id} rendered as ${form} while the series is withheld`,
      );
    }
  }
  for (const phrase of EMPTY_STATE) {
    assert.ok(allHtml.includes(phrase), `a withheld build must state: ${phrase}`);
  }
  // Per-product movement is derived from retained prices and is withheld with
  // the index, so no part number may be rendered either.
  for (const product of PRODUCTS.products) {
    assert.equal(allHtml.includes(product.mpn), false, `${product.mpn} rendered while the series is withheld`);
  }
});

// ---------------------------------------------------------------------------
// 2. The gate fails closed
// ---------------------------------------------------------------------------

test("the gate opens only on a signed approval, and the environment can only close it", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sf-site-gate-"));
  const reviews = path.join(dir, "reviews");
  mkdirSync(reviews, { recursive: true });
  const configPath = path.join(dir, "release.json");
  const decide = (env) => publicationGate({ configPath, reviewsDir: reviews, env });

  try {
    // No config at all.
    assert.equal(decide(undefined).isPublic, false);

    // Unreadable config: the failure mode that would otherwise publish silently.
    writeFileSync(configPath, "{ not json");
    assert.equal(decide(undefined).isPublic, false);

    // Approved, but naming an approval record that does not exist.
    writeFileSync(configPath, JSON.stringify({ public_series_release: "approved", approval_ref: "sf-nothing" }));
    assert.equal(decide(undefined).isPublic, false);

    // Approved and signed: open, and only then.
    writeFileSync(configPath, JSON.stringify({ public_series_release: "approved", approval_ref: "sf-a" }));
    writeFileSync(
      path.join(reviews, "a.json"),
      JSON.stringify({ review_id: "sf-a", decided_by: "A Person", decided_at: "2026-08-13T00:00:00Z" }),
    );
    assert.equal(decide(undefined).isPublic, true);
    assert.equal(decide("withheld").isPublic, false, "the environment must be able to close an open gate");

    // ...and never the other way round.
    writeFileSync(configPath, JSON.stringify({ public_series_release: "withheld", approval_ref: null }));
    for (const env of ["approved", "public", "true", "1"]) {
      assert.equal(decide(env).isPublic, false, `SF_PUBLIC_SERIES=${env} must not open a closed gate`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // Whatever the build state, the approval reference itself is never rendered:
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

test("no page uses causal language of its own", { skip: needsBuild }, () => {
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

test("outbound source links and markers correspond exactly", { skip: needsBuild }, () => {
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

test("the unexplained count is rendered, not quietly omitted", { skip: needsBuild }, () => {
  if (EVENTS.unexplained_movement_count === 0) return;
  assert.ok(
    allHtml.includes(String(EVENTS.unexplained_movement_count)),
    "the number of unexplained movements never reaches a page",
  );
  assert.match(allHtml, /no reviewed explanation/iu, "the build never says movements lack a reviewed explanation");
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

test("no rendered chart geometry contains a two-decimal value", { skip: needsBuild }, () => {
  let svgCount = 0;
  for (const [file, content] of pages) {
    for (const match of content.matchAll(/<svg[\s\S]*?<\/svg>/gu)) {
      svgCount += 1;
      assert.doesNotMatch(match[0], TWO_DECIMALS, `${file} renders a two-decimal value inside an svg`);
      assert.match(match[0], /viewBox="/u, `${file} has an svg with no viewBox`);
      assert.doesNotMatch(match[0], /<svg[^>]*\swidth="/u, `${file} has an svg with a fixed width`);
    }
  }
  assert.ok(svgCount > 0, "expected at least one chart in the build");
});

// ---------------------------------------------------------------------------
// 7. No money reaches public output
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

test("no currency amount is rendered anywhere", { skip: needsBuild }, () => {
  for (const [file, content] of pages) {
    assert.equal(content.includes("£"), false, `${file} renders a pound sign`);
    assert.doesNotMatch(content, /\bGBP\s*\d/u, `${file} renders a GBP amount`);
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

test("a category with no observations renders no chart and says so", { skip: needsBuild }, () => {
  const entries = registryEntries();
  assert.ok(entries.length >= 2, "expected the registry to parse");
  assert.ok(entries.some((entry) => entry.dataset === null), "expected at least one uncollected category");

  for (const entry of entries.filter((e) => e.dataset === null)) {
    const [[file, content]] = pagesUnder(`out/price-history/${entry.slug}/`);
    assert.ok(content.includes("No observations collected"), `${file} does not state that nothing was collected`);
    assert.equal(content.includes("index-chart"), false, `${file} renders an index chart with no data behind it`);
    assert.equal(content.includes("collection-chart"), false, `${file} implies collection has started`);
  }
});

test("the number of product pages equals the number of products exactly", { skip: needsBuild }, () => {
  const productPages = globSync("out/price-history/*/*/index.html");
  const named = productPages.map((file) => file.split("/").at(-2));

  if (!isPublic) {
    // A withheld build renders no product. Next refuses to build a dynamic route
    // that yields no paths under `output: export`, so one path exists and it
    // resolves to nothing, producing a not-found document.
    assert.deepEqual(named, ["not-published"]);
    assert.match(pages.get(productPages[0]), /Signal absent|does not exist/u, "the placeholder path is not a 404");
    return;
  }

  assert.deepEqual(
    [...named].sort(),
    PRODUCTS.products.map((product) => product.mpn).sort(),
    "product pages and products have drifted apart",
  );
});

// ---------------------------------------------------------------------------
// 9. Parameters travel with the index, wherever it appears
// ---------------------------------------------------------------------------

test("every page showing the index also shows how it was built", { skip: needsBuild }, () => {
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
  "Four checks before one price enters",
  "retailer of record",
  INDEX.parameters_public.weighting_basis,
  INDEX.parameters_public.gap_policy_basis,
  INDEX.parameters_public.formula,
];

test("methodology lives on the methodology page and nowhere else", { skip: needsBuild }, () => {
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
  assert.match(readFileSync("app/page.tsx", "utf8"), /Primary retail only/u);
  assert.match(readFileSync("app/affiliate-disclosure/page.tsx", "utf8"), /No outbound product links are currently published/iu);
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

test("Cloudflare deploys the static export without OpenNext", () => {
  const config = readFileSync("wrangler.jsonc", "utf8");
  assert.match(config, /"directory"\s*:\s*"\.\/out"/u);
  assert.doesNotMatch(config, /opennext/iu);
  assert.match(config, /"pattern"\s*:\s*"siliconforecast\.com"/u);
  assert.match(config, /"pattern"\s*:\s*"www\.siliconforecast\.com"/u);
  assert.match(config, /"custom_domain"\s*:\s*true/u);
  assert.equal(JSON.parse(readFileSync("package.json", "utf8")).scripts.deploy, "wrangler deploy");
});

test("the deploy workflow sets the second gate lever", () => {
  const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");
  assert.match(workflow, /SF_PUBLIC_SERIES:\s*withheld/u, "CI does not force the series closed");
});
