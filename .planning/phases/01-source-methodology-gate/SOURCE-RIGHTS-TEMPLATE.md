# Source Rights Evidence Template

**Purpose:** stable, auditable due-diligence records for candidate price-data sources under SRC-01 and SRC-04.
**Scope:** technical access, collection, retention, derivation and display rights are assessed separately. Technical availability, a paid account, a public endpoint, marketing copy or `robots.txt` allowance is not permission.
**Boundary:** this register supports sourcing and contract review; it is not legal advice and cannot approve a production source.

## 1. Controlled vocabulary

Every rights dimension MUST contain exactly one of these machine-stable values:

| Status | Meaning |
|---|---|
| `verified_permitted` | An authoritative document governing the proposed route explicitly permits this exact use, within recorded conditions. |
| `verified_restricted` | An authoritative governing document explicitly prohibits or materially conflicts with this exact use. |
| `contract_required` | A credible route exists, but the right depends on an unexecuted, account-gated, programme-specific, paid or bespoke agreement. This is not permission. |
| `unknown` | No adequate authoritative evidence resolves the dimension, or the controlling text is inaccessible or silent. This is not permission. |
| `not_applicable` | The dimension genuinely does not apply to the proposed route; the rationale is mandatory. It MUST NOT be used to avoid an unresolved question. |

Do not use hybrids such as `U-CR`, “conditionally permitted” or “likely”. Record the single current status, then preserve conditions and possible status transitions in `rights_notes` and `unresolved_vendor_questions`.

## 2. Stable record fields

Field names and source IDs are append-only interfaces. Rename or reuse neither without an approved migration.

### Identity and technical route

| Field | Required | Definition |
|---|---:|---|
| `source_id` | yes | Immutable register ID in the form `<SERIES>-<number>`; established series prefixes are `US`, `UK`, `DE` and `JP`, while `region` stores the actual project region code (`US`, `GB`, `DE`, `JP`). Never recycle a retired ID. |
| `source_name` | yes | Supplier/source and product or route name. |
| `region` | yes | ISO-like project region: `US`, `GB`, `DE` or `JP`. |
| `source_class` | yes | Retailer API, marketplace API, affiliate feed, comparison provider, extraction vendor, distributor feed, POS panel or enterprise intelligence. |
| `technical_access_method` | yes | API/feed/export/SFTP/manual licensed download, authentication, onboarding and payment/contract prerequisites. Describes capability only. |
| `technical_access_state` | yes | `documented`, `account_gated`, `sales_enquiry`, `inaccessible_terms`, `deprecated` or `not_verified`; this is not a rights status. |
| `credentials_or_contract_required` | yes | What account, programme approval, credential, payment, order form or bespoke agreement is technically required. |
| `independence_caveat` | yes | Retailer, marketplace, merchant, extraction-vendor and upstream-panel correlation or scope limitation. |

### Rights dimensions

All seven fields are required and use only the controlled vocabulary above.

| Field | Exact question answered |
|---|---|
| `automated_collection_status` | May the proposed scheduled/API/feed collection be performed for index construction? |
| `raw_evidence_storage_status` | May raw observations, payloads or policy-compliant evidence records be retained for the required audit period, including after termination where needed? |
| `derived_history_status` | May non-reconstructable statistics/indices be calculated and permanently retained, including post-termination survival? |
| `private_display_status` | May the operator show source/derived data in its internal private commercial product? |
| `public_commercial_display_status` | May non-reconstructable derived results be shown publicly or to paying customers? This is separate from affiliate offer display. |
| `raw_redistribution_status` | May raw/source-level rows or payloads be provided to customers, processors or auditors? Record permitted limited auditor/processor access in notes. |
| `cross_source_combination_status` | May observations and derived statistics be combined with competing or independent sources for index construction? |
| `rights_notes` | Conditions, attribution, cache limits, termination duties, territory, programme purpose, upstream warranty and the exact reason for each non-obvious status. |

### Data quality and semantics

| Field | Required content |
|---|---|
| `identifier_quality` | MPN, GTIN/UPC/EAN/JAN, platform SKU and seller identifier availability; provenance, completeness and validation caveats; pack/kit/condition risks. |
| `tax_delivery_caveat` | Tax/VAT/consumption-tax basis, currency, delivery/postage, discounts/points, stock/orderability, destination and observation-time caveats. Never silently equate advertised and landed price. |
| `operational_caveat` | Rate limits, SLA, refresh, deprecation, panel/source churn, corrections and schema-change risks. |

