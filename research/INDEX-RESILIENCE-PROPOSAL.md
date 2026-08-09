# DDR5 index resilience and market-universe proposal

Status: architecture and planning direction approved by David Sidebottom
Approved: 2026-08-08
Effect: authorises continued candidate-universe, lifecycle, reserve-pool and resilience design work only. Exact numerical thresholds, a basket-vintage/linking formula, historical reference period, official UK deflator, release-vintage policy, earnings measure, production methodology, production sources, baseline, activation and publication remain unapproved until their stated evidence gates are met. All are `PROPOSED_LOCKED`.

## Problem statement

A 12-product catalogue is adequate for exercising identity, provenance and review controls. It is not, by itself, a reliable market universe or production basket.

Catalogue membership does not prove that a product:

- is available from enough qualifying UK retailers;
- has complete landed-price observations;
- has enough baseline history;
- is representative rather than a near-duplicate;
- will remain available after baseline approval;
- survives the loss of one product, retailer, source or acquisition vendor.

The headline index must not fail merely because one exact MPN disappears. It also must not silently replace that MPN, shrink the denominator or invent a value.

## Four separate product layers

### 1. Monitored market universe

The broad discovery layer. It should seek every eligible 32GB (2x16GB) DDR5 desktop UDIMM offered by covered UK channels, including products not in the headline basket.

This layer detects:

- new MPNs;
- price movements outside the current basket;
- first appearance and last-seen dates;
- likely discontinuation and successors;
- manufacturer, family, speed and retailer coverage gaps;
- news mentioning a relevant but unmonitored product.

Universe membership does not grant index eligibility.

### 2. Reviewed canonical catalogue

Exact-MPN identities with first-party evidence and immutable revisions. Products may be active, availability-at-risk, discontinued or identity-invalid. Historical products are never deleted.

Catalogue approval does not grant basket membership.

### 3. Baseline-eligible and reserve pool

Products that have enough approved-source history, retailer breadth, landed-price completeness and continuity to support a baseline. Reserve candidates are prepared and monitored but cannot silently enter a frozen series.

### 4. Effective-dated index basket vintage

The human-approved product IDs used by one index series/baseline. Membership and denominator are frozen for deterministic replay. Later product churn is handled through an explicitly approved new basket vintage, rebase or linking method—not silent substitution.

## Provisional manufacturer coverage matrix

This is a discovery starting point, not a market-share claim.

### Required research coverage

- Corsair
- Kingston / Kingston FURY
- Crucial
- G.SKILL
- TEAMGROUP / T-FORCE / T-CREATE
- ADATA / XPG
- Patriot / Viper
- Lexar

### Additional UK-availability candidates

- PNY
- KLEVV
- Silicon Power
- Integral
- Other brands that meet the eligibility and UK-presence rules

The definitive list should be generated empirically from approved UK retailer/feed observations. A brand should not be excluded merely because it was absent from the original research seed.

## Provisional retailer/source coverage matrix

Retailer presence and source approval are separate questions. Candidate discovery should consider major UK channels such as:

- Scan Computers
- Overclockers UK
- Currys
- Ebuyer
- CCL Computers
- AWD-IT
- Amazon UK direct retail
- Amazon UK professional marketplace sellers, as a separate asking-price channel
- other credible UK retailers evidenced by the approved feeds

No retailer becomes an approved source through inclusion in this proposal.

## Reliability gates to add before baseline approval

Exact numerical thresholds remain proposed and must be calibrated from real feed coverage.

1. **Baseline-eligible count, not catalogue count**
   - A minimum catalogue size cannot stand in for products that actually pass source, retailer, landed-price and history rules.

2. **Leave-one-product-out**
   - Remove every basket product in turn and replay all quality gates.
   - Every counterfactual must still pass product count, basket coverage, retailer/source breadth and concentration gates.

3. **Leave-one-source and leave-one-retailer stress tests**
   - A common source or retailer outage must not make the headline appear healthy if its independence or coverage is illusory.

