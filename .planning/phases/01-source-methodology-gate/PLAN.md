# Phase 1 Plan — Source and Methodology Gate

## Objective

Determine whether one candidate region can support a lawful, reproducible private 32GB DDR5 desktop-kit price index. Research may identify promising routes, but it must not treat silence, robots.txt allowance, public visibility, affiliate availability or technical accessibility as permission.

## Requirements

- SRC-01: source-rights register covering collection, storage, derivation, display and commercial use.
- SRC-02: at least three approved stable sources, or an explicitly approved reduced-source experimental designation.
- SRC-03: regional methodology defining tax, delivery, currency, cut-off, eligibility, coverage, outliers, baseline and missing data.
- SRC-04: versioned and audited source/methodology changes with production approval locks.

## Workstreams

### 1. Evidence framework

Create a register in which every permission dimension is one of:

- `verified_permitted`: an authoritative source explicitly permits the intended use.
- `verified_restricted`: an authoritative source explicitly prohibits or materially restricts it.
- `contract_required`: permission may be available only through an agreement, account, affiliate programme or paid licence.
- `unknown`: no adequate authoritative evidence has been found.
- `not_applicable`: the dimension does not apply to the proposed access path.

Each claim must retain URL, publisher, document title, retrieval date, quoted or closely paraphrased evidence, authority level and caveat. Marketing pages establish availability, not legal permission. Search snippets are discovery aids, not evidence.

### 2. Candidate source research

Research the US, UK, Germany and Japan. Prefer first-party API/feed documentation, publisher terms, affiliate-network documentation, developer policies and retailer legal pages. Record:

- Access method and whether credentials or a contract are required.
- Automated collection permission.
- Raw payload/observation storage permission.
- Derived-statistic permission.
- Price/display permission and attribution rules.
- Commercial-use and redistribution restrictions.
- MPN/GTIN and structured field quality.
- VAT/sales-tax, delivery, currency, stock and timestamp semantics.
- Geographic coverage, source independence and operational fragility.

Do not create accounts, accept contracts, pay, scrape live retailer listings or persist third-party payloads.

### 3. Region decision

Score each region from 0–5 on:

1. Permission confidence — 30%.
2. Credible source breadth — 20%.
3. Identifier/data quality — 15%.
4. Tax and delivered-price comparability — 15%.
5. Access stability and supportability — 10%.
6. Market relevance to the initial product — 10%.

A weighted score is directional only. The selected region must also pass all hard gates:

- At least one credible authorised access route is evidenced.
- A plausible route to three sufficiently independent sources exists, or the result is explicitly labelled experimental and requires human approval.
- Tax, delivery and currency treatment can be expressed without inventing unknowns.
- No verified restriction conflicts with the proposed MVP use.

If these gates are not met, the decision is `conditional` or `no-go`; a high numerical score cannot override missing rights.

### 4. Methodology v0.1

Write deterministic rules for scope, collection cut-off, product eligibility, stock, regional total price, tax, delivery, currency, retailer-level daily observation, product-level daily price, basket, coverage, outliers, missing data, baseline, revisions and quality states. Every unknown that affects comparability must fail closed.

### 5. Verification

Verify that:

- Every source has a stable ID and evidence status for all required permission dimensions.
- Every non-unknown legal claim cites an authoritative URL.
- Candidate-region scores can be recalculated from recorded values and weights.
- The recommendation distinguishes feasibility from approval.
- Methodology rules are testable and contain no silent imputation.
- SRC-01 through SRC-04 have explicit evidence or remain visibly blocked.
- No production source is described as approved without human authorisation.

## Outputs

- `SOURCE-RIGHTS-TEMPLATE.md`
- `SOURCE-RIGHTS-REGISTER.md`
- `REGION-ASSESSMENT.md`
- `METHODOLOGY-v0.1.md`
- `VERIFICATION.md`
- Updated `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md` and `.planning/STATE.md`

## Authority Boundary

Phase 1 may recommend a source, region and methodology. It may not grant legal approval, accept third-party terms, create paid relationships, build production scrapers, weaken locks or designate a public methodology. Those remain explicit human decisions.
