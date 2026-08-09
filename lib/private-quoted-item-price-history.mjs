const REQUIRED_MPNS = [
  "F5-6000J3636F16GX2-FX5",
  "KF560C30BBEK2-32",
  "KF564C32RSK2-32",
];

const EXPECTED_TRANCHES = new Map([
  ["sf-gb-historical-primary-retail-backfill-2026-08-09T145021Z-v1", {
    scope: "candidate_only_historical_backfill",
    observationIds: [
      "wayback-kms-kf564c32rsk2-32-2022-08-11T084020Z",
      "wayback-awdit-f5-6000j3636f16gx2-fx5-2026-01-10T145607Z",
      "wayback-awdit-f5-6000j3636f16gx2-fx5-2026-01-17T214832Z",
      "wayback-kms-kf560c30bbek2-32-2026-03-09T113702Z",
    ],
  }],
  ["sf-gb-primary-retail-2026-08-09T122437Z-v1", {
    scope: "candidate_only",
    observationIds: [
      "awdit-f5-6000j3636f16gx2-fx5-2026-08-09T122437Z",
      "kms-kf560c30bbek2-32-2026-08-09T122553Z",
      "kms-kf564c32rsk2-32-2026-08-09T122554Z",
    ],
  }],
]);

const EXPECTED_OBSERVATIONS = new Map([
  ["wayback-kms-kf564c32rsk2-32-2022-08-11T084020Z", ["2022-08-11T08:40:20Z", "KF564C32RSK2-32", 48799, "45774228d50f791b8ea134c84d8c4eb2b560c3d3b01b7fc62be2c90dcf7d07ec"]],
  ["wayback-awdit-f5-6000j3636f16gx2-fx5-2026-01-10T145607Z", ["2026-01-10T14:56:07Z", "F5-6000J3636F16GX2-FX5", 39999, "5ec402bec5ca6f26bd059fa583b8db257dd370197f3bb37115480a47ff1968d7"]],
  ["wayback-awdit-f5-6000j3636f16gx2-fx5-2026-01-17T214832Z", ["2026-01-17T21:48:32Z", "F5-6000J3636F16GX2-FX5", 39999, "f4006418f7d01049e30b24e885f028ac9d7b04412b3a1a339802853835cab206"]],
  ["wayback-kms-kf560c30bbek2-32-2026-03-09T113702Z", ["2026-03-09T11:37:02Z", "KF560C30BBEK2-32", 54728, "26c9729de5ee00ae881b8a1565ea3736e6afd993ee7feab24cbfa6e076efabb9"]],
  ["awdit-f5-6000j3636f16gx2-fx5-2026-08-09T122437Z", ["2026-08-09T12:24:37Z", "F5-6000J3636F16GX2-FX5", 46999, "a33271fe107022e4b001bd80a315bbf1133c2aaa8739497eb171746157e0598c"]],
  ["kms-kf560c30bbek2-32-2026-08-09T122553Z", ["2026-08-09T12:25:53Z", "KF560C30BBEK2-32", 61144, "3b26672a7c429bcc1c3b85c3180ca20f2cbd9a862e5166243a7a61ced4685dcb"]],
  ["kms-kf564c32rsk2-32-2026-08-09T122554Z", ["2026-08-09T12:25:54Z", "KF564C32RSK2-32", 62026, "a366d52c9bdedc4d375cce249dbde923e8183c15d2900bde16b3abf6d318c15f"]],
]);

const COLOURS = ["#0f766e", "#b45309", "#7c3aed"];

