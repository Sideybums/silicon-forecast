# Methodology v0.1 — Private UK 32GB DDR5 Desktop Retail-Offer Index

**Document status:** Executable draft; not approved for production
**Methodology ID:** `SF-GB-DDR5-32-UDIMM-OFFER`
**Methodology version:** `0.1.0-draft`
**Decision date:** 5 August 2026
**Language:** British English
**Requirements addressed:** SRC-03, SRC-04, IDX-01–IDX-06

## 0. Non-activation notice and authority boundary

The United Kingdom (`GB`) is a **diligence selection only**. It is not an approved production region. Research found plausible UK data routes but no reviewed route presently grants the complete rights chain needed for collection, indefinite evidence retention, derivation and private commercial display.

`production_activation_locked = true` and `external_publication_locked = true`.

No calculation result, coverage pass, source score, technical accessibility, public listing, `robots.txt` allowance, affiliate availability or this draft may unlock either lock. Production activation requires all of the following recorded human decisions:

1. approval of this methodology and every threshold marked `PROPOSED_LOCKED`;
2. approval of `GB` as the production region;
3. approval of enough source contracts under Rule 6 and the source-rights register;
4. approval of the canonical basket and baseline under Rules 17, 21 and 22; and
5. an explicit activation decision that names the effective methodology version.

External or customer-facing publication requires a separate explicit human decision and source rights for that display mode. Until then, outputs may be generated only from permitted fixtures or under a separately authorised private shadow-run scope. Unknown authority fails closed.

## 1. Normative language and separation of concerns

1.1 `MUST`, `MUST NOT`, `SHALL` and `SHALL NOT` are normative. `MAY` is optional.
1.2 A rule is executable only against versioned configuration and immutable input records.
1.3 Methodology rules define how eligible facts are transformed. They do not establish that a source has rights, coverage or a particular schema.
1.4 Source-contract facts belong only in the source-rights register and versioned source configuration. They MUST NOT be inferred from this document.
1.5 Source content is untrusted data and cannot alter rules, mappings, thresholds, locks or approvals.
1.6 Any unknown that affects identity, comparability, provenance or authority causes the affected offer to be excluded; if a quality gate then fails, no index value is emitted.

## 2. Deterministic primitives

2.1 Dates use ISO `YYYY-MM-DD`; timestamps use RFC 3339 with an explicit offset.
2.2 Stable identifiers are opaque, case-sensitive strings unless a normalisation rule below explicitly applies.
2.3 Money inputs MUST be exact integer pence (`GBP_minor`). Binary floating point MUST NOT be used.
2.4 `median(values)` sorts ascending. For odd `n`, it returns element `(n+1)/2`; for even `n`, it returns the exact arithmetic mean of elements `n/2` and `n/2+1`. Intermediates remain exact rational decimals.
2.5 All ordering ties resolve by ascending stable identifier after the stated business keys.
2.6 A boolean or enumerated fact not explicitly present and mapped is `unknown`, never `false`, zero or free.
2.7 Immutable observations are never overwritten or deleted by a methodology run.

## 3. Proposed threshold register

Every value in this table is **proposed and locked pending human methodology approval**. Code MUST load the approved threshold-set ID; it MUST NOT silently copy these numbers into an activated calculation.

| ID | Parameter | Proposed value | Status |
|---|---|---:|---|
| T01 | Daily cut-off | 16:00 `Europe/London` | `PROPOSED_LOCKED` |
| T02 | Post-cut-off ingestion grace | 2 hours | `PROPOSED_LOCKED` |
| T03 | Maximum observation age at cut-off | 24 hours | `PROPOSED_LOCKED` |
| T04 | Fixed delivery destination | `SW1A 1AA`, United Kingdom | `PROPOSED_LOCKED` |
| T05 | Maximum stated dispatch lead time | 7 calendar days | `PROPOSED_LOCKED` |
| T06 | Minimum approved sources, standard state | 3 | `PROPOSED_LOCKED` |
| T07 | Minimum approved sources, reduced-source experiment | 2 | `PROPOSED_LOCKED` |
| T08 | Minimum distinct eligible retailers per index day | 3 | `PROPOSED_LOCKED` |
| T09 | Minimum eligible daily products | 10 | `PROPOSED_LOCKED` |
| T10 | Minimum basket product coverage | 80% | `PROPOSED_LOCKED` |
| T11 | Maximum one-source concentration | 50% of selected retailer-product observations | `PROPOSED_LOCKED` |
| T12 | Outlier modified-z threshold | 3.5 | `PROPOSED_LOCKED` |
| T13 | Outlier minimum peer count | 5 retailer observations for the product-day | `PROPOSED_LOCKED` |
| T14 | Zero-MAD hard ratio bounds | 0.50× to 2.00× peer median, inclusive | `PROPOSED_LOCKED` |
| T15 | Baseline window | 30 consecutive calendar days | `PROPOSED_LOCKED` |
| T16 | Minimum qualifying days per product in baseline | 20 | `PROPOSED_LOCKED` |
| T17 | Correction/provisional window | 7 calendar days after index date | `PROPOSED_LOCKED` |
| T18 | Stored index precision | 6 decimal places | `PROPOSED_LOCKED` |
| T19 | Displayed index precision | 2 decimal places | `PROPOSED_LOCKED` |
| T20 | Minimum distinct retailer groups per daily product price | 2 | `PROPOSED_LOCKED` |

