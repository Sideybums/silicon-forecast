// The canonical collector: the sole prospective fetcher of current UK retailer
// offers. Everything here is built for unattended, scheduled operation, which
// changes what the code has to take responsibility for.
//
// Three things follow from being unattended:
//
//  - Nothing may be inferred. A page that does not clearly state a price, an
//    MPN, or its VAT basis produces an abstention with a reason code, never a
//    guess. Nobody is watching to catch a bad reading.
//  - Missed runs must be recorded, not merely absent. launchd catches up at
//    most once after a sleep, so a laptop closed for three days produces one
//    run and two silently missing days. Those days are written into the ledger
//    as explicit unobserved slots for the operator to review after the fact.
//  - Retrieval must be polite by construction: one request at a time, a real
//    identifying user-agent, a delay between requests, and robots.txt honoured
//    per host.
//
// No source here is approved for production or publication. Everything the
// collector writes is candidate, private and immutable.
import { extractAwdit, extractCcl, extractNovatech, extractOcuk } from "../scripts/harvest-multi-retailer-archive.mjs";
import { extractScan } from "../scripts/harvest-scan-archive.mjs";

export const COLLECTOR_VERSION = 1;
export const USER_AGENT = "silicon-forecast-collector/1.0 (+research; contact davidsidebottom@hotmail.co.uk)";

// Daily local-time slot the launchd job targets. Used to decide which scheduled
// slots have passed without a run.
export const SCHEDULE = { hour: 11, minute: 30, cadence: "daily" };
export const TARGET_SELECTION_CONTRACT_VERSION = 1;

export function targetSelectionKey(target) {
  if (typeof target?.seller_display_name !== "string" || !target.seller_display_name || typeof target?.mpn !== "string" || !target.mpn) throw new Error("collector target requires seller_display_name and MPN");
  return `${target.seller_display_name}\u001f${target.mpn.normalize("NFKC").trim().toUpperCase()}`;
}

export function selectCollectionTargets(registryTargets, { maxPriority = 4, maxTargets = 45, priorRuns = [] } = {}) {
  if (!Array.isArray(registryTargets) || !Array.isArray(priorRuns)) throw new Error("collector targets and prior runs must be arrays");
  if (!Number.isInteger(maxPriority) || maxPriority < 1 || !Number.isInteger(maxTargets) || maxTargets < 1) throw new Error("collector priority and target limits must be positive integers");
  const eligible = registryTargets.filter((target) => Number.isInteger(target.collection_priority) && target.collection_priority <= maxPriority);
  const eligibleByKey = new Map();
  for (const target of eligible) {
    const key = targetSelectionKey(target);
    if (eligibleByKey.has(key)) throw new Error(`duplicate eligible retailer/MPN target: ${key}`);
    eligibleByKey.set(key, target);
  }
  if (!eligible.length) return {
    targets: [],
    state: { contract_version: TARGET_SELECTION_CONTRACT_VERSION, ordering: "registry_order", key_basis: "seller_display_name+normalised_mpn", eligible_target_count: 0, max_targets: maxTargets, cursor_basis: "empty_registry", started_after_target_key: null, selected_target_keys: [], next_start_after_target_key: null },
  };

  let start = 0;
  let cursorBasis = "empty_ledger";
  let startedAfter = null;
  const successfulOutcomes = new Set(["completed", "completed_with_no_usable_readings"]);
  let sawCommittedSelection = false;
  const selectionRuns = [...priorRuns].reverse().filter((run) => run?.target_selection != null && successfulOutcomes.has(run.outcome));
  for (let index = 0; index < selectionRuns.length; index += 1) {
    const run = selectionRuns[index];
    const state = run.target_selection;
    if (state.contract_version !== TARGET_SELECTION_CONTRACT_VERSION || !Array.isArray(state.selected_target_keys)) throw new Error("unsupported or malformed prior target-selection state");
    if (run.targets_attempted !== state.selected_target_keys.length) throw new Error("committed target-selection attempt count does not match selected keys");
    sawCommittedSelection = true;
    const surviving = [...state.selected_target_keys].reverse().find((key) => eligibleByKey.has(key));
    if (!surviving) continue;
    start = (eligible.findIndex((target) => targetSelectionKey(target) === surviving) + 1) % eligible.length;
    startedAfter = surviving;
    cursorBasis = index === 0 ? "prior_committed_selection" : "older_committed_selection_fallback";
    break;
  }
  if (sawCommittedSelection && startedAfter === null) {
    cursorBasis = "prior_selections_no_longer_eligible";
  } else if (!sawCommittedSelection) {
    const legacy = [...priorRuns].reverse().find((run) => Number.isInteger(run?.targets_attempted) && run.targets_attempted > 0 && successfulOutcomes.has(run.outcome));
    if (legacy) {
      const attempted = Math.min(legacy.targets_attempted, eligible.length);
      start = attempted % eligible.length;
      startedAfter = eligible[attempted - 1] ? targetSelectionKey(eligible[attempted - 1]) : null;
      cursorBasis = "legacy_first_window_migration";
    }
  }

  const count = Math.min(maxTargets, eligible.length);
  const targets = Array.from({ length: count }, (_, index) => eligible[(start + index) % eligible.length]);
  const selectedTargetKeys = targets.map(targetSelectionKey);
  return {
    targets,
    state: {
      contract_version: TARGET_SELECTION_CONTRACT_VERSION,
      ordering: "registry_order",
      key_basis: "seller_display_name+normalised_mpn",
      eligible_target_count: eligible.length,
      max_targets: maxTargets,
      cursor_basis: cursorBasis,
      started_after_target_key: startedAfter,
      selected_target_keys: selectedTargetKeys,
      next_start_after_target_key: selectedTargetKeys.at(-1) ?? null,
    },
  };
}