### Evidence and accountability

| Field | Required content |
|---|---|
| `evidence_refs` | Stable evidence IDs linking to evidence records below. Every non-`unknown` legal claim needs authoritative support. |
| `retrieval_date` | ISO date on which each cited source was retrieved; record per evidence item if dates differ. |
| `unresolved_vendor_questions` | Concrete written questions that would resolve statuses, semantics, warranty, survival, attribution or access. |
| `phase_1_eligibility` | One of `blocked`, `diligence_only` or `candidate_pending_human_approval`; never `approved`. |
| `eligibility_reason` | Fail-closed reason and exact evidence/contract changes needed to become a candidate for human approval. |
| `production_approval` | Always `not_approved` until an authorised human records an explicit Tier-4 decision. Research cannot change it. |
| `record_owner` | Named accountable owner or role. |
| `record_version` | Monotonic integer beginning at `1`. |
| `created_at` / `last_reviewed_at` | ISO dates. |
| `next_review_due` | ISO date set under section 5. |
| `evidence_expiry_at` | Earliest known contract/document expiry, or review-derived expiry; never blank. |
| `change_request_id` | Audit/approval reference for the current material version, or `initial-draft` for Phase 1 research. |

## 3. Evidence record fields

Evidence IDs are globally stable document IDs such as `US:A1`, `EU:E3a` or `JP:J16`. A document may apply to several routes; the source row's explicit `evidence_refs` list records applicability. Do not use range notation. Before a source can advance beyond `diligence_only`, each applicable evidence item must contain:

```yaml
evidence_id: "<corpus>:<document-id>"
authority_level: "L1|L2|L3|L4|L5"
publisher: "legal entity or first-party publisher"
document_title: "exact title"
document_version_or_date: "shown date, version, or not stated"
url: "stable first-party URL"
retrieved_at: "YYYY-MM-DD"
governs_proposed_route: "yes|no|uncertain"
operative_evidence: "short exact quotation or close paraphrase labelled as such"
evidence_caveat: "territory, account, translation, inaccessible text, marketing-only, etc."
content_hash_or_snapshot_ref: "hash/path when lawful to preserve; otherwise not retained"
```

During the initial research screen, the register may use a compact evidence directory when it declares shared retrieval dates, applicability links, quotation/paraphrase handling and snapshot-retention defaults. Compact records are sufficient only for `blocked` or `diligence_only`; full records above are mandatory before `candidate_pending_human_approval`.

Search snippets, third-party summaries and inaccessible page titles may discover a lead but MUST NOT support `verified_permitted` or `verified_restricted`.

## 4. Evidence authority hierarchy

Use the highest available applicable authority; applicability outranks general prestige.

1. **L1 — executed controlling instrument:** signed licence/order form/data schedule plus incorporated programme/API terms governing this customer, route, territory and use. Conflicts are escalated; bespoke amendments prevail only where the instrument says so.
2. **L2 — current first-party operative terms/policy:** publisher terms, developer licence, programme policy or statutory/regulatory text that clearly governs the proposed route. Account-gated terms must be obtained before reliance.
3. **L3 — current first-party technical documentation/data dictionary:** establishes capability, schema and semantics, not downstream permission unless it contains an operative grant.
4. **L4 — first-party sales/marketing or enquiry page:** establishes that a route may exist; normally supports `contract_required`, never permission by itself.
5. **L5 — discovery-only material:** search results, archived snippets, third-party commentary, unofficial wrappers or inaccessible URLs. It cannot resolve a rights status.

Where L1/L2 is silent, do not promote L3/L4 capability claims into permission. Where documents conflict, use the more specific controlling instrument only after its scope and incorporation are verified; otherwise mark the affected dimension `unknown` and block eligibility.

## 5. Review, expiry and suspension mechanics