No threshold is approved merely because it appears here.

## 4. Region, currency, time zone and cut-off

4.1 The candidate region is ISO 3166-1 alpha-2 `GB`. T04 is a fixed destination convention for comparability; the result does not claim that delivery charges are uniform across every UK postcode.
4.2 Currency is `GBP` only. Currency conversion is forbidden. A listing or fee in any other or unknown currency is excluded.
4.3 The civil time zone is IANA `Europe/London`; its applicable GMT/BST offset is resolved from the pinned time-zone database version stored with the run.
4.4 For index date `d`, `cutoff(d)` is T01 on civil date `d` in `Europe/London`. Ambiguous or invalid local times MUST be resolved by the pinned IANA rules; T01 is not normally in a DST transition interval.
4.5 The collection window is `(cutoff(d-1), cutoff(d)]`. An observation's source-effective timestamp MUST fall within this half-open interval.
4.6 A record may arrive during the T02 grace only if its source-effective timestamp is at or before `cutoff(d)`. Retrieval after `cutoff(d)+T02` is a correction input, not an original daily-run input.
4.7 At cut-off, `cutoff(d) - source_effective_at` MUST be between zero and T03 inclusive. Missing, future or unmapped source timestamps are ineligible. Retrieval time cannot substitute for a missing source-effective timestamp.
4.8 Every run stores `index_date`, UTC cut-off, local cut-off with offset, time-zone database version and grace deadline.

## 5. Product eligibility

A canonical product is eligible only when every condition is explicitly true in the approved, effective-dated catalogue revision:

5.1 total advertised kit capacity is exactly `32 GB`;
5.2 module count is exactly `2`;
5.3 capacity per module is exactly `16 GB`;
5.4 memory generation is exactly `DDR5`;
5.5 form factor is desktop `UDIMM`, not `SO-DIMM`, CAMM or another form;
5.6 ECC is explicitly `false`;
5.7 registered/buffered status is explicitly `unbuffered` and `registered = false`;
5.8 condition is a factory-new retail kit in original retail packaging;
5.9 one purchasable unit contains exactly the complete `2 × 16 GB` kit; and
5.10 manufacturer and manufacturer part number (`MPN`) are present.

Exclude single 32GB modules, four-module kits, mixed kits, server/workstation ECC or registered memory, laptop memory, used, refurbished, renewed, open-box, graded, auction, preorder-only, wholesale-only, account-specific B2B, subscription, rental, bare/OEM modules without an approved retail-kit equivalence, bundles with other products, and listings whose attributes conflict or are unknown.

Speed, timings, voltage, heat-spreader colour and RGB are identity attributes, not eligibility filters. Different manufacturer MPNs remain distinct products even when specifications appear equivalent.

## 6. Source eligibility — methodology gate, not source facts

6.1 A source has a stable `source_id`, legal entity, access route and effective-dated configuration.
6.2 For the exact intended private production use, the source-rights register MUST record human-approved `verified_permitted` status for automated collection, policy-compliant raw/evidence retention, derived-history creation and retention, private commercial display, and `cross_source_combination_status`. `unknown`, `contract_required` or `verified_restricted` fails this rule.
6.3 Required attribution, delay, retention, deletion, termination-survival and territorial conditions MUST be executable in source configuration. An unimplemented condition makes the source ineligible.
6.4 The source MUST provide or permit preservation of source-effective time, stable listing/offer identity, retailer/seller identity, price, GBP currency, VAT semantics, delivery semantics, stock/orderability and evidence provenance.
6.5 Approved field mappings and schema version MUST be effective at the observation time. Structural drift or an unmapped value fails closed.
6.6 Source priority for duplicate observations MUST be a human-approved, effective-dated total ordering. It cannot be inferred from price.
6.7 A comparison provider, affiliate network, API reseller or marketplace is one source even if it exposes many retailers. Several sellers on one marketplace do not create several sources.
6.8 Approval of one access route does not approve the provider's website, another API, another territory or another display mode.

## 7. Retailer and seller eligibility

