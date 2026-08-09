import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildQuotedItemPriceHistory,
  quotedItemPriceHistoryFormatting,
  renderQuotedItemPriceHistoryHtml,
  renderQuotedItemPriceHistorySvg,
} from "../lib/private-quoted-item-price-history.mjs";

const archiveUrl = new URL("../data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json", import.meta.url);
const currentUrl = new URL("../data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json", import.meta.url);
const reportSvgUrl = new URL("../research/reports/private-quoted-item-price-history-2026-08-09.svg", import.meta.url);
const reportHtmlUrl = new URL("../research/reports/private-quoted-item-price-history-2026-08-09.html", import.meta.url);
const loadJson = async (url) => JSON.parse(await readFile(url, "utf8"));
const loadHistory = async () => buildQuotedItemPriceHistory(await Promise.all([loadJson(archiveUrl), loadJson(currentUrl)]));

const expectedLines = [
  {
    mpn: "F5-6000J3636F16GX2-FX5",
    seller: "ADMI Limited",
    dates: ["2026-01-10T14:56:07Z", "2026-01-17T21:48:32Z", "2026-08-09T12:24:37Z"],
    prices: [39999, 39999, 46999],
    changes: [[0, 39999], [7000, 39999]],
  },
  {
    mpn: "KF560C30BBEK2-32",
    seller: "SweetCow Ltd t/a KingstonMemoryShop",
    dates: ["2026-03-09T11:37:02Z", "2026-08-09T12:25:53Z"],
    prices: [54728, 61144],
    changes: [[6416, 54728]],
  },
  {
    mpn: "KF564C32RSK2-32",
    seller: "SweetCow Ltd t/a KingstonMemoryShop",
    dates: ["2022-08-11T08:40:20Z", "2026-08-09T12:25:54Z"],
    prices: [48799, 62026],
    changes: [[13227, 48799]],
  },
];

test("archive/live collection keys join only by seller legal entity plus exact MPN", async () => {
  const history = await loadHistory();
  assert.equal(history.observationCount, 7);
  assert.equal(history.lines.length, 3);
  assert.deepEqual(history.lines.map((line) => ({
    mpn: line.mpn,
    seller: line.sellerLegalName,
    dates: line.points.map((point) => point.observedAt),
    prices: line.points.map((point) => point.amountMinor),
    provenance: line.points.map((point) => point.provenance),
    sourceKeys: line.points.map((point) => point.sourceKey),
    changes: line.changes.map((change) => [change.deltaMinor, change.denominatorMinor]),
  })), expectedLines.map((line) => ({
    ...line,
    provenance: line.dates.length === 3 ? ["archive", "archive", "live"] : ["archive", "live"],
    sourceKeys: line.mpn.startsWith("F5-")
      ? ["awd-it-uk-wayback-page", "awd-it-uk-wayback-page", "awd-it-uk-public-page"]
      : ["kingston-memory-shop-uk-wayback-page", "kingston-memory-shop-uk-public-page"],
  })));
  for (const line of history.lines) assert.equal(line.lineKey, `${line.sellerLegalName}::${line.mpn}`);
});

test("deterministic arithmetic exposes exact minor-unit ratios and stable displayed changes", async () => {
  const history = await loadHistory();
  const changes = history.lines.flatMap((line) => line.changes);
  assert.deepEqual(changes.map((change) => `${change.deltaMinor}/${change.denominatorMinor}`), [
    "0/39999", "7000/39999", "6416/54728", "13227/48799",
  ]);
  assert.deepEqual(changes.map((change) => quotedItemPriceHistoryFormatting.percentage(change.deltaMinor, change.denominatorMinor)), [
    "0.00%", "+17.50%", "+11.72%", "+27.11%",
  ]);
});

test("SVG has exactly the seven retained points, three identities, and no interpolating path", async () => {
  const history = await loadHistory();
  const svg = renderQuotedItemPriceHistorySvg(history);
  assert.equal((svg.match(/data-observation-id=/gu) ?? []).length, 7);
  assert.equal((svg.match(/data-line-key=/gu) ?? []).length, 3);
  assert.equal((svg.match(/<circle /gu) ?? []).length, 7);
  assert.doesNotMatch(svg, /<(?:path|polyline|polygon)\b/u);
  assert.match(svg, /isolated markers: no interpolation and no fabricated dates/u);
  for (const line of expectedLines) {
    assert.ok(svg.includes(line.mpn));
    for (const date of line.dates) assert.ok(svg.includes(date.slice(0, 10)));
  }
});

