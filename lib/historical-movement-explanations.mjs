// lib/historical-movement-explanations.mjs
function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const vatLabel = (value) => (value === null ? "unresolved" : value ? "included" : "excluded");

// Plain codepoint comparison — see the matching note in
// lib/historical-observed-price-envelope.mjs. Never swap this for
// String#localeCompare: ICU collation is not guaranteed stable across
// builds or LC_ALL and can silently change which pair of observations is
// picked as the widest movement.
function compareCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function widestPair(records) {
  const sorted = records.slice().sort((a, b) => compareCodepoint(a.observed_at, b.observed_at));
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

const FORBIDDEN_FIELDS = new Set([
  "amount_minor", "price", "weight", "link_factor",
  "deflator", "reference_period", "imputed_value", "gap_fill",
]);

const ALLOWED_CAUSAL_LEVELS = new Set(["descriptive", "temporal_association", "contributory_hypothesis"]);

function assertNoForbiddenFields(value, path, explanationId) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, `${path}[${index}]`, explanationId));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    invariant(
      !FORBIDDEN_FIELDS.has(key),
      `forbidden numeric field on explanation ${explanationId}: ${path ? `${path}.` : ""}${key}`,
    );
    assertNoForbiddenFields(nested, path ? `${path}.${key}` : key, explanationId);
  }
}

// An explanation points at somebody else's work, so it must carry enough to
// credit them properly and send a reader to the original. The site displays a
// headline and a byline and then gets out of the way; it does not reproduce the
// article, and minimal_quote stays private for that reason.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

// The single permitted way to record an absent byline. Some publishers genuinely
// do not name an author, and the honest record of that is a stated absence — not
// a blank, and never a guess at who wrote it.
export const AUTHOR_NOT_STATED = "not_stated_by_publisher";

function assertAttributableSource(explanation) {
  const id = explanation.explanation_id;
  const source = explanation.source;
  invariant(source && typeof source === "object", `explanation ${id} has no source block`);

  for (const field of ["title", "publisher"]) {
    invariant(
      typeof source[field] === "string" && source[field].trim().length > 0,
      `explanation ${id} source.${field} is required; an event marker must credit the work it points at`,
    );
  }
  invariant(
    typeof source.author === "string" && (source.author.trim().length > 0),
    `explanation ${id} source.author is required; use "${AUTHOR_NOT_STATED}" when the publisher names nobody`,
  );

  invariant(
    typeof source.url === "string" && source.url.startsWith("https://"),
    `explanation ${id} source.url must be an https URL to the original`,
  );
  // The event overlay fixtures use fixture.invalid deliberately. A synthetic
  // URL must never reach a marker that presents itself as a real citation.
  invariant(
    !/(^|\.)fixture\.invalid(\/|$|:)/u.test(new URL(source.url).host + "/"),
    `explanation ${id} source.url is a synthetic fixture host`,
  );

  for (const field of ["published_on", "accessed_on"]) {
    invariant(
      typeof source[field] === "string" && ISO_DATE.test(source[field]),
      `explanation ${id} source.${field} must be a YYYY-MM-DD date`,
    );
  }
}

export function validateExplanationLedger(ledger, derivedMovements) {
  invariant(ledger && Array.isArray(ledger.movements), "ledger.movements must be an array");
  invariant(Array.isArray(ledger.explanations), "ledger.explanations must be an array");

  const derivedById = new Map(derivedMovements.map((m) => [m.movement_id, m]));
  for (const recorded of ledger.movements) {
    const derived = derivedById.get(recorded.movement_id);
    invariant(derived, `movement drift: ${recorded.movement_id} is not derivable from observations`);
    invariant(
      JSON.stringify(recorded) === JSON.stringify(derived),
      `movement drift: ${recorded.movement_id} does not match derived values`,
    );
  }

  const knownMovements = new Set(ledger.movements.map((m) => m.movement_id));
  for (const explanation of ledger.explanations) {
    assertNoForbiddenFields(explanation, "", explanation.explanation_id);
    invariant(knownMovements.has(explanation.movement_id), `unknown movement: ${explanation.movement_id}`);
    invariant(
      ALLOWED_CAUSAL_LEVELS.has(explanation.causal_language_level),
      `causal_language_level not permitted: ${explanation.causal_language_level}`,
    );
    const search = explanation.counterevidence_search;
    invariant(
      search && search.performed === true && typeof search.searched_at === "string" &&
        (search.result === "none_identified" || search.result === "counterevidence_recorded"),
      `counterevidence search missing or invalid for ${explanation.explanation_id}`,
    );
    invariant(typeof explanation.response_sha256 === "string" && explanation.response_sha256.length === 64, "response_sha256 must be a 64-character digest");
    invariant(typeof explanation.minimal_quote === "string" && explanation.minimal_quote.length > 0, "minimal_quote required");
    assertAttributableSource(explanation);
  }

  return { movement_count: ledger.movements.length, explanation_count: ledger.explanations.length };
}