function fail(message) {
  throw new Error(`private quoted-item-price history: ${message}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function assertLocked(value, context) {
  for (const key of ["production_import_allowed", "production_activation_allowed", "index_eligibility", "methodology_approval", "publication_allowed"]) {
    if (value.governance?.[key] !== false) fail(`${context} must keep ${key} false`);
  }
  if ("source_approval_allowed" in (value.governance ?? {}) && value.governance.source_approval_allowed !== false) {
    fail(`${context} must keep source_approval_allowed false`);
  }
}

function provenance(observation) {
  return observation.observed_at_semantics === "wayback_capture_timestamp_not_retailer_first_change_time" ||
    observation.source?.source_key?.includes("wayback")
    ? "archive"
    : "live";
}

function validateObservation(observation, trancheId) {
  const expectedTranche = EXPECTED_TRANCHES.get(trancheId);
  if (observation.status !== "candidate_private_immutable") fail(`${observation.observation_id ?? "unknown observation"} status drifted`);
  if (observation.scope !== expectedTranche.scope) fail(`${observation.observation_id ?? "unknown observation"} scope drifted`);
  assertLocked(observation, observation.observation_id ?? "unknown observation");
  if (observation.source?.source_approved_for_production !== false) fail(`${observation.observation_id ?? "unknown observation"} source approval must remain false`);
  if (observation.identity?.match_basis !== "exact_mpn" || observation.identity.mpn_expected !== observation.identity.mpn_observed) {
    fail(`${observation.observation_id ?? "unknown observation"} is not an exact-MPN identity`);
  }
  if (!REQUIRED_MPNS.includes(observation.identity.mpn_observed)) fail(`unexpected MPN ${observation.identity.mpn_observed}`);
  if (!observation.seller?.legal_name) fail(`${observation.observation_id} lacks seller legal entity`);
  if (!Number.isInteger(observation.item_price?.amount_minor) || observation.item_price.amount_minor < 0) {
    fail(`${observation.observation_id} has invalid item-price minor units`);
  }
  if (observation.item_price.currency !== "GBP" || observation.item_price.vat_state !== "included") {
    fail(`${observation.observation_id} must be a VAT-inclusive GBP item quote`);
  }
  if (observation.landed_price?.amount_minor !== null || observation.landed_price?.eligibility !== "abstain") {
    fail(`${observation.observation_id} must retain its landed-price abstention`);
  }
  if (!Array.isArray(observation.qualification?.reasons) || observation.qualification.reasons.length === 0) {
    fail(`${observation.observation_id} lacks abstention reasons`);
  }
  if (Number.isNaN(Date.parse(observation.observed_at))) fail(`${observation.observation_id} has invalid observed_at`);
  if (!observation.evidence?.extract_sha256 || !/^[a-f0-9]{64}$/u.test(observation.evidence.extract_sha256)) {
    fail(`${observation.observation_id} lacks checksum-pinned evidence`);
  }
  const expected = EXPECTED_OBSERVATIONS.get(observation.observation_id);
  if (!expected) fail(`unexpected observation_id ${observation.observation_id}`);
  const actualSignature = [observation.observed_at, observation.identity.mpn_observed, observation.item_price.amount_minor, observation.evidence.extract_sha256];
  if (JSON.stringify(actualSignature) !== JSON.stringify(expected)) fail(`${observation.observation_id} differs from its checksum-bound retained facts`);
  return {
    observationId: observation.observation_id,
    trancheId,
    observedAt: observation.observed_at,
    observedAtSemantics: observation.observed_at_semantics ?? "live_retrieval_timestamp",
    mpn: observation.identity.mpn_observed,
    sellerLegalName: observation.seller.legal_name,
    sellerDisplayName: observation.seller.display_name,
    lineKey: `${observation.seller.legal_name}::${observation.identity.mpn_observed}`,
    amountMinor: observation.item_price.amount_minor,
    provenance: provenance(observation),
    sourceKey: observation.source.source_key,
    sourceUrl: observation.source.archive_url ?? observation.source.source_url,
    reasons: [...observation.qualification.reasons],
  };
}

export function buildQuotedItemPriceHistory(tranches) {
  if (!Array.isArray(tranches) || tranches.length !== 2) fail("exactly two archive/current tranches are required");
  const observations = [];
  const suppliedTrancheIds = tranches.map((tranche) => tranche?.tranche_id).sort();
  if (JSON.stringify(suppliedTrancheIds) !== JSON.stringify([...EXPECTED_TRANCHES.keys()].sort())) fail("the fixed report requires its two checksum-bound tranches");
  for (const tranche of tranches) {
    const expectedTranche = EXPECTED_TRANCHES.get(tranche.tranche_id);
    if (tranche.status !== "candidate_private_immutable" || tranche.scope !== expectedTranche.scope) fail(`${tranche.tranche_id} status or scope drifted`);
    assertLocked(tranche, tranche.tranche_id);
    if (!Array.isArray(tranche.observations)) fail(`${tranche.tranche_id} lacks observations`);
    const actualIds = tranche.observations.map((item) => item.observation_id).sort();
    if (JSON.stringify(actualIds) !== JSON.stringify([...expectedTranche.observationIds].sort())) fail(`${tranche.tranche_id} observation membership drifted`);
    for (const observation of tranche.observations) observations.push(validateObservation(observation, tranche.tranche_id));
  }
  const ids = observations.map((item) => item.observationId);
  if (new Set(ids).size !== ids.length) fail("duplicate observation_id");

  const lines = REQUIRED_MPNS.map((mpn, index) => {
    const points = observations.filter((item) => item.mpn === mpn).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    if (points.length < 2) fail(`${mpn} requires at least two retained points`);
    const lineKeys = new Set(points.map((point) => point.lineKey));
    if (lineKeys.size !== 1) fail(`${mpn} crosses seller legal entities and must not be joined`);
    if (!points.some((point) => point.provenance === "archive") || !points.some((point) => point.provenance === "live")) {
      fail(`${mpn} must contain archive and live provenance`);
    }
    return {
      mpn,
      colour: COLOURS[index],
      lineKey: points[0].lineKey,
      sellerLegalName: points[0].sellerLegalName,
      sellerDisplayName: points[0].sellerDisplayName,
      points,
      changes: points.slice(1).map((point, pointIndex) => {
        const previous = points[pointIndex];
        return {
          fromObservationId: previous.observationId,
          toObservationId: point.observationId,
          fromObservedAt: previous.observedAt,
          toObservedAt: point.observedAt,
          deltaMinor: point.amountMinor - previous.amountMinor,
          denominatorMinor: previous.amountMinor,
        };
      }),
    };
  });
  if (lines.reduce((sum, line) => sum + line.points.length, 0) !== observations.length) fail("an input observation was omitted or duplicated");
  return { lines, observationCount: observations.length };
}

function pounds(amountMinor) {
  return `£${(amountMinor / 100).toFixed(2)}`;
}

function signedPounds(amountMinor) {
  if (amountMinor === 0) return "£0.00";
  return `${amountMinor > 0 ? "+" : "−"}${pounds(Math.abs(amountMinor))}`;
}

function percentage(deltaMinor, denominatorMinor) {
  if (deltaMinor === 0) return "0.00%";
  // Integer half-up rounding to percentage basis points; no binary-float arithmetic.
  const negative = deltaMinor < 0;
  const numerator = Math.abs(deltaMinor) * 10000;
  const basisPoints = Math.floor((numerator * 2 + denominatorMinor) / (2 * denominatorMinor));
  return `${negative ? "−" : "+"}${Math.floor(basisPoints / 100)}.${String(basisPoints % 100).padStart(2, "0")}%`;
}

function shortDate(timestamp) {
  return timestamp.slice(0, 10);
}

export function renderQuotedItemPriceHistorySvg(history) {
  const allPoints = history.lines.flatMap((line) => line.points);
  const times = allPoints.map((point) => Date.parse(point.observedAt));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const amounts = allPoints.map((point) => point.amountMinor);
  const minAmount = Math.floor(Math.min(...amounts) / 5000) * 5000;
  const maxAmount = Math.ceil(Math.max(...amounts) / 5000) * 5000;
  const left = 104;
  const right = 940;
  const top = 110;
  const bottom = 500;
  const x = (timestamp) => left + ((Date.parse(timestamp) - minTime) * (right - left)) / (maxTime - minTime);
  const y = (amountMinor) => bottom - ((amountMinor - minAmount) * (bottom - top)) / (maxAmount - minAmount);
  const ticks = [];
  for (let amount = minAmount; amount <= maxAmount; amount += 5000) ticks.push(amount);

  const grid = ticks.map((amount) => `<g><line x1="${left}" y1="${y(amount).toFixed(2)}" x2="${right}" y2="${y(amount).toFixed(2)}" stroke="#d9e2e8"/><text x="94" y="${(y(amount) + 4).toFixed(2)}" text-anchor="end">${pounds(amount)}</text></g>`).join("");
  const series = history.lines.map((line, lineIndex) => {
    const points = line.points.map((point) => {
      const px = x(point.observedAt).toFixed(2);
      const py = y(point.amountMinor).toFixed(2);
      return `<g data-observation-id="${escapeHtml(point.observationId)}"><line x1="${(Number(px) - 8).toFixed(2)}" y1="${py}" x2="${(Number(px) + 8).toFixed(2)}" y2="${py}" stroke="${line.colour}" stroke-width="4"/><circle cx="${px}" cy="${py}" r="6" fill="white" stroke="${line.colour}" stroke-width="3"><title>${escapeHtml(`${point.observedAt} — ${pounds(point.amountMinor)} item price — ${point.provenance}`)}</title></circle><text x="${px}" y="${(Number(py) - 12 - lineIndex * 2).toFixed(2)}" text-anchor="middle" fill="${line.colour}">${pounds(point.amountMinor)}</text></g>`;
    }).join("");
    return `<g data-line-key="${escapeHtml(line.lineKey)}" aria-label="${escapeHtml(`${line.mpn}, ${line.sellerLegalName}, ${line.points.length} retained observations`)}">${points}</g>`;
  }).join("");
  const legend = history.lines.map((line, index) => `<g transform="translate(104 ${42 + index * 21})"><line x1="0" y1="-4" x2="22" y2="-4" stroke="${line.colour}" stroke-width="4"/><text x="30" y="0">${escapeHtml(`${line.mpn} — ${line.sellerLegalName}`)}</text></g>`).join("");
  const dateTicks = [...new Set(allPoints.map((point) => shortDate(point.observedAt)))].sort().map((date) => `<text x="${x(`${date}T00:00:00Z`).toFixed(2)}" y="525" text-anchor="end" transform="rotate(-32 ${x(`${date}T00:00:00Z`).toFixed(2)} 525)">${date}</text>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620" role="img" aria-labelledby="chart-title chart-desc">
<style>text{font:13px ui-sans-serif,system-ui,sans-serif;fill:#1f2937}.title{font-size:18px;font-weight:700}.warning{font-size:14px;font-weight:700;fill:#991b1b}</style>
<title id="chart-title">Private three-line quoted item price history</title>
<desc id="chart-desc">Seven retained VAT-inclusive GBP item-price observations across three exact MPN and seller legal-entity lines. Markers are observations only. They are deliberately not connected because no intermediate prices are observed.</desc>
<rect width="1000" height="620" fill="#f8fafc"/><text class="title" x="104" y="25">PRIVATE CANDIDATE · QUOTED ITEM PRICE · NOT AN INDEX · NOT FOR PUBLICATION</text>${legend}${grid}<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#475569"/>${series}${dateTicks}<text x="500" y="605" text-anchor="middle">Actual observation/capture dates · isolated markers: no interpolation and no fabricated dates</text>
</svg>\n`;
}

function observationRows(history) {
  return history.lines.flatMap((line) => line.points.map((point) => `<tr><td>${escapeHtml(line.mpn)}</td><td>${escapeHtml(point.sellerLegalName)}</td><td><code>${escapeHtml(point.lineKey)}</code></td><td><time datetime="${escapeHtml(point.observedAt)}">${escapeHtml(point.observedAt)}</time></td><td>${pounds(point.amountMinor)}</td><td>${point.provenance}</td><td><code>${escapeHtml(point.sourceKey)}</code></td><td>Abstain: ${escapeHtml(point.reasons.join(", "))}</td></tr>`)).join("");
}

function changeRows(history) {
  return history.lines.flatMap((line) => line.changes.map((change) => `<tr><td>${escapeHtml(line.mpn)}</td><td>${escapeHtml(line.sellerLegalName)}</td><td>${escapeHtml(change.fromObservedAt)}</td><td>${escapeHtml(change.toObservedAt)}</td><td>${signedPounds(change.deltaMinor)}</td><td>${percentage(change.deltaMinor, change.denominatorMinor)}</td><td><code>${change.deltaMinor}/${change.denominatorMinor} × 100%</code></td></tr>`)).join("");
}

export function renderQuotedItemPriceHistoryHtml(history, svg) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Private quoted item price history</title><style>body{max-width:1200px;margin:2rem auto;padding:0 1rem;font:16px/1.45 ui-sans-serif,system-ui,sans-serif;color:#172033;background:#f8fafc}h1{color:#991b1b;font-size:1.35rem}figure{margin:1.5rem 0;overflow-x:auto}svg{max-width:100%;height:auto;border:1px solid #cbd5e1}table{border-collapse:collapse;width:100%;font-size:.85rem;margin-bottom:2rem}caption{text-align:left;font-weight:700;font-size:1rem;margin:.5rem 0}th,td{border:1px solid #cbd5e1;padding:.45rem;text-align:left;vertical-align:top}th{background:#e2e8f0}code{font-size:.8rem;overflow-wrap:anywhere}.notice{padding:1rem;border:3px solid #991b1b;background:#fff7ed}.note{max-width:85ch}</style></head><body><header class="notice"><h1>PRIVATE CANDIDATE · QUOTED ITEM PRICE · NOT AN INDEX · NOT FOR PUBLICATION</h1><p>This is a visual review of retained VAT-inclusive item quotes. Delivery is not added to price. Every landed price abstains. It is neither a basket nor an index.</p></header><main><figure aria-labelledby="visual-caption">${svg}<figcaption id="visual-caption">Three seller-legal-entity + exact-MPN lines. Archive and live source keys join only where that stable identity is the same. Isolated markers intentionally avoid asserting prices between observed dates.</figcaption></figure><section><h2>Retained observations (${history.observationCount})</h2><table><caption>Accessible observation data</caption><thead><tr><th>Exact MPN</th><th>Seller legal entity</th><th>Line identity</th><th>Observed at</th><th>Quoted item price (VAT incl.)</th><th>Provenance</th><th>Collection source key</th><th>Landed-price status</th></tr></thead><tbody>${observationRows(history)}</tbody></table></section><section><h2>Exact point-to-point changes</h2><p class="note">Changes compare consecutive retained points only. Percentages are deterministically rounded half-up to two decimal places for display; the exact integer-minor-unit ratio is retained alongside them. No change is calculated for an unobserved date.</p><table><caption>Changes within each stable line identity</caption><thead><tr><th>Exact MPN</th><th>Seller legal entity</th><th>From</th><th>To</th><th>Item-price change</th><th>Displayed change</th><th>Exact arithmetic</th></tr></thead><tbody>${changeRows(history)}</tbody></table></section><section><h2>Interpretation limits</h2><ul><li>Archive timestamps are Wayback capture times, not retailer first-change times.</li><li>Live timestamps are collection times.</li><li>Delivery claims are provenance only and are excluded from item prices.</li><li>Landed prices abstain because destination and/or mandatory delivery or availability semantics remain unresolved.</li><li>Source approval, methodology approval, production activation, index eligibility and publication remain locked.</li></ul></section></main></body></html>\n`;
}

export const quotedItemPriceHistoryFormatting = { percentage, pounds, signedPounds };