7.1 `retailer_id` identifies the legal seller of record, not merely the marketplace, feed or trading name.
7.2 The retailer MUST be in the effective-dated approved retailer register and must sell to ordinary UK consumers in GBP.
7.3 It MUST deliver one kit to T04 without an unresolved geographic, membership, account, quantity or order-value condition.
7.4 The seller must be a business offering a factory-new item. Private sellers are excluded. Marketplace sellers MAY qualify only after independent legal-seller identity, condition, VAT, delivery and import-charge semantics are approved.
7.5 Cross-border offers are excluded unless VAT, duty, customs, handling and all mandatory import charges are explicit and included in the landed total.
7.6 Trading names under the same controlling retailer and checkout/inventory system share one `retailer_group_id`. Coverage and concentration treat that group as one retailer.
7.7 Paid placement or sponsored status does not itself exclude an offer, but it MUST be recorded; omission caused by rank-limited retrieval makes the source configuration ineligible as an exhaustive panel.

## 8. Listing eligibility and identity

8.1 A listing MUST have stable `source_id`, `source_listing_id`, canonical URL or source locator, `retailer_id`, source-effective timestamp and immutable observation ID.
8.2 The listing MUST represent one unit of exactly one eligible canonical product and no mandatory additional item.
8.3 Fixed-price retail offers qualify. Auctions, bids, "from" prices, price ranges without a selectable exact qualifying variant, quote-only and telephone-only prices do not.
8.4 The exact selected variant MUST be recorded; a parent page containing ineligible variants is not sufficient.
8.5 Quantity limits qualify if an ordinary consumer can buy one. Multi-buy-only prices do not.
8.6 A listing with conflicting title, structured fields, image-derived claims or identifiers is `IDENTITY_CONFLICT` and excluded pending review. The pipeline MUST NOT resolve the conflict probabilistically.

## 9. Exact and approved product identifiers

9.1 Normalise MPN only by Unicode NFKC, trimming leading/trailing whitespace, upper-casing with locale-independent rules, and removing ASCII spaces and hyphens. No other punctuation or substring removal is allowed. Store raw and normalised values.
9.2 A GTIN is exact only if it has 8, 12, 13 or 14 decimal digits, passes the GS1 check-digit algorithm and exists in the approved canonical identifier table. Leading zeroes are retained.
9.3 A listing matches a product only by the first applicable method in this order:

| Priority | Match method | Pass condition |
|---:|---|---|
| 1 | Exact GTIN | Valid observed GTIN maps to exactly one canonical product and no observed identifier conflicts |
| 2 | Exact manufacturer + MPN | Approved manufacturer alias plus normalised MPN maps to exactly one canonical product and no conflict exists |
| 3 | Approved listing mapping | Effective-dated, human-reviewed `(source_id, source_listing_id, selected_variant)` mapping names exactly one product |
| — | Otherwise | Abstain and exclude |

9.4 If exact methods point to different products, the result is `IDENTITY_CONFLICT`, regardless of priority.
9.5 Retailer SKU, seller SKU, ASIN or source product ID is not a manufacturer identifier. It qualifies only through an approved listing mapping.
9.6 Probabilistic title/specification matches are not eligible for this index. They may enter a review queue but cannot enter calculations.

## 10. Stock and orderability

10.1 The source stock value MUST map through an approved, versioned mapping to one of `IN_STOCK`, `OUT_OF_STOCK`, `BACKORDER`, `PREORDER`, `DISCONTINUED` or `UNKNOWN`.
10.2 Only `IN_STOCK` qualifies. It means one unit can be ordered at cut-off for delivery to T04 and the stated dispatch lead is no more than T05.
10.3 `available`, blank, page-present or price-present is not sufficient unless the source contract/data dictionary and approved mapping define it as `IN_STOCK`.
10.4 Backorders, preorders, waiting lists, discontinued stock, pickup-only stock and unknown lead time are excluded.
10.5 If checkout/orderability evidence conflicts with a feed stock flag, exclude the observation and raise `STOCK_CONFLICT`; do not choose the more favourable value.

## 11. VAT, delivery and landed total

11.1 Every qualifying component of the consumer payment MUST be VAT-inclusive.
11.2 Item VAT qualifies when either (a) the source explicitly states the item amount is VAT-inclusive, or (b) an explicit net item amount and applicable VAT amount/rate are supplied and the approved tax rule reproduces the gross amount exactly. An assumed VAT rate is forbidden.
11.3 Delivery is the cheapest mandatory, non-membership, standard home-delivery charge for one kit to T04 that meets T05. Click-and-collect is not home delivery. Faster optional services are ignored.
11.4 Delivery VAT must be explicit as included or deterministically calculable under an approved tax rule. `free` maps to zero only when no order threshold, membership, coupon, unrelated basket item or other condition is required.
11.5 Mandatory handling, service, small-order, packaging, customs, duty and payment fees are included. If any mandatory fee is unknown, the offer is excluded.
11.6 No unrelated goods may be added to reach a free-delivery or discount threshold.
11.7 `landed_total_minor = discounted_item_gross_minor + delivery_gross_minor + mandatory_fee_gross_minor`. Each term is non-negative integer GBP pence.
11.8 A landed total less than or equal to zero is invalid.
11.9 Store every component, its VAT status and the exact rule version. Never mix landed and unlanded observations.