const strip = (s) =>
  s
    .replace(/<[^>]*>/gu, " ")
    .replace(/&pound;/gu, "£")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();

// --- KingstonMemoryShop -----------------------------------------------------

export function extractKingstonMemoryShop(html) {
  const out = { reasons: [] };

  const title = html.match(/<h1[^>]*mobile-product-name[^>]*>([\s\S]{0,320}?)<\/h1>/iu);
  out.title = title ? strip(title[1]) : "";
  if (/\b32\s*GB\b[^()\d]{0,12}\(?\s*16\s*GB\s*x\s*2\s*\)?/iu.test(out.title)) {
    out.capacity_gb = 32;
    out.module_count = 2;
  } else out.reasons.push("CAPACITY_NOT_VISIBLE");
  if (!/DDR5/iu.test(out.title)) out.reasons.push("DDR5_NOT_CONFIRMED");
  // SODIMM is laptop memory: a different product, not a cheaper desktop kit.
  if (/so-?dimm/iu.test(out.title)) out.reasons.push("NOT_A_DESKTOP_DIMM");

  // Identity from the visible "Model:" label in the main product area.
  const model = html.match(/Model:\s*<[^>]*>\s*([A-Z0-9][A-Z0-9._/-]{4,})\s*</iu)
    || html.match(/Model:\s*([A-Z0-9][A-Z0-9._/-]{4,})\b/iu);
  if (model) out.mpn = model[1].trim().toUpperCase();
  else out.reasons.push("MPN_NOT_VISIBLE");

  // Price. A KingstonMemoryShop page carries roughly 110 pound figures, of
  // which the overwhelming majority are international delivery charges and
  // related-product grid tiles. Anchoring on the schema.org Offer scope is what
  // keeps a shipping cost to Andorra out of the price series.
  const offer = html.search(/itemprop="offers"/iu);
  if (offer === -1) out.reasons.push("PRICE_NOT_VISIBLE");
  else {
    const block = html.slice(offer, offer + 1400);
    const price = block.match(/itemprop="price"\s+content="([\d.]+)"/iu);
    if (price) out.amount_minor = Math.round(Number(price[1]) * 100);
    else out.reasons.push("PRICE_NOT_VISIBLE");

    const text = strip(block);
    if (/\(inc\.\s*VAT\)/iu.test(text)) {
      out.vat_included = true;
      out.vat_basis = "labelled_inc_vat_within_offer_scope";
      // The stated ex-VAT figure is checked against the recorded price rather
      // than the VAT basis being taken on trust.
      const ex = text.match(/£\s*([\d,]+\.\d{2})\s*\(ex\.\s*VAT\)/iu);
      if (ex && out.amount_minor != null) {
        const exMinor = Math.round(Number(ex[1].replace(/,/gu, "")) * 100);
        if (Math.abs(Math.round(exMinor * 1.2) - out.amount_minor) > 3) out.reasons.push("VAT_ARITHMETIC_INCONSISTENT");
      }
    } else {
      out.vat_included = null;
      out.reasons.push("VAT_DISPLAY_MODE_NOT_VISIBLE");
    }

    if (/schema\.org\/InStock/iu.test(block)) out.availability = "In stock";
    else if (/schema\.org\/OutOfStock/iu.test(block)) out.availability = "Out of stock";
    else out.availability = null;
  }

  // A discontinued line shows no price and must not fall through as a fetch bug.
  if (/Discontinued\s*-\s*Contact Us/iu.test(html)) out.reasons.push("PRODUCT_DISCONTINUED");
  return out;
}