- **Routine cadence:** review active diligence records at least every 90 days; records relying on revocable affiliate/API terms at least every 30 days; executed contracts at least 60 days before renewal/expiry.
- **Evidence expiry:** absent a stated earlier expiry, L2/L3 web evidence expires 90 days after retrieval and L4 evidence after 30 days. L1 expires at the earliest of contract expiry/termination, an incorporated-term change, territorial/product-scope change or the next annual legal review.
- **Event-triggered review:** immediate review is required for terms/version/schema changes, vendor/source-panel changes, termination notices, ownership changes, enforcement/takedown contact, a changed use case, new public/commercial display, new processor/auditor access, or evidence that semantics/rights were misstated.
- **Stale handling:** when `next_review_due` or `evidence_expiry_at` passes, eligibility automatically becomes `blocked`; previous statuses remain in history but cannot authorise operation.
- **Suspension:** any credible conflict, inaccessible controlling agreement, lost programme approval or material uncertainty suspends collection/use for affected dimensions pending review. Preserve only evidence whose retention is itself permitted.
- **History:** never overwrite material conclusions. Append a dated change entry with old/new values, evidence, author, reviewer, reason and approval reference.

## 6. Change approval

| Change | Minimum approval |
|---|---|
| Typographical correction or added L3/L4 discovery evidence with no status/eligibility effect | Research owner; audited change entry. |
| Any rights status, evidence authority, expiry, route, territory, intended use, semantics or eligibility change | Source-rights owner plus independent reviewer; legal/counsel review where a legal conclusion or contract interpretation changes. |
| Change to `candidate_pending_human_approval`, production source designation, public/commercial use, new contract acceptance, spend or collection start | Explicit authorised human Tier-4 approval under `docs/AUTONOMY.md`; signed controlling terms where applicable. |
| Weakened fail-closed rule, retrospective approval or removal of an adverse evidence item | Prohibited without documented human governance decision and independent review; adverse evidence remains in history. |

Agents may research, draft and recommend. They may not accept terms, sign contracts, create paid relationships, grant permission or mark a production source approved.

## 7. Fail-closed Phase 1 eligibility

`phase_1_eligibility` is computed separately from technical suitability and regional scoring.

- `blocked`: default. Required rights are `unknown`, `verified_restricted`, stale, conflicting or unsupported; semantics prevent a reproducible regional price; or controlling evidence is missing.
- `diligence_only`: a credible technical/commercial route exists and written diligence may proceed, but collection/use is not authorised.
- `candidate_pending_human_approval`: authoritative applicable evidence resolves every right required by the declared Phase 1 mode, no verified restriction conflicts, data semantics and source independence are acceptable, evidence is current, and only the explicit human production decision remains. This is still not approval.

For the private Phase 1 index, `automated_collection_status`, `raw_evidence_storage_status`, `derived_history_status`, `private_display_status` and `cross_source_combination_status` must each be `verified_permitted`; public/commercial display may be `not_applicable` only while the public lock remains on and the rationale is recorded. Raw redistribution may be `verified_restricted` if Phase 1 requires none, but permitted processor/auditor handling and evidence access must still be contractually workable. Any required field that is `contract_required` or `unknown`, or any conflicting `verified_restricted`, fails closed.

No numerical quality score, technical API access, account payment, vendor assurance, public availability or affiliate approval can override this gate. `production_approval` remains `not_approved` until a separate recorded human decision.

## 8. Compact source record example

```yaml
source_id: "GB-1"
source_name: "Example negotiated feed"
region: "GB"
source_class: "comparison provider"
technical_access_method: "contracted API; credentials and paid order form"
technical_access_state: "sales_enquiry"
credentials_or_contract_required: "executed data schedule and API key"
independence_caveat: "many merchants, one provider matching/collection layer"
automated_collection_status: "contract_required"
raw_evidence_storage_status: "contract_required"
derived_history_status: "contract_required"
private_display_status: "contract_required"
public_commercial_display_status: "contract_required"
raw_redistribution_status: "contract_required"
cross_source_combination_status: "unknown"
rights_notes: "Marketing establishes capability only; customer licence unavailable."
identifier_quality: "MPN/GTIN population and provenance not guaranteed."
tax_delivery_caveat: "VAT and destination delivery unresolved."
operational_caveat: "SLA, corrections and source churn unresolved."
evidence_refs: ["EU:E-example"]
retrieval_date: "2026-08-05"
unresolved_vendor_questions: ["Obtain the controlling data schedule and resolve all seven dimensions."]
phase_1_eligibility: "diligence_only"
eligibility_reason: "Every required right remains contract_required."
production_approval: "not_approved"
record_owner: "source-rights owner"
record_version: 1
created_at: "2026-08-05"
last_reviewed_at: "2026-08-05"
next_review_due: "2026-09-04"
evidence_expiry_at: "2026-09-04"
change_request_id: "initial-draft"
```
