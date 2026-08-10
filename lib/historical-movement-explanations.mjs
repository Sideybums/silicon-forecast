// lib/historical-movement-explanations.mjs
function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const vatLabel = (value) => (value === null ? "unresolved" : value ? "included" : "excluded");

function widestPair(records) {
  const sorted = records.slice().sort((a, b) => a.observed_at.localeCompare(b.observed_at));
  return [sorted[0], sorted.at(-1)];
}

function toEndpoint(record) {
  return {
    observation_id: record.observation_id,
    observed_at: record.observed_at,
    seller: record.seller_display_name,
    amount_minor: record.amount_minor,
  };
}

export function deriveHistoricalMovements(observations) {
  const byMpn = new Map();
  for (const record of observations) {
    if (!byMpn.has(record.mpn)) byMpn.set(record.mpn, []);
    byMpn.get(record.mpn).push(record);
  }

  const movements = [];
  for (const mpn of [...byMpn.keys()].sort()) {
    const records = byMpn.get(mpn);
    if (records.length < 2) continue;

    const bySeller = new Map();
    for (const record of records) {
      if (!bySeller.has(record.seller_display_name)) bySeller.set(record.seller_display_name, []);
      bySeller.get(record.seller_display_name).push(record);
    }

    const withinCandidates = [...bySeller.keys()].sort().map((s) => bySeller.get(s)).filter((r) => r.length >= 2);

    let pair;
    let basis;
    if (withinCandidates.length > 0) {
      // Prefer the within-seller line with the widest time separation.
      let best = null;
      for (const candidate of withinCandidates) {
        const [from, to] = widestPair(candidate);
        const span = Date.parse(to.observed_at) - Date.parse(from.observed_at);
        if (best === null || span > best.span) best = { span, pair: [from, to] };
      }
      pair = best.pair;
      basis = "within_seller";
    } else {
      pair = widestPair(records);
      basis = "cross_seller";
    }

    const [from, to] = pair;
    invariant(from.amount_minor > 0, "from amount must be positive");
    movements.push({
      movement_id: `movement-${mpn.toLowerCase()}-${from.observation_id}-${to.observation_id}`,
      mpn,
      from: toEndpoint(from),
      to: toEndpoint(to),
      delta_minor: to.amount_minor - from.amount_minor,
      delta_basis_points: Math.round(((to.amount_minor - from.amount_minor) * 10000) / from.amount_minor),
      comparison_basis: basis,
      vat_state_from: vatLabel(from.vat_included),
      vat_state_to: vatLabel(to.vat_included),
      vat_disclosure_required: from.vat_included === null || to.vat_included === null,
    });
  }
  return movements;
}
