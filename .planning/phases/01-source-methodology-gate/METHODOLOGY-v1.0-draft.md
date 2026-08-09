# Methodology v1.0 draft — UK 32GB DDR5 historical price layers

- **Document status:** Design draft; not approved for production or publication
- **Methodology ID:** `SF-GB-DDR5-32-UDIMM-HISTORY`
- **Methodology version:** `1.0.0-draft`
- **Decision date:** 9 August 2026
- **Requirements addressed:** SRC-03, SRC-04, IDX-01–IDX-09, APP-01, APP-03, EVT-03, OPS-02
**Predecessor preserved:** `METHODOLOGY-v0.1.md` remains unchanged and replayable.

## 0. Authority and non-activation

This draft records the clarified product design. It approves no region, source, basket, basket-vintage link, historical reference, threshold, official deflator, earnings measure, production calculation or publication.

- `production_activation_locked = true`
- `methodology_change_locked = true`
`external_publication_locked = true`

Every choice newly introduced here is `PROPOSED_LOCKED`. An example formula specifies a deterministic interface; it is not approval of the formula, inputs or thresholds. The private 2026-08-09 quoted-item relative diagnostic remains useful operational evidence, but it is `not_an_index`; its inception value of 100 has no historical, affordability or normality meaning.

Where this draft does not change a rule, v0.1 remains the detailed candidate rule for exact identity, landed price, retailer/source qualification, outliers, basket coverage, corrections and replay. Where the product model differs, this draft controls only after an authorised human approves a complete version and its impact report. Existing v0.1 calculations and artefacts are never rewritten.

## 1. Product question and layer contract

The product should show how recent UK 32GB DDR5 desktop-kit retail prices moved around AI-era shortages and other market shocks. It must not imply that collection inception was normal merely because that is where prospective collection began.

The system keeps these layers separate:

1. **Native basket-vintage series:** daily calculation output for one frozen, approved product basket under one calculation scale.
2. **Linked nominal category history:** daily money-of-the-day movement formed from approved native vintages and approved deterministic links. This is the primary numeric history.
3. **Historical-reference presentation:** an optional rescaling of the linked nominal history so an evidence-approved historical reference period equals 100.
4. **Monthly constant-price history:** monthly linked nominal history deflated by a pinned release vintage of one approved official UK deflator.
5. **Earnings-relative affordability:** an optional monthly comparison with a pinned release vintage of an approved official UK earnings measure.
6. **Event overlays:** mathematically separate annotations referencing immutable numeric and event revisions.

No downstream layer may mutate an upstream layer. Each stores a distinct series ID, revision, input manifest and checksum.

## 2. Basket-vintage scale is not historical normal

### 2.1 Native basket-vintage reference scale

A basket vintage freezes product membership, denominator, weighting, rules and effective dates. Its internal scale exists to calculate product relatives and support overlap. The native scale may be normalised to an internal value such as 100 only under an approved basket configuration.

That internal 100 means only “the arithmetic reference for this basket vintage”. It MUST NOT be labelled cheap, affordable, representative, pre-shock, normal or historical reference. Basket succession does not authorise successor substitution, backcasting or automatic membership changes.

### 2.2 Historical reference presentation

A historical reference is a separate interpretation applied after nominal vintages are linked. Candidate period `H` may be approved only through a checksum-bound evidence packet containing:

- the product question and rationale for considering `H`;
- approved-source, product, retailer and basket coverage across `H`;
- lifecycle/composition and market-regime evidence;
- known shortage, launch-cycle, pandemic, supply, currency and exceptional-promotion context;
- inflation and, where relevant, earnings context;
- explicit exclusions and missingness;
- sensitivity results for plausible alternative periods and aggregation choices;
- exact linked-series revision and dates used; and
- an attributable human decision specifying the allowed label.

No period is selected by minimising price, improving the narrative or defaulting to collection inception. “Reference period” is the default label. “Normal” or “affordable” requires evidence for that stronger statement. If no candidate passes, this layer is unavailable while linked nominal history may remain available.

For an approved aggregation operator `A_H`:

`historical_reference_level = A_H(linked_nominal(d) for approved d in H)`

`nominal_reference_100(d) = 100 × linked_nominal(d) / historical_reference_level`

The operator, eligibility/completeness rule, period and sensitivity gate are all `PROPOSED_LOCKED`. Rescaling changes neither the linked movement ratios nor any native vintage or link factor.

## 3. Native and linked nominal history

### 3.1 Native daily vintage

A native vintage inherits approved v0.1 qualification and quality rules. Every daily point records immutable observation lineage, product prices, basket ID/hash, rule versions, coverage and quality state. A missing product remains in its approved denominator. Failed quality yields `value = null`.

### 3.2 Linking interface

Before a new basket vintage begins, old and candidate-new baskets should run over an approved overlap window. A link decision must bind:

- old and new basket IDs/hashes;
- overlap dates and quality records;
- exact native values or constituent relatives;
- proposed link operator and precision;
- exclusion and missingness rules;
- sensitivity and discontinuity report;
- approver and effective date; and
- calculation/input hashes.

For old linked level `L_old(t*)`, native old value `V_old(t*)` and native new value `V_new(t*)` over an approved link reference `t*`, one candidate interface is:

`link_factor_new = L_old(t*) / V_new(t*)`

`linked_nominal_new(d) = link_factor_new × V_new(d)`

If `t*` is a window, the approved operator determines each reference value. The exact operator, overlap duration, completeness, discontinuity and acceptance thresholds remain `PROPOSED_LOCKED`. This document does not approve single-day linking, mean linking, median linking or another method.

A link creates a new linked-series revision. It preserves both native vintages and all previous linked revisions. No overlap or no approved method means a gap, not a splice.

### 3.3 Nominal interpretation

The linked nominal series measures category price movement in pounds of each observation date. It is not inflation-adjusted, earnings-adjusted, sales-weighted or event-adjusted. Charts must identify basket-vintage boundaries and gaps even when the approved link makes level continuity possible.

## 4. Monthly nominal aggregation

Real and earnings-relative output are monthly. Daily linked nominal values are transformed into calendar-month value `N_m` only when an approved monthly aggregation and completeness rule passes.

The following remain `PROPOSED_LOCKED`:

- monthly operator (for example, median or mean of eligible daily values);
- expected observation calendar;
- minimum eligible-day count/share;
- treatment of weekends/holidays;
- treatment of a basket-vintage boundary inside a month; and
- whether a provisional current month may be shown.

No partial month may masquerade as a complete month. There is no interpolation, forward/backward fill or model estimate.

## 5. Monthly constant-price real history

### 5.1 Approved-deflator gate

The deflator must be one specifically approved official UK statistical series. “CPI”, “CPIH” or “inflation” without provider, exact series identifier and concept is insufficient. Selection requires an evidence/impact decision covering conceptual fit, population/coverage, frequency, seasonal-adjustment status, revision behaviour, availability, rights/retention, reference period and limitations.

No official series is selected by this draft. Candidate review may compare official UK CPI/CPIH series, but convenience cannot approve one.

### 5.2 Release-vintage lineage

A deflator release-vintage manifest MUST record:

- official provider and canonical publication/source URL;
- exact series code, title, unit, frequency and adjustment status;
- observation month and value;
- observation status such as provisional/final where supplied;
- publication/release identifier and release timestamp/date;
- retrieval timestamp and access route;
- retained permitted bytes/checksum or checksum-bound factual extract;
- revision/supersession relationships;
- parser/mapping version; and
- immutable release-vintage ID/hash.

One real-series revision uses one pinned, internally coherent deflator release vintage. It must not mix “latest” observations fetched on different runs without an approved vintage construction rule.

### 5.3 Formula

For complete nominal month `N_m`, deflator `D_(m,v)` for month `m` in release vintage `v`, and approved constant-price reference month/period `r`:

`real_level_(m,v) = N_m × D_(r,v) / D_(m,v)`

If `r` is a period, its deflator operator is versioned and `PROPOSED_LOCKED`. The result is in constant prices of the approved reference period. A separately approved real-reference presentation may set an evidence-approved historical period to 100:

`real_reference_100_(m,v) = 100 × real_level_(m,v) / A_H(real_level_(h,v) for approved h in H)`

The formula uses exact decimal/rational arithmetic and versioned rounding. A later official release creates a new real-series revision plus an impact report. The as-calculated earlier release-vintage series remains reproducible and queryable; “latest vintage” is a view, not mutation.

## 6. Optional earnings-relative affordability

This layer answers a different question: how the component price compares with earnings. It is optional and not part of v1 activation.

Before approval it must define:

- official UK provider and exact earnings series;
- covered population and earnings concept (for example weekly/hourly, total/regular, mean/median);
- nominal/real and seasonal-adjustment status;
- frequency and month-alignment rule;
- observation and release-vintage lineage equivalent to Rule 5.2;
- reference period and interpretation; and
- statistical revision policy.

For approved monthly nominal component level `N_m` and earnings value `E_(m,v)`:

`earnings_burden_(m,v) = N_m / E_(m,v)`

An optional reference presentation may set an approved historical burden to 100. Every formula and input remains `PROPOSED_LOCKED`. This series is not called constant-price and cannot replace a missing nominal or real value.

## 7. Event overlays never alter numbers

Event records and overlays follow `docs/EDITORIAL-INTELLIGENCE-DESIGN.md`. Numeric calculation completes without reading events, claims, impact direction, confidence or causal language.

An overlay contains only its immutable overlay revision/hash, approved event revision/hash, target numeric series ID/revision/hash, display date/range and precision, label/editorial state, reviewer and supersession link. Numeric overrides, weights, link/reference/deflator instructions, imputations and gap-fill fields are forbidden.

Adding, editing, approving, moving, withdrawing or deleting an event overlay MUST leave all native, linked nominal, historical-reference, real and affordability input/output checksums unchanged. An event may explain, challenge or contextualise a movement. It can never cause one.

## 8. Explicit unavailable states

Every unavailable result stores `value = null`, series/layer, affected date/month, primary reason, secondary reasons, available input lineage and calculation version. The product renders a gap and reason rather than a fabricated point.

| State | Layer/condition |
|---|---|
| `UNAVAILABLE_RIGHTS_OR_ACTIVATION` | Required authority, source or activation is absent |
| `UNAVAILABLE_NATIVE_QUALITY` | Native basket-vintage quality/coverage fails |
| `UNAVAILABLE_LINK_NOT_APPROVED` | No approved link rule applies |
| `UNAVAILABLE_LINK_OVERLAP` | Link overlap is missing, insufficient or fails quality |
| `UNAVAILABLE_HISTORICAL_REFERENCE_NOT_APPROVED` | No evidence-approved historical reference exists |
| `UNAVAILABLE_HISTORICAL_REFERENCE_INPUT` | An approved reference lacks required linked values/quality |
| `UNAVAILABLE_MONTHLY_METHOD_NOT_APPROVED` | Monthly operator/completeness policy is unapproved |
| `UNAVAILABLE_MONTH_INCOMPLETE` | Month fails the approved nominal completeness rule |
| `UNAVAILABLE_DEFLATOR_NOT_APPROVED` | Exact official UK deflator/concept or policy is unapproved |
| `UNAVAILABLE_DEFLATOR_VINTAGE_MISSING` | Pinned release vintage lacks a required value or lineage field |
| `UNAVAILABLE_DEFLATOR_VALUE_INVALID` | Deflator is non-positive, wrong frequency/unit or fails validation |
| `UNAVAILABLE_EARNINGS_METHOD_NOT_APPROVED` | Optional earnings concept/method is unapproved |
| `UNAVAILABLE_EARNINGS_VINTAGE_MISSING` | Pinned earnings release vintage/value/lineage is absent |
| `UNAVAILABLE_EVENT_DATE_OR_REVISION` | Overlay placement lacks an approved event revision/date; numeric layers are unaffected |
| `UNAVAILABLE_REPLAY_MISMATCH` | Manifest replay differs from recorded output |