## 12. Discounts, promotions and conditional prices

12.1 Include an automatic item discount already applied for every ordinary consumer at cut-off.
12.2 Include a public promotion code only if all consumers can use it, it is valid at cut-off, applies to one qualifying kit without another purchase, and the code plus terms are retained in permitted evidence.
12.3 Where several eligible promotions are mutually exclusive, apply the single promotion producing the lowest landed total. Where terms explicitly permit stacking, evaluate every permitted combination and select the lowest landed total. Tie-break by lexicographically sorted promotion IDs.
12.4 Exclude member-only, employee, student, trade, account-specific, personalised, targeted, app-only, subscription, finance-dependent, payment-method-dependent and first-order prices.
12.5 Exclude mail-in rebates, manufacturer cashback, loyalty points, gift cards, future credits, trade-ins and uncertain cashback because they are not an unconditional payment reduction at checkout.
12.6 A promotion whose validity, scope, stacking or checkout effect is unknown is ignored; if the displayed listing price itself depends on that unknown promotion, the offer is excluded.

## 13. Multiple offers and duplicate control

13.1 An `offer_key` is `(source_id, retailer_id, source_listing_id, selected_variant, canonical_product_id)`.
13.2 Within one offer key and collection window, select the eligible observation with the latest `source_effective_at`; then latest `retrieved_at`; then lowest immutable `observation_id`.
13.3 If several source listings from one retailer map to the same product, the retailer contributes only its lowest eligible landed total. Tie-break by `source_listing_id`, then `observation_id`.
13.4 If multiple sources report the same retailer listing/offer, de-duplicate by approved cross-source listing key. Select the highest approved source priority, then apply Rule 13.2. Price never determines source priority.
13.5 If cross-source records appear to duplicate but have no approved cross-source key, exclude the ambiguous records and raise `DUPLICATE_IDENTITY_UNKNOWN`; do not double count.
13.6 A retailer group contributes at most one observation per canonical product per day.

## 14. Daily retailer observation

For each `(index_date, retailer_group_id, canonical_product_id)`:

14.1 filter observations through Rules 4–13;
14.2 apply duplicate control;
14.3 select the minimum landed total;
14.4 retain the complete lineage to every considered record and an exclusion reason for each rejected record; and
14.5 emit one `daily_retailer_observation` containing landed total, chosen listing/observation, source, retailer, product, promotion IDs, rule version and status.

The retailer-level minimum represents the cheapest ordinary-consumer way to buy that exact kit from that retailer at the cut-off. It is not an average and is not sales-weighted.

## 15. Outliers and anomalies

15.1 Outlier testing occurs after daily retailer observations and before daily product price. It is performed separately for each product-day.
15.2 Let `x_i` be eligible retailer landed totals and `m = median(x)`. If count is below T13, perform no statistical exclusion; flag the product `OUTLIER_TEST_LOW_N`.
15.3 For count at least T13, calculate `MAD = median(abs(x_i - m))`.
15.4 If `MAD > 0`, flag observation `i` when `0.6745 × abs(x_i - m) / MAD > T12`. Use exact decimal arithmetic.
15.5 If `MAD = 0`, flag observation `i` when `x_i / m < 0.50` or `x_i / m > 2.00`; boundary values pass.
15.6 A flagged observation is excluded from the product median and enters review. Its raw record is retained.
15.7 If an authorised human reviewer determines the price was valid, an additive override may include it only through a new calculation revision carrying the approver identity and approval ID. If invalid, the correction record gives a reason. Agents may propose the review outcome but cannot approve it.
15.8 Outlier removal cannot cause coverage gates to be bypassed. Gates are evaluated after removal.
15.9 The index also stores an unfiltered diagnostic product median; it is never substituted for the official value.

## 16. Daily product price

16.1 For each eligible canonical product, collect non-outlier daily retailer observations.
16.2 The daily product price is their unweighted median landed total.
16.3 A product-day needs observations from at least T20 distinct eligible retailer groups; otherwise its daily product price is missing.
16.4 Different sources reporting the same retailer do not increase retailer count.
16.5 Store input retailer-observation IDs, counts before/after outlier filtering, exclusion counts, source set and exact rational result.
16.6 Do not round before index calculation.

## 17. Basket membership

17.1 The basket is a human-reviewed, effective-dated set of canonical product IDs satisfying Rule 5.
17.2 Basket inclusion cannot be inferred merely from being observed. Each entry requires approval evidence and an effective start date.
17.3 Material identity changes create a new canonical product. A replacement, successor, colour variant or speed variant does not silently inherit membership or baseline.
17.4 Removal is prospective by default and requires a reason code: `DISCONTINUED`, `IDENTITY_CORRECTION`, `INELIGIBLE`, `RIGHTS_EFFECT` or `METHODOLOGY_CHANGE`. For an approved series, removal does not shrink `baseline_basket_product_ids`; the product remains missing in the coverage denominator until an approved rebase or new series. Backdating requires a correction revision.
17.5 The effective basket revision is frozen for an index date. A run stores its ordered product IDs and basket hash.
17.6 Products lacking a daily price remain basket members and count as missing for coverage; they are not silently dropped from the denominator.
17.7 `baseline_basket_product_ids` is immutable for the life of the series once the baseline is approved. Later additions or denominator removals require a new baseline/methodology series or an explicitly approved linking method; v0.1 defines no linking method.