// Keyed by the canonical seller display name used throughout the repository.
export const EXTRACTORS = {
  "AWD-IT": (html, url) => extractAwdit(html, url),
  "CCL Online": (html) => extractCcl(html),
  Novatech: (html) => extractNovatech(html),
  "Overclockers UK": (html) => extractOcuk(html),
  KingstonMemoryShop: (html) => extractKingstonMemoryShop(html),
  "Scan Computers": (html) => extractScan(html),
};

// --- observation shape ------------------------------------------------------

/**
 * Seller legal entities, only where prior retained evidence established them.
 *
 * The collision detector that guards against double-counting keys on the seller
 * legal entity. A retailer left null is therefore not merely incomplete — every
 * null-named seller collapses into one bucket, so distinct shops appear to be
 * the same shop. Names are recorded here only where an earlier collector run
 * actually observed them; the rest stay explicitly unresolved and the audit
 * falls back to the display name rather than inventing an entity.
 */
export const ESTABLISHED_SELLER_LEGAL_NAMES = {
  "AWD-IT": "ADMI Limited",
  KingstonMemoryShop: "SweetCow Ltd t/a KingstonMemoryShop",
};

const SOURCE_NAMES = {
  "AWD-IT": "AWD-IT public product page",
  "CCL Online": "CCL Online public product page",
  Novatech: "Novatech public product page",
  "Overclockers UK": "Overclockers UK public product page",
  KingstonMemoryShop: "KingstonMemoryShop public product page",
  "Scan Computers": "Scan Computers public product page",
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

/**
 * Builds one observation in the established prospective schema.
 *
 * The collector originally emitted the historical-backfill shape, which the
 * prospective governance machinery cannot read: it looks for
 * identity.mpn_observed and seller.legal_name, so those observations keyed as
 * (null, undefined) and 21 distinct products across three retailers were
 * reported as a single 21-way duplicate, while a genuine same-day duplicate
 * went undetected. Emitting the established shape is what keeps the audit,
 * collision detection and reports actually looking at this collector's output.
 */
export function buildProspectiveObservation(reading, { observedAt, evidencePath }) {
  const seller = reading.seller_display_name;
  const legalName = ESTABLISHED_SELLER_LEGAL_NAMES[seller] ?? null;
  return {
    observation_id: `${slug(seller)}-${reading.mpn.toLowerCase()}-${observedAt.toLowerCase()}`,
    status: "candidate_private_immutable",
    scope: "candidate_only",
    observed_at: observedAt,
    product_key: `${reading.mpn.toLowerCase()}`,
    source: {
      source_key: `${slug(seller)}-uk-public-page`,
      source_name: SOURCE_NAMES[seller] ?? `${seller} public product page`,
      source_url: reading.url,
      supplied_url_status: `http_${reading.http_status}`,
      collection_method: "scheduled unattended HTTP retrieval by the canonical collector",
      source_approved_for_production: false,
    },
    identity: {
      mpn_expected: reading.mpn_expected,
      mpn_observed: reading.mpn,
      match_basis: "exact_mpn",
    },
    product: {
      capacity_gb: reading.capacity_gb,
      module_count: reading.module_count,
      memory_type: "DDR5",
      capacity_basis: reading.capacity_basis,
      capacity_basis_reference: reading.capacity_basis_reference ?? null,
    },
    seller: {
      display_name: seller,
      legal_name: legalName,
      legal_name_state: legalName ? "established_from_prior_retained_extract" : "not_established_from_retained_extract",
      relationship: "retailer_owned",
    },
    item_price: { amount_minor: reading.amount_minor, currency: "GBP", vat_state: "included" },
    availability: {
      normalised: reading.availability === "In stock" ? "in_stock" : reading.availability ? "other" : "unknown",
      schema: reading.availability ?? null,
      display: reading.availability ?? null,
      eligibility_semantics: reading.availability ? "explicit" : "unknown",
    },
    // Delivery is not read by this collector, so it abstains rather than
    // implying free or unknown-but-zero carriage.
    delivery: { amount_minor: null, currency: "GBP", claim: null, destination_basis: null, destination_verified: false },
    landed_price: { amount_minor: null, currency: "GBP", eligibility: "abstain" },
    qualification: {
      status: "candidate_retained_not_landed_price_eligible",
      item_price_minor: reading.amount_minor,
      reasons: ["delivery_not_read_by_collector", ...(legalName ? [] : ["seller_legal_name_unresolved"])],
    },
    evidence: {
      extract_path: evidencePath,
      extract_sha256: null,
      response_sha256: reading.response_sha256,
      response_bytes: reading.response_bytes,
      response_bytes_retained: false,
      source_url: reading.url,
    },
    governance: {
      production_import_allowed: false,
      production_activation_allowed: false,
      index_eligibility: false,
      methodology_approval: false,
      publication_allowed: false,
    },
  };
}

// --- robots.txt -------------------------------------------------------------

/**
 * Minimal robots.txt evaluation for our own user-agent.
 *
 * Deliberately conservative: the most specific matching group is used, and an
 * unreadable or malformed robots.txt is treated as permitting retrieval only
 * because that matches ordinary browser behaviour — a *disallow* that we failed
 * to parse would be worse, so parse failures of individual lines are ignored
 * rather than the whole file being discarded.
 */
export function isAllowedByRobots(robotsText, path, agent = "silicon-forecast-collector") {
  if (typeof robotsText !== "string" || !robotsText.trim()) return true;
  const groups = [];
  let current = null;
  for (const rawLine of robotsText.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*$/u, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/u);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && (field === "allow" || field === "disallow")) {
      current.rules.push({ allow: field === "allow", path: value });
    }
  }

  const lower = agent.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && lower.includes(a)));
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  const applicable = specific.length ? specific : wildcard;
  if (!applicable.length) return true;

  // Longest matching rule wins, Allow beating Disallow at equal length.
  let best = null;
  for (const g of applicable) {
    for (const rule of g.rules) {
      if (rule.path === "") continue;
      if (!path.startsWith(rule.path)) continue;
      if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) {
        best = rule;
      }
    }
  }
  return best ? best.allow : true;
}