Precedence within a layer is authority/integrity, upstream availability, method approval, input completeness, then calculation validation. All applicable secondary reasons remain visible.

Forbidden substitutes include zero, last observation, nearest month, forward/backward fill, interpolation, model estimate, collection inception, another basket, another release vintage, an unapproved deflator/earnings proxy or event adjustment.

## 9. Versioning, correction and revision rules

Each layer has its own immutable series and revision IDs. A complete manifest includes all upstream hashes plus methodology, threshold, basket, link, historical-reference decision, monthly aggregation, official-statistics release vintage, arithmetic library and code versions as applicable.

Corrections are additive. A retail correction can create new native and downstream impact proposals; a new basket link, historical reference, monthly policy, deflator vintage or earnings vintage creates its own revision and impact report. No worker may approve any of them. Historical reproduction uses the originally effective versions.

Publication approval is independent of numeric quality and remains locked.

## 10. Acceptance tests required before approval

1. v0.1 and all existing diagnostic artefacts retain their original checksums after v1 implementation.
2. Fixed native basket-vintage manifests replay byte-for-byte, including missing dates and quality states.
3. Two eligible overlap vintages produce one deterministic stored link factor; reversing input order or database order does not change it.
4. Missing/unapproved overlap returns `UNAVAILABLE_LINK_NOT_APPROVED` or `UNAVAILABLE_LINK_OVERLAP` with `value = null` and does not splice series.
5. Changing a link input creates a new revision and preserves both native vintages and the prior linked revision.
6. Native basket-vintage scale and historical-reference presentation have distinct series/decision IDs and labels.
7. No historical reference activates without a checksum-bound evidence packet, sensitivity report and authorised-human approval.
8. Changing the approved historical reference changes only presentation values; linked nominal ratios, native values and link factors remain byte-identical.
9. Collection inception cannot be labelled normal/affordable or used as the product reference without the same evidence gate as any other period.
10. Monthly aggregation passes exactly at the approved completeness boundary and fails immediately below it as `UNAVAILABLE_MONTH_INCOMPLETE`.
11. Incomplete months, basket-boundary ambiguity and missing days are never interpolated or carried forward.
12. A fixed nominal-month manifest and fixed official-deflator release vintage reproduce real output byte-for-byte.
13. Missing series approval, series ID, release ID/date, observation status/value or capture checksum yields the applicable deflator unavailable state.
14. Values from two deflator release vintages cannot be mixed silently in one real-series revision.
15. A later official release produces a separate replayable real revision and deterministic impact report; the previous result remains unchanged.
16. Zero/negative, wrong-frequency or wrong-unit deflator input fails with `UNAVAILABLE_DEFLATOR_VALUE_INVALID`.
17. Optional earnings output stays unavailable until every concept and vintage gate passes, and enabling/disabling it leaves nominal and real checksums unchanged.
18. Event-overlay create, update, approval, date move, withdrawal and delete fixtures leave every numeric checksum unchanged.
19. Overlay payloads containing a price, weight, link/reference/deflator instruction, imputation or gap-fill field fail schema validation.
20. Every unavailable state displays a gap, reason and lineage in dashboard/API/export fixtures; none substitutes zero, last value or a modelled point.
21. All arithmetic uses exact decimal/rational operations and deterministic rounding; no binary floating point enters stored calculations.
22. Rights, methodology-change, production and publication locks override otherwise passing data.

## 11. Approval checklist

A future approval must separately name and bind:

- production region/source/basket authority;
- inherited and changed v0.1 rules;
- every threshold set (`PROPOSED_LOCKED` until then);
- basket-vintage link operator and overlap gates;
- historical reference period, evidence/sensitivity packet and allowed label;
- monthly aggregation/completeness policy;
- exact official UK deflator and release-vintage/revision policy;
- optional earnings measure/policy, if activated;
- unavailable-state/display contract;
- deterministic implementation/replay evidence; and
- private/public activation scope.

---

- **Approval status:** `DRAFT_NOT_APPROVED`
- **New thresholds and selections:** `PROPOSED_LOCKED`
- **Production activation:** `LOCKED`
- **External publication:** `LOCKED`