## 18. Coverage and source concentration

Calculate after matching, duplicate control, stock/price qualification and outlier removal.

18.1 `source_count` = distinct approved `source_id` values among selected daily retailer observations contributing to daily product prices.
18.2 `retailer_count` = distinct `retailer_group_id` values among those observations.
18.3 `product_count` = basket products with an official daily product price.
18.4 `basket_coverage = product_count / count(baseline_basket_product_ids)`. The denominator is immutable for the approved series.
18.5 Define `contributing_observations` as selected daily retailer observations only for products with an official, non-missing daily product price. `source_concentration(s) = count(contributing_observations where source_id = s) / count(all contributing_observations)`.
18.6 Each source configuration has an effective-dated `acquisition_vendor_group_id` representing its common contractual, collection or failure domain. `vendor_group_concentration(g) = count(contributing_observations where acquisition_vendor_group_id = g) / count(all contributing_observations)`. Unknown grouping is conservatively shared, not independent.
18.7 Standard quality requires T06 sources, T08 retailers, T09 products, T10 basket coverage, every source concentration at or below T11 and every vendor-group concentration at or below T11.
18.8 A T07 reduced-source state is allowed only after a separate human approval explicitly names dates, sources, limitations and `EXPERIMENTAL_REDUCED_SOURCE`. It cannot be labelled standard, production-ready or publishable.
18.9 A source routed through two vendors remains one upstream source where provenance shows common origin. Conversely, one aggregator remains one contractual source for T06 unless approved source-independence mapping says otherwise. Unknown overlap is treated as common, not independent.
18.10 Coverage values, source/vendor-group concentrations and numerator/denominator IDs are stored even when a gate fails.

## 19. Missing data and no imputation

19.1 Missing, stale, invalid, conflicting, unmatched, out-of-stock, non-GBP, tax-unknown, delivery-unknown, rights-ineligible and outlier records are absent from official price inputs and retain explicit reason codes.
19.2 No forward fill, backward fill, interpolation, model estimate, retailer average, product substitution, prior close, zero delivery assumption or currency conversion is permitted.
19.3 A missing product daily price remains missing. Basket denominator does not shrink.
19.4 If any coverage or concentration gate fails, no official daily basket price or index value is emitted. Store a quality record with `value = null`.
19.5 A later valid observation may affect history only through the correction process in Rule 27.

## 20. Daily basket price

20.1 When all standard quality gates pass, `daily_basket_price(d) = median(daily_product_price(p,d) for p in baseline_basket_product_ids with a value on d)`.
20.2 This is an unweighted median of exact-kit daily landed prices. It is not a cost to purchase every product, a sales-weighted average or a lowest-market offer.
20.3 Store the exact product-price IDs and basket revision.
20.4 A daily basket price is descriptive. The index formula in Rule 23 uses product-relative values to limit price-level differences between kits.

## 21. Baseline candidate construction

21.1 A human proposes a start date. The baseline window is T15 consecutive calendar dates from that date.
21.2 Every baseline date must have a standard-quality result under the same methodology, threshold set, source configuration class and basket revision. Experimental reduced-source days do not qualify.
21.3 For each basket product, collect official daily product prices in the window. The product qualifies for the baseline only with at least T16 qualifying dates.
21.4 `product_baseline_price(p) = median(qualifying daily product prices for p in the baseline window)`.
21.5 The baseline basket is the subset meeting Rule 21.3. It must independently satisfy T09 and is frozen on approval.
21.6 Recalculate baseline-date coverage against the frozen baseline basket. Every date must satisfy T10 and all other gates; otherwise the candidate baseline fails.
21.7 Store exact dates, inputs, per-product baselines, exclusions, versions and hashes. No missing baseline price is imputed.

## 22. Baseline approval and rebasing

22.1 A candidate baseline has no force until a human approves its input hash, window, basket, product baselines and effective series ID.
22.2 Approval creates immutable `baseline_version`.
22.3 Routine corrections do not silently alter an approved baseline. If corrected data would change it, the system calculates an impact report and remains on the existing baseline until a human approves either a baseline revision or no change.
22.4 Rebasing creates a new major methodology series or explicitly approved linked series. v0.1 does not define chain-linking, so it MUST NOT be improvised.
22.5 Historical series using different baselines MUST be labelled and stored separately.

## 23. Index formula

For date `d`, let `P_d` be baseline-basket products with an official daily product price and approved product baseline price.