// --- missed-slot detection --------------------------------------------------

const pad = (n) => String(n).padStart(2, "0");

/**
 * Enumerates the scheduled slots that passed without a run.
 *
 * This exists because launchd does not queue missed occurrences. A machine
 * asleep from Monday to Thursday fires the job once on waking, and Tuesday and
 * Wednesday would otherwise vanish without trace — the series would simply have
 * no entry for them, indistinguishable from days where nothing was scheduled.
 * Recording them explicitly lets the operator see and account for the gap
 * afterwards rather than discovering it much later in a chart.
 *
 * Slots are computed in the local timezone the schedule is expressed in, using
 * the host's own clock, and returned oldest first.
 */
export function detectMissedSlots(lastRunAt, now, schedule = SCHEDULE) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error("now must be a valid Date");
  const last = lastRunAt ? new Date(lastRunAt) : null;
  if (lastRunAt && Number.isNaN(last.getTime())) throw new Error(`lastRunAt is not a valid instant: ${lastRunAt}`);
  if (!last) return [];

  // Every scheduled slot strictly after the last run and before now. A slot
  // falling on the last run's own day counts only if it fell after that run —
  // a run at 09:00 does not satisfy that day's 11:30 slot.
  const slots = [];
  const cursor = new Date(last.getFullYear(), last.getMonth(), last.getDate(), schedule.hour, schedule.minute, 0, 0);
  if (cursor <= last) cursor.setDate(cursor.getDate() + 1);
  while (cursor < now) {
    slots.push(
      `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}T${pad(cursor.getHours())}:${pad(cursor.getMinutes())}:00`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  // Today's slot is served by the run happening now, whatever the hour: the run
  // produces today's observation whether launchd fired late, or someone ran it
  // by hand at noon. Counting it would stamp a false gap on the very day being
  // collected. Only today's is excluded — dropping the most recent slot instead
  // would wrongly credit this run with serving yesterday whenever it runs
  // before the scheduled time.
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return slots.filter((slot) => !slot.startsWith(today));
}

// --- retrieval --------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches and parses one target.
 *
 * Returns either a reading or an abstention. It never returns a partially
 * trusted result: a target whose MPN does not match what we asked for is an
 * abstention, because a retailer re-slugging a URL onto a different product is
 * exactly how a price series silently acquires the wrong product's prices.
 */
/**
 * Kit shape is a property of the part number, not of a page.
 *
 * Scan removed the description heading from its product template around 2024.
 * Its live pages state 32GB and DDR5 in the title but no longer state the
 * module count anywhere a reader can see — the "2x16GB" string survives only
 * inside an analytics payload, which is not visible text and is not treated as
 * product evidence here. Without this, every Scan target would abstain forever
 * despite Scan being the project's largest source.
 *
 * The rule already used by the Scan depth tranche is applied instead: establish
 * the shape once per MPN from evidence that stated it in visible text, then
 * carry it across that MPN's other observations with the basis recorded. A URL
 * slug is never the authority, and an MPN no evidence has ever described stays
 * unresolved.
 */
export function buildEstablishedKitShapes(tranches) {
  const shapes = new Map();
  for (const tranche of tranches) {
    for (const o of tranche.observations ?? []) {
      const mpn = o.product?.mpn ?? o.identity?.mpn_observed;
      if (!mpn) continue;
      if (o.product?.capacity_gb !== 32 || o.product?.module_count !== 2) continue;
      // Only evidence that saw the shape on the page may establish it.
      if (o.eligibility?.capacity_basis !== "visible_on_page") continue;
      if (!shapes.has(mpn)) {
        shapes.set(mpn.toUpperCase(), {
          capacity_gb: 32,
          module_count: 2,
          established_by: o.observation_id,
          established_at: o.observed_at,
        });
      }
    }
  }
  return shapes;
}

const SHAPE_REASONS = new Set(["CAPACITY_NOT_VISIBLE", "DDR5_NOT_CONFIRMED"]);

export async function collectTarget(target, { fetchImpl = fetch, robotsFor = async () => "", establishedShapes = new Map() } = {}) {
  const base = {
    mpn_expected: target.mpn,
    seller_display_name: target.seller_display_name,
    url: target.url,
    reasons: [],
  };

  const extractor = EXTRACTORS[target.seller_display_name];
  if (!extractor) return { ...base, reasons: ["NO_EXTRACTOR_FOR_SELLER"] };

  let parsed;
  try {
    const url = new URL(target.url);
    const robots = await robotsFor(url.origin);
    if (!isAllowedByRobots(robots, url.pathname, "silicon-forecast-collector")) {
      return { ...base, reasons: ["ROBOTS_DISALLOWED"] };
    }

    const response = await fetchImpl(target.url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      redirect: "follow",
    });
    base.http_status = response.status;
    if (response.status !== 200) return { ...base, reasons: [`HTTP_${response.status}`] };

    const body = await response.text();
    base.response_bytes = Buffer.byteLength(body);
    base.response_sha256 = (await import("node:crypto")).createHash("sha256").update(body).digest("hex");
    base.final_url = response.url ?? target.url;
    parsed = extractor(body, target.url);
  } catch (error) {
    return { ...base, reasons: ["FETCH_FAILED"], error: String(error.message ?? error).slice(0, 200) };
  }

  const out = { ...base, ...parsed, reasons: [...base.reasons, ...(parsed.reasons ?? [])] };

  // Identity must match what the registry asked for. This is checked before any
  // kit shape is carried forward, so a moved URL can never inherit the shape of
  // the product that used to live there.
  if (out.mpn && out.mpn.toUpperCase() !== target.mpn.toUpperCase()) {
    out.reasons.push("MPN_MISMATCH_URL_MAY_HAVE_MOVED");
  }

  out.capacity_basis = out.capacity_gb === 32 && out.module_count === 2 ? "visible_on_page" : null;

  const established = out.mpn ? establishedShapes.get(out.mpn.toUpperCase()) : null;
  const onlyShapeOutstanding = out.reasons.every((r) => SHAPE_REASONS.has(r));
  if (!out.capacity_basis && established && onlyShapeOutstanding) {
    out.capacity_gb = established.capacity_gb;
    out.module_count = established.module_count;
    out.capacity_basis = "established_for_mpn_from_prior_evidence";
    out.capacity_basis_reference = established.established_by;
    // Kept so the waiver is auditable rather than invisible.
    out.shape_reasons_waived = out.reasons.filter((r) => SHAPE_REASONS.has(r));
    out.reasons = out.reasons.filter((r) => !SHAPE_REASONS.has(r));
  }

  out.usable =
    out.reasons.length === 0 &&
    Boolean(out.mpn) &&
    Number.isInteger(out.amount_minor) &&
    out.amount_minor > 0 &&
    out.vat_included === true &&
    out.capacity_gb === 32 &&
    out.module_count === 2 &&
    Boolean(out.capacity_basis);
  return out;
}

/**
 * Runs a collection pass over the given targets, one request at a time.
 *
 * Sequential and delayed on purpose. This runs unattended against shops that
 * have not agreed to be crawled, so it behaves like a slow, single, identified
 * reader rather than a scraper.
 */
export async function runCollection(targets, options = {}) {
  const { fetchImpl = fetch, delayMs = 2500, onProgress = () => {}, establishedShapes = new Map() } = options;
  const robotsCache = new Map();
  const robotsFor = async (origin) => {
    if (robotsCache.has(origin)) return robotsCache.get(origin);
    let text = "";
    try {
      const res = await fetchImpl(`${origin}/robots.txt`, { headers: { "user-agent": USER_AGENT } });
      text = res.status === 200 ? await res.text() : "";
    } catch {
      text = "";
    }
    robotsCache.set(origin, text);
    return text;
  };

  const results = [];
  for (const [i, target] of targets.entries()) {
    const result = await collectTarget(target, { fetchImpl, robotsFor, establishedShapes });
    results.push(result);
    onProgress(i + 1, targets.length, result);
    if (i < targets.length - 1) await sleep(delayMs);
  }
  return results;
}
