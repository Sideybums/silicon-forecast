# Phase 1 Verification — Source and Methodology Gate

**Verification date:** 5 August 2026
**Phase result:** **PASS as a completed evidence gate; NO-GO for production and further implementation**
**Selected diligence region:** United Kingdom
**Approved production region:** none

> **Post-verification update — 2026-08-06:** David approved `research/source_use_policy_decision_2026-08-06.md`, replacing the blanket requirement for an affirmative retention/derivation grant with explicit-restriction review for factual public observations. This does not retrospectively alter the 5 August verification evidence, but its “complete rights chain” blocker is superseded. The current blockers are recorded in `.planning/STATE.md`: no Awin advertiser programme/feed access yet, no validated DDR5 feed samples, no approved source portfolio/experimental designation, and locked methodology thresholds.

## Verdict

Phase 1 has answered its governing question without pretending that an API is permission.

The project has a credible UK diligence route, a structured rights register and an executable draft methodology. It does **not** have an approved source portfolio. No candidate currently proves the complete rights chain required for automated collection, compliant evidence retention, permanent derived history, private commercial display and combination with independent sources.

Accordingly:

- Phase 1 research and decision artefacts are complete.
- The gate outcome is a documented **NO-GO** for production collection, private index operation and public/commercial display.
- Phase 2 must not begin as production implementation while SRC-02 remains blocked.
- A fixture-only methodology test may be planned separately, but it must use synthetic or lawfully retained test data and remain clearly non-production.
- Vendor contact, account/trial creation, contract acceptance and spend remain human-gated.

This is a useful stop, not a failed project. The machine has declined to turn uncertainty into confidence merely because confidence looks tidier on a roadmap.

## Deliverables verified

| Deliverable | Result |
|---|---|
| `PLAN.md` | Present; evidence model, scoring, acceptance tests and stop conditions defined. |
| `SOURCE-RIGHTS-TEMPLATE.md` | Present; seven independent rights dimensions, authority levels, expiry, review and approval controls defined. |
| `SOURCE-RIGHTS-REGISTER.md` | Present; 26 routes recorded across four regions with fail-closed statuses and explicit evidence references. |
| `REGION-ASSESSMENT.md` | Present; arithmetic reproduced, hard gates applied and UK selected for diligence only. |
| `METHODOLOGY-v0.1.md` | Present; deterministic draft covers scope, landed price, matching, coverage, outliers, basket, baseline, index, rounding, corrections, replay and locks. |
| Three dated research reports | Present for the US, UK/Germany and Japan. |
| `verify_phase1.py` | Present and executed successfully. |
| Project planning updates | `PROJECT.md`, `REQUIREMENTS.md` and `STATE.md` record the decision and blockers without claiming implementation. |

## Automated verification

Command executed from the repository root:

```text
python3 .planning/phases/01-source-methodology-gate/verify_phase1.py
```

Result after this report and the review-specific assertions were added:

```text
PASS: 130 checks
```

The verifier established, among other checks:

- exactly 26 rights-matrix routes: 8 US, 5 UK, 6 Germany and 7 Japan;
- all routes have the correct region and seven controlled rights statuses;
- no route clears the private collection/retention/derivation/display/combination gate;
- all matrix evidence references are individually enumerated and resolve in the register directory;
- region weights total 100%; exact totals recalculate to US 2.975, UK 3.000, Germany 3.265 and Japan 2.930;
- the UK is diligence-only, no production region is approved and production remains no-go;
- methodology thresholds T01–T20 are present in order;
- immutable baseline, acquisition-vendor concentration, experimental-state, correction-approval, replay and publication-lock controls are present;
- all configured consequential-action locks remain enabled;
- SRC-02 remains blocked and the project state claims no application implementation;
- required artefacts end with a final newline.

The verifier was then extended to catch two independent-review findings: the Rule 23 index-formula cross-reference and correct missing-value filtering in basket-price pseudocode.

## Independent review

Two independent repository-only audits were performed. No external mutation occurred.

The first review found no critical issues, six high issues and five medium issues. Remediation completed before this verification report:

1. Normalised compact evidence-record rules and explicitly enumerated evidence references.
2. Downgraded Bright Data permissions to contract-dependent/unknown where no executed route exists.
3. Made the approved baseline basket denominator immutable for a series.
4. Added common acquisition-vendor/failure-domain concentration alongside source concentration.
5. Required authorised-human approval for every value-changing correction, including provisional revisions.
6. Marked Amazon UK/Germany automated collection as restricted for this intended use.
7. Made experimental reduced-source output explicitly non-official and publication-locked.
8. Restricted coverage/concentration inputs to observations that actually contribute to official product prices.
9. Added `cross_source_combination_status` as a seventh controlled rights dimension.
10. Removed tracked trailing whitespace and corrected register table structure.

The focused re-audit confirmed H2–H6 and M1–M4 resolved. It then identified two methodology defects, both corrected:

- Rule 20 now points to the index formula in Rule 23, not the rounding rules in Rule 24.
- Basket-price pseudocode now filters missing products before applying the median rather than applying `nonmissing()` to scalar values.

The remaining review items were procedural: create this report, stage all intended files and run staged checks. Those actions are part of finalisation below.

## Requirements disposition

| Requirement | Phase 1 disposition |
|---|---|
| SRC-01 | Evidence template and 26-route register complete for diligence; no source is approved. |
| SRC-02 | **Blocked.** No approved three-source portfolio and no approved reduced-source experimental designation. |
| SRC-03 | Executable UK methodology draft complete; thresholds and production activation remain unapproved. |
| SRC-04 | Evidence, review, expiry, audit and human-approval controls defined; application enforcement remains future implementation. |

No later functional requirement is claimed complete.

## Citation and legal-confidence limits

- Research used current first-party pages and controlling terms where accessible, retrieved on 5 August 2026.
- Technical documentation and marketing establish capability, not permission.
- The compact Phase 1 register does not retain vendor-page snapshots in the repository.
- A source cannot advance beyond `diligence_only` until complete applicable evidence records, lawful snapshots/hashes where permitted, controlling agreements, source-specific answers and independent review exist.
- This work is sourcing diligence, not legal advice.

## Release criteria

| Criterion | Result |
|---|---|
| First region selected from evidence | Pass — UK for diligence only. |
| Collection/storage/derivation/display rights distinguished | Pass. |
| At least one credible lawful route or documented no-go | Pass — credible contract-diligence route, but documented production no-go. |
| Source count and independence requirement defined | Pass — three sources standard; two only under explicit experimental approval; common-vendor concentration capped. |
| Tax, delivery, basket, baseline, outlier and missing-data rules executable | Pass as unapproved methodology draft. |
| No unresolved permission treated as approval | Pass. |
| Production source portfolio approved | **Fail/blocker by design.** |
| Production/public locks remain on | Pass. |

## Final gate state

- **Phase 1 evidence work:** complete.
- **Production collection:** no-go.
- **Private production index:** no-go.
- **External publication:** locked.
- **Spend/contract/account activity:** locked pending explicit human approval.
- **Next evidence action:** non-binding PriceRunner UK contract and data-dictionary enquiry, only after David authorises external contact.

This verification report approves no source, methodology threshold, production activation, vendor contact, contract, spend or publication.