23.1 Quality gates use the frozen baseline basket as denominator and must pass before calculation.
23.2 For each `p in P_d`, calculate exact price relative:

`relative(p,d) = daily_product_price(p,d) / product_baseline_price(p)`

23.3 Calculate:

`index_raw(d) = 100 × median(relative(p,d) for p in P_d)`

23.4 The index is equally weighted by canonical product, not retailer, source, revenue, units sold, brand or price.
23.5 Each retailer first contributes at most one observation per product, each product contributes one relative, and each product has equal weight.
23.6 The approved baseline window's aggregate index is expected to centre near 100 but individual dates are not forced to 100. No scaling adjustment is applied.
23.7 Store every relative and exact input lineage.

## 24. Rounding

24.1 Source monetary components are integer pence and are never rounded by the index pipeline.
24.2 Exact half-penny medians and ratios are retained as arbitrary-precision decimals/rationals through Rule 23.
24.3 Store index values to T18 using decimal round-half-up.
24.4 Display index values to T19 using decimal round-half-up from the unrounded `index_raw`, not from the stored T18 value.
24.5 Display GBP prices to two decimal places using round-half-up; stored exact derived values and lineage remain available.
24.6 Threshold comparisons use unrounded values.
24.7 The decimal library name and version are part of `calculation_engine_version`.

## 25. Quality states and precedence

Assign exactly one primary state using the first matching row. Secondary flags are also retained.

| Precedence | State | Machine condition | Official value |
|---:|---|---|---|
| 1 | `LOCKED_RIGHTS_OR_ACTIVATION` | Production activation lock true, source authority unknown, or source not approved | `null` in production; fixture/shadow diagnostic separately labelled |
| 2 | `INVALID_INPUT_OR_VERSION` | Integrity/hash failure, unknown required config, unsupported schema, identity/provenance conflict in a selected input, or replay mismatch | `null` |
| 3 | `INSUFFICIENT_SOURCE_COVERAGE` | source count below T06 and no valid reduced-source approval | `null` |
| 4 | `EXPERIMENTAL_REDUCED_SOURCE` | source count at least T07 but below T06 and explicit reduced-source approval exists; all other gates pass | official value `null`; a separately labelled private diagnostic value may be calculated and stored; publication locked |
| 5 | `INSUFFICIENT_RETAILER_COVERAGE` | retailer count below T08 | `null` |
| 6 | `INSUFFICIENT_PRODUCT_COVERAGE` | product count below T09 or basket coverage below T10 | `null` |
| 7 | `HIGH_SOURCE_CONCENTRATION` | any concentration exceeds T11 | `null` |
| 8 | `ANOMALY_REVIEW_REQUIRED` | unresolved outlier/duplicate/stock anomaly could change a gate or displayed rounded index | `null` |
| 9 | `PROVISIONAL` | all gates pass and date is within T17 or pending scheduled finalisation | calculated; private only if separately authorised |
| 10 | `FINAL_PRIVATE` | all gates pass, T17 elapsed, checks/replay pass and private activation is approved | calculated; external publication still locked |

25.1 Failure states are visible and never replaced with the last valid index.
25.2 `FINAL_PRIVATE` does not mean public, source-rights or regional approval beyond the recorded private scope.
25.3 An anomaly that cannot affect gates or the T19 displayed index may remain a secondary flag after recorded deterministic impact analysis; otherwise Rule 25 row 8 applies.
25.4 Unknown quality state maps to `INVALID_INPUT_OR_VERSION`.

## 26. Methodology, configuration and calculation versioning

26.1 `methodology_version` uses semantic versioning. Major: basket concept, formula, region, product scope, baseline framework or comparability change. Minor: approved deterministic rule that can alter eligibility/value. Patch: clarification or bug fix demonstrated not to alter any result; if results alter, it is at least minor.
26.2 Threshold set, basket, baseline, catalogue, identifier mappings, retailer register, source rights/configuration, source priority, tax rules, promotion rules, time-zone database and calculation engine each have immutable versions and content hashes.
26.3 A `calculation_version` is the ordered tuple and hash of all versions above plus code commit and decimal library version.
26.4 Effective dates cannot overlap for the same configuration key. Unknown or ambiguous effective version fails closed.
26.5 Methodology/configuration changes are proposed, impact-replayed, audited and explicitly human-approved before effective use. Agents cannot approve or activate them.
26.6 Historical reproduction retains the originally effective calculation version even after a new version exists.

## 27. Corrections and revisions