4. **Manufacturer/family concentration controls**
   - SKU proliferation by one manufacturer or closely related product family must not dominate the index.
   - Brand and family representation should be reported even if the first production method remains equal-product weighted.

5. **Reserve readiness**
   - Maintain reviewed, observed reserve products across brands and performance bands.
   - Reserves are candidates for a future basket vintage; they cannot enter the current series automatically.

6. **Churn stress test**
   - Replay scenarios for one EOL product, several simultaneous retailer stockouts and a successor with a new MPN.

7. **No silent imputation**
   - Missing products remain missing. The index calculates only when all approved quality gates pass; otherwise it is explicitly unavailable or private/provisional.

## Product lifecycle workflow

Suggested states:

- `ACTIVE`
- `AVAILABILITY_AT_RISK`
- `DISCONTINUED`
- `SUCCESSOR_CANDIDATE`
- `IDENTITY_INVALID`

Suggested monitoring signals:

- first-party discontinuation or replacement notice;
- sustained absence across qualifying retailers;
- falling retailer count;
- only marketplace or used offers remaining;
- successor MPN appearing on a manufacturer page;
- repeated feed disappearance or stock-status ambiguity.

Lifecycle changes are effective-dated and additive. An EOL decision never deletes observations or changes historical calculations.

## Basket-vintage and linking requirement

The current draft correctly freezes the baseline denominator but defines no linking method. That is reproducible but not sufficient for a long-lived technology index.

Before production, the methodology should define an approved process for:

1. monitoring the current basket and reserves;
2. proposing a replacement basket before coverage becomes critical;
3. collecting an overlap window for old and new baskets;
4. calculating a deterministic link/rebase impact report;
5. requiring human approval for the new vintage;
6. preserving the old series and every input hash;
7. publishing a clear methodology/version boundary if publication is later approved.

Until that method is approved, coverage failure must produce a gap rather than a convenient fiction.

## Two different meanings of a reference scale

These concepts must not be conflated:

1. **Basket-vintage reference scale** is calculation infrastructure. A native basket vintage may use an internal base or overlap scale so its product relatives can be calculated and a later vintage can be linked. That number is not a claim that the date was cheap, affordable, representative or normal.
2. **Historical reference presentation** is a product interpretation. It may rescale the already-linked nominal history so an evidence-approved historical period equals 100. It does not change native basket-vintage values, link factors or the linked nominal movement path.

The desired product should not use collection inception as the historical reference merely because it is convenient. A candidate historical reference needs, at minimum, an explicit economic/product rationale; adequate approved-source and basket coverage; lifecycle and market-regime review; inflation and earnings context; exclusions; sensitivity against plausible alternative windows; and human approval bound to exact evidence and calculations. "Reference period" is the default label. "Normal" or "affordable" is allowed only if the evidence packet supports that stronger claim.

If no period passes, the reference presentation is `UNAVAILABLE_HISTORICAL_REFERENCE_NOT_APPROVED`. The linked nominal history may still exist on its own identified calculation scale.

## Three numeric layers

### 1. Linked nominal category history — primary

Preserve each native daily basket vintage, its membership and quality states. Join vintages only with an approved deterministic overlap/linking rule and stored link factors. The linked series expresses observed UK retail-price movement in money-of-the-day terms. Missing overlap, failed quality or an unapproved rule creates a gap; it never triggers silent substitution, splice, backcast or rebase.

### 2. Monthly constant-price history — required when approved inputs exist

Aggregate the linked nominal series to calendar months only under an approved completeness rule. Deflate it with one specifically approved official UK price-index series (for example, a precisely identified official CPI or CPIH series only after review—not a generic label or an assumption). Preserve provider, series code/title, observation month, provisional/final status, release/publication date, retrieval timestamp, captured bytes/checksum or equivalent immutable evidence, release-vintage ID and transformation version.

For nominal monthly level `N_m`, official deflator observation `D_(m,v)` from release vintage `v`, and approved constant-price reference month/period `r`, the candidate design is:

`R_(m,v) = N_m × D_(r,v) / D_(m,v)`