test("accessible HTML is explicitly private, not an index, and reports provenance and abstentions", async () => {
  const history = await loadHistory();
  const svg = renderQuotedItemPriceHistorySvg(history);
  const html = renderQuotedItemPriceHistoryHtml(history, svg);
  assert.match(html, /PRIVATE CANDIDATE · QUOTED ITEM PRICE · NOT AN INDEX · NOT FOR PUBLICATION/u);
  assert.match(html, /Accessible observation data/u);
  assert.match(html, /Observation ID/u);
  assert.match(html, /Tranche ID/u);
  assert.match(html, /Evidence extract SHA-256/u);
  assert.match(html, /<code>awdit-f5-6000j3636f16gx2-fx5-2026-08-09T122437Z<\/code>/u);
  assert.match(html, /<code>sf-gb-primary-retail-2026-08-09T122437Z-v1<\/code>/u);
  assert.match(html, /<code>[a-f0-9]{64}<\/code>/u);
  assert.match(html, /Archive timestamps are Wayback capture times/u);
  assert.match(html, /Delivery is not added to price/u);
  assert.match(html, /Abstain: availability_semantics_ambiguous, delivery_destination_not_fixed/u);
  assert.match(html, /<code>7000\/39999 × 100%<\/code>/u);
  assert.doesNotMatch(html, /landed price[^.]*£/iu);
});

test("persistent private report artifacts exactly reproduce from retained inputs", async () => {
  const history = await loadHistory();
  const svg = renderQuotedItemPriceHistorySvg(history);
  const html = renderQuotedItemPriceHistoryHtml(history, svg);
  assert.equal(await readFile(reportSvgUrl, "utf8"), svg);
  assert.equal(await readFile(reportHtmlUrl, "utf8"), html);
});

test("identity drift and fabricated/unexpected points fail closed", async () => {
  const [archive, current] = await Promise.all([loadJson(archiveUrl), loadJson(currentUrl)]);
  const sellerDrift = structuredClone(current);
  sellerDrift.observations.find((item) => item.identity.mpn_observed === "KF560C30BBEK2-32").seller.legal_name = "A different legal entity";
  assert.throws(() => buildQuotedItemPriceHistory([archive, sellerDrift]), /crosses seller legal entities/u);

  const fabricated = structuredClone(current);
  fabricated.observations.push({
    ...structuredClone(fabricated.observations[0]),
    observation_id: "fabricated",
    observed_at: "2026-08-10T00:00:00Z",
    identity: { mpn_expected: "NOT-A-RETAINED-MPN", mpn_observed: "NOT-A-RETAINED-MPN", match_basis: "exact_mpn" },
  });
  assert.throws(() => buildQuotedItemPriceHistory([archive, fabricated]), /observation membership drifted/u);
});

test("landed-price eligibility and governance unlocks fail closed", async () => {
  const [archive, current] = await Promise.all([loadJson(archiveUrl), loadJson(currentUrl)]);
  const landed = structuredClone(current);
  landed.observations[0].landed_price = { amount_minor: 61144, currency: "GBP", eligibility: "eligible" };
  assert.throws(() => buildQuotedItemPriceHistory([archive, landed]), /must retain its landed-price abstention/u);

  const unlocked = structuredClone(current);
  unlocked.governance.publication_allowed = true;
  assert.throws(() => buildQuotedItemPriceHistory([archive, unlocked]), /must keep publication_allowed false/u);

  const observationUnlocked = structuredClone(current);
  observationUnlocked.observations[0].governance.publication_allowed = true;
  assert.throws(() => buildQuotedItemPriceHistory([archive, observationUnlocked]), /must keep publication_allowed false/u);

  const sourceApproved = structuredClone(current);
  sourceApproved.observations[0].source.source_approved_for_production = true;
  assert.throws(() => buildQuotedItemPriceHistory([archive, sourceApproved]), /source approval must remain false/u);
});

test("fixed report membership and checksum-bound facts reject plausible forgeries", async () => {
  const [archive, current] = await Promise.all([loadJson(archiveUrl), loadJson(currentUrl)]);

  const alteredPrice = structuredClone(current);
  alteredPrice.observations[0].item_price.amount_minor += 1;
  assert.throws(() => buildQuotedItemPriceHistory([archive, alteredPrice]), /differs from its checksum-bound retained facts/u);

  const alteredEvidence = structuredClone(current);
  alteredEvidence.observations[0].evidence.extract_sha256 = "f".repeat(64);
  assert.throws(() => buildQuotedItemPriceHistory([archive, alteredEvidence]), /differs from its checksum-bound retained facts/u);

  const missing = structuredClone(current);
  missing.observations.pop();
  assert.throws(() => buildQuotedItemPriceHistory([archive, missing]), /observation membership drifted/u);

  const plausibleExtra = structuredClone(current.observations[0]);
  plausibleExtra.observation_id = "plausible-extra-on-known-line";
  plausibleExtra.observed_at = "2026-08-10T00:00:00Z";
  const added = structuredClone(current);
  added.observations.push(plausibleExtra);
  assert.throws(() => buildQuotedItemPriceHistory([archive, added]), /observation membership drifted/u);
});