27.1 Raw observations are immutable. A correction is an append-only record referencing the affected immutable record, reason, evidence, author/approver, timestamp and replacement or exclusion instruction.
27.2 Allowed reason codes are `SOURCE_RESTATEMENT`, `INGESTION_ERROR`, `IDENTITY_MAPPING_ERROR`, `TAX_DELIVERY_ERROR`, `STOCK_ERROR`, `DUPLICATE_ERROR`, `LATE_OBSERVATION` and `METHODOLOGY_IMPLEMENTATION_ERROR`; additions require a versioned schema change.
27.3 Corrections never mutate an as-calculated result. They produce a new `calculation_revision` with parent revision, changed-input set and impact report.
27.4 Revision numbers start at `0` for the original daily run and increment by one in approval order. Concurrent proposals are serialised; rejected proposals remain in the audit log.
27.5 Every value-changing correction, outlier override, identity correction and baseline-impact decision requires explicit authorised-human approval, including within T17. Automated source restatements may create correction proposals and impact reports but cannot activate a revision. A qualifying approved correction within T17 may move from `PROVISIONAL` to a later provisional revision.
27.6 A published value, if publication is ever separately approved, is never silently replaced. The old value, new value, reason, approval, affected dates and publication timestamp remain available.
27.7 Corrections affecting the baseline follow Rule 22.3.

## 28. Deterministic replay

28.1 A replay input manifest contains immutable observation/evidence hashes, all correction IDs, correction approver identities and approval IDs, all configuration/version hashes, calculation-engine commit, runtime/decimal library, time-zone database, index date and requested revision.
28.2 The engine sorts all sets by their specified stable keys; database natural order, locale collation, current time, network state and random values are forbidden inputs.
28.3 The engine performs no network calls and reads no mutable "latest" configuration during replay.
28.4 A replay passes only when selected/rejected observation IDs and reason codes, retailer observations, outlier flags, product prices, basket members, coverage, quality state, exact index input and T18 stored value equal the recorded output byte-for-byte under the canonical serialisation.
28.5 Any mismatch sets `INVALID_INPUT_OR_VERSION`, blocks finalisation/publication and raises an operational incident.
28.6 Every daily run stores its manifest and output checksum.

## 29. Publication lock

29.1 `external_publication_locked` defaults to `true` and is independent of quality state.
29.2 No agent, calculation, source score or methodology file may change it.
29.3 A human publication approval must identify series, region, source contracts and permitted display mode, methodology/calculation versions, attribution, correction policy, effective date and approver.
29.4 If any selected source lacks rights for the intended audience, the lock remains true even when private rights exist.
29.5 Raw/source-level redistribution is prohibited unless each applicable contract expressly permits it; aggregate publication permission does not imply raw redistribution.
29.6 Until explicit approval, API, dashboard, export and message surfaces MUST return lock status and no externally publishable value.

## 30. Source-contract facts — deliberately non-normative

This section records diligence context only and is not an eligibility grant or methodology input.

30.1 The 5 August 2026 UK/Germany research report scored the UK diligence portfolio `3.00/5` but concluded **NO-GO**.
30.2 It identified PriceRunner commercial API and PriceAPI as principal UK contract-diligence routes and Awin as a possible supplementary retailer-diversification route.
30.3 The reviewed public material did not establish the full rights chain for any UK route. Amazon's standard affiliate route conflicts with long-term historical index use; other routes require contract clarification or amendment.
30.4 These facts MUST be maintained in the source-rights register with authoritative evidence, retrieval dates and human decisions. If that register differs from this summary, the register controls.
30.5 Neither this draft nor the research reports approve a source, retailer, region, contract or production collection.

## 31. Machine-testable decision procedure