The aggregation operator, completeness threshold, deflator series, reference period, treatment of provisional observations and revision policy are all `PROPOSED_LOCKED`. A later statistical release creates a separately replayable revision and impact report; it does not silently rewrite the as-calculated series. Real output is monthly, even if nominal output is daily.

### 3. Optional earnings-relative affordability

A later series may compare nominal component prices with an approved official UK earnings measure to answer the literal affordability question. It must define population, earnings concept, frequency alignment, seasonal-adjustment choice, release vintage and reference period. It is neither the nominal series nor the constant-price series and cannot be used as a substitute when either is unavailable.

Until approved, its state is `UNAVAILABLE_EARNINGS_METHOD_NOT_APPROVED`.

## Explicit unavailable states

The method and product should preserve `value = null`, reason, affected period and lineage for at least:

- `UNAVAILABLE_NATIVE_QUALITY` — the basket vintage fails its standard quality gates;
- `UNAVAILABLE_LINK_NOT_APPROVED` — no approved deterministic linking method applies;
- `UNAVAILABLE_LINK_OVERLAP` — approved overlap inputs are insufficient or fail quality;
- `UNAVAILABLE_HISTORICAL_REFERENCE_NOT_APPROVED` — no evidence-approved historical reference exists;
- `UNAVAILABLE_MONTH_INCOMPLETE` — linked nominal daily coverage fails the approved monthly rule;
- `UNAVAILABLE_DEFLATOR_NOT_APPROVED` — no exact official UK deflator series/policy is approved;
- `UNAVAILABLE_DEFLATOR_VINTAGE_MISSING` — the pinned release vintage lacks a required observation or lineage fact;
- `UNAVAILABLE_EARNINGS_METHOD_NOT_APPROVED` and `UNAVAILABLE_EARNINGS_VINTAGE_MISSING`;
- `UNAVAILABLE_EVENT_DATE_OR_REVISION` — an annotation cannot be placed; numeric output is unaffected.

No unavailable point may be replaced with zero, last observation, interpolation, a model estimate, collection inception, another statistical vintage or an event-adjusted value.

## Research and news coverage

News must never alter the numeric index directly.

A report that Corsair RAM prices fell should:

1. enter a separate research/event queue;
2. identify the mentioned brand, family and exact MPN where possible;
3. compare the claim with retained UK price observations;
4. raise a catalogue-coverage gap if an eligible product is not monitored;
5. support cautious commentary only when the observed data agrees.

The price observations affect the index. The article explains or challenges the movement. Mixing those roles would turn evidence into editorial weighting, which is precisely the sort of cleverness future-us would regret.

An event overlay is an append-only annotation referencing an approved event revision and an immutable numeric-series revision. Its date/range, label and causal-language state are display metadata only. Adding, approving, correcting, moving or removing an overlay must leave every numeric checksum, link factor, reference denominator, deflator input, missing state and weight unchanged.

## Method acceptance tests

Before activation, fixtures and replay tests must prove that:

1. native basket vintages remain byte-for-byte replayable after linking;
2. an approved overlap reproduces one deterministic link factor, while inadequate overlap yields `UNAVAILABLE_LINK_OVERLAP`;
3. changing the historical reference changes only the presentation transform, never native or linked nominal values;
4. no reference can be activated without a checksum-bound evidence and sensitivity decision;
5. incomplete nominal months remain unavailable;
6. a fixed official-deflator release vintage reproduces the same real values and a later release creates a separate revision/impact report;
7. missing or mixed deflator vintages fail closed;
8. earnings-relative activation or failure cannot change nominal or real outputs; and
9. event-overlay create/update/delete operations leave all numeric checksums identical.

## Recommended immediate change

Treat the current 12 products as a control-plane pilot, not the target market universe.

Continue Task 8 by:

- adding Corsair first;
- broadening candidates across ADATA/XPG, Patriot/Viper and Lexar;
- defining lifecycle and reserve fixtures;
- gathering empirical UK retailer coverage;
- producing brand/family/speed coverage reports;
- running leave-one-product-out readiness tests once approved price sources exist.

Do not approve a production baseline based solely on reaching a particular catalogue count.