```text
function calculate_day(d, run_manifest):
    assert run_manifest.methodology_id == "SF-GB-DDR5-32-UDIMM-OFFER"
    cfg = load_by_hashes(run_manifest.config_hashes)
    if cfg.production_mode and cfg.activation_lock:
        return result(d, null, LOCKED_RIGHTS_OR_ACTIVATION)
    if cfg.production_mode:
        assert cfg.threshold_set.status == HUMAN_APPROVED
    else:
        assert cfg.threshold_set.status in {DRAFT_PROPOSED, HUMAN_APPROVED}
    assert cfg.region == GB and cfg.currency == GBP

    candidates = immutable_observations_in_window(d, cfg.cutoff, cfg.grace)
    considered = []
    for o in stable_sort(candidates, observation_id):
        reason = first_failure([
            source_eligible(o, cfg),
            retailer_eligible(o, cfg),
            timestamp_eligible(o, d, cfg),
            listing_eligible(o, cfg),
            exact_product_match(o, cfg),
            stock_eligible(o, cfg),
            vat_delivery_known(o, cfg),
            discount_eligible_or_ignored(o, cfg),
            landed_total_valid(o, cfg)
        ])
        considered.append((o, reason))

    eligible = [o for (o, reason) in considered if reason == NONE]
    listing_latest = choose_latest_per_offer_key(eligible)
    deduped = deduplicate_cross_source(listing_latest, cfg.source_priority)
    retailer_daily = choose_min_landed_per_retailer_group_product(deduped)

    filtered = []
    flags = []
    for product_id in stable_product_ids(retailer_daily):
        peers = retailer_daily[product_id]
        outliers = deterministic_mad_outliers(peers, T12, T13, T14)
        flags += outliers.flags
        filtered += peers - outliers.excluded

    product_daily = {}
    for product_id in stable_product_ids(filtered):
        peers = filtered[product_id]
        if distinct_retailer_groups(peers) >= T20:
            product_daily[product_id] = exact_median(peer.landed_total for peer in peers)
        else:
            product_daily[product_id] = MISSING

    contributing_observations = [o for o in filtered
                                 if product_daily[o.product_id] is not MISSING]
    coverage = calculate_coverage(contributing_observations, product_daily,
                                  cfg.baseline_basket,
                                  cfg.acquisition_vendor_groups)
    state = quality_state_by_precedence(coverage, flags, cfg, d)
    if state == EXPERIMENTAL_REDUCED_SOURCE:
        diagnostic = calculate_non_official_index(product_daily, cfg,
                                                   label=EXPERIMENTAL_REDUCED_SOURCE)
        return result(d, official_value=null, state=state,
                      diagnostic_value=diagnostic,
                      publication_locked=true,
                      lineage=full_lineage_and_coverage)
    if state not in {PROVISIONAL, FINAL_PRIVATE}:
        return result(d, null, state, full_lineage_and_coverage)

    basket_price = exact_median(product_daily[p]
                                for p in cfg.baseline_basket
                                if product_daily[p] is not MISSING)
    relatives = [product_daily[p] / cfg.product_baseline[p]
                 for p in stable_sort(cfg.baseline_basket)
                 if product_daily[p] is not MISSING]
    index_raw = 100 * exact_median(relatives)
    index_stored = round_half_up(index_raw, T18)

    output = result(d, index_stored, state, basket_price,
                    relatives, full_lineage_and_coverage)
    assert canonical_hash(output) == replay_or_new_output_hash(output)
    return output
```

## 32. Required reason-code decision table

| Condition | Offer result | Reason code |
|---|---|---|
| Rights/config not approved | Exclude | `SOURCE_NOT_APPROVED` |
| Timestamp missing/stale/outside window | Exclude | `TIMESTAMP_INELIGIBLE` |
| Product attributes unknown or ineligible | Exclude | `PRODUCT_INELIGIBLE` |
| No exact or approved identifier match | Exclude/queue | `MATCH_ABSTAINED` |
| Exact identifiers conflict | Exclude/queue | `IDENTITY_CONFLICT` |
| Not explicitly in stock or lead too long | Exclude | `STOCK_INELIGIBLE` |
| Currency not exactly GBP | Exclude | `CURRENCY_INELIGIBLE` |
| VAT basis unknown | Exclude | `VAT_UNKNOWN` |
| Delivery/mandatory fee unknown | Exclude | `LANDED_TOTAL_UNKNOWN` |
| Conditional discount drives shown price | Exclude | `DISCOUNT_INELIGIBLE` |
| Duplicate cannot be deterministically resolved | Exclude/queue | `DUPLICATE_IDENTITY_UNKNOWN` |
| Deterministic outlier rule triggers | Exclude/queue | `PRICE_OUTLIER` |
| All offer rules pass | Include | `ELIGIBLE` |

## 33. Acceptance tests required before approval

1. GMT and BST dates resolve to the intended 16:00 local cut-off and distinct UTC timestamps.
2. An observation exactly at cut-off qualifies; one microsecond after does not.
3. Every excluded product subtype in Rule 5 fails with `PRODUCT_INELIGIBLE`.
4. Valid GTIN, invalid check digit, exact MPN, approved listing map and conflicting identifiers follow Rule 9.
5. Unknown stock, VAT, delivery, mandatory fee or currency fails closed.
6. Promotion combinations produce one deterministic landed total and reject conditional benefits.
7. Duplicate sources and retailer trading names contribute only once.
8. Odd/even medians, zero MAD, boundary ratios and modified-z boundaries use exact comparisons.
9. Missing products remain in the coverage denominator and are never imputed.
10. Each coverage and concentration boundary passes at equality and fails immediately outside it.
11. Baseline construction fails below T16 and does not silently rebase after correction.
12. Fixed manifests replay byte-for-byte across two clean runs.
13. A corrected value creates an additive revision and preserves revision 0.
14. Rights, activation and publication locks override otherwise passing data.
15. No binary floating-point value appears in stored money, median, relative or index calculations.
16. A product with observations from fewer than T20 retailer groups contributes to neither source count nor source/vendor-group concentration.
17. Two source IDs sharing one `acquisition_vendor_group_id` fail T11 when their combined concentration exceeds the threshold, even if each source is individually below it.

---

**Approval status:** `DRAFT_NOT_APPROVED`
**UK production status:** `DILIGENCE_ONLY_NO_GO`
**Production activation:** `LOCKED_PENDING_SOURCE_RIGHTS_AND_HUMAN_APPROVAL`
**External publication:** `LOCKED_PENDING_SEPARATE_HUMAN_APPROVAL`
