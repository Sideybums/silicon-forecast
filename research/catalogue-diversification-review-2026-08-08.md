# DDR5 32GB manufacturer diversification — additive human review packet

Status: reconciled by additive selected-product review
Prepared: 2026-08-08
Decision recorded: 2026-08-09
Decision artefact: `data/reviews/ddr5-32gb-diversification-review-2026-08-09.json`
Candidate fixture: `data/catalogue/ddr5-32gb-diversification.v1.json`
Evidence manifest: `research/evidence/catalogue-diversification-2026-08-08/manifest.json`

## Decision boundary

This tranche adds four exact-MPN research candidates across three manufacturers that were absent from the 12-product control-plane pilot. Approval would permit only selected records to become reviewed fixture data through a future additive review transition.

It would **not**:

- activate production ingestion;
- approve a retailer, source, basket, baseline or methodology;
- make any candidate baseline-eligible or reserve-ready;
- enable automatic matching or basket mutation;
- publish prices;
- approve Lexar evidence that could not be retained without questionable user-agent treatment.

## Candidate products

| # | Manufacturer | Product | Exact MPN | Speed | First-party evidence |
|---:|---|---|---|---:|---|
| 1 | Corsair | VENGEANCE DDR5-6000 CL36 Black | `CMK32GX5M2B6000C36` | 6000 MT/s | Exact Corsair server-rendered product data |
| 2 | ADATA | DDR5-4800 U-DIMM Dual Tray | `AD5U480016G-DT` | 4800 MT/s | Exact ADATA PDF ordering-table row |
| 3 | ADATA | DDR5-5600 U-DIMM Dual Tray | `AD5U560016G-DT` | 5600 MT/s | Exact ADATA PDF ordering-table row |
| 4 | Patriot / Viper | Viper Venom AMD DDR5-6000 CL30 | `VV532G60C30AK` | 6000 MT/s | Exact Patriot catalogue row and linked SKU sheet |

All four remain `draft` in a `candidate_pending_human_review` fixture. The existing four reviewed products and eight pending expansion candidates were not rewritten.

## Evidence and classification caveats

### Corsair

The first-party page establishes the exact MPN, 32GB as two 16GB modules, DDR5-6000, UDIMM and 288-pin construction. It does not explicitly say `Non-ECC`, `unregistered` or `unbuffered`. Those classifications follow from the ordinary UDIMM product class and require explicit human acceptance.

The same stable URL returned HTTP 200 with ordinary `curl` during independent verification, but a Safari-style user agent returned HTTP 403. The retained extract records the exact successful response byte count and SHA-256; source replay should therefore be treated as potentially intermittent rather than guaranteed.

### ADATA

Each first-party datasheet establishes DDR5 generation, speed, 288-pin U-DIMM construction and an exact 16GB `Dual Tray` MPN. The source does **not** literally spell out `2 × 16GB`; the candidate derives that module configuration from ADATA's `Dual Tray` package designation. This is the weakest classification in the tranche and should be approved only if David accepts that interpretation or stronger first-party evidence is found.

The datasheets state on-die error correction. This is treated as the DDR5 device-level feature rather than system-visible ECC. U-DIMM supports the unregistered/unbuffered classification, but both points remain review judgements.

The `-DT` products may represent trade or tray packaging rather than a normal consumer retail kit. UK retail availability and suitability for an eventual headline basket remain unproven.

### Patriot / Viper

The first-party catalogue and officially linked SKU sheet establish the exact MPN, 32GB as two 16GB modules, DDR5-6000 and `UDIMM KIT`; the SKU sheet identifies a retail box. It states on-die ECC rather than system-visible ECC. Treating UDIMM as unregistered/unbuffered non-system-ECC remains an explicit review judgement.

### Lexar

Lexar remains a required research gap. The official page was reported as retrievable only when presenting a Googlebot user agent, while ordinary requests intermittently returned Cloudflare 403. That is not a sufficiently boring provenance route, so no Lexar candidate was retained. The machine appears to have developed opinions; we have declined to negotiate with it.

## Coverage effect

The deterministic fixture-only coverage report now records:

- 16 monitored products;
- 6 reviewed fixture products;
- 10 candidates pending review;
- 7 represented manufacturer groups;
- Lexar as the sole named missing required-research manufacturer;
- 0 baseline-eligible products;
- 0 reserve candidates;
- 0 basket memberships.

This improves manufacturer discovery coverage, not basket representativeness. DDR5-6000 still accounts for 9 of 16 monitored products, and related products remain concentrated within several families.

## Verification completed

- Four distinct exact MPNs with no manufacturer-scoped identity collision across all 16 monitored products.
- Four minimal factual extracts with exact source-response byte counts and SHA-256 values.
- Bidirectional catalogue → evidence → manifest references.
- ADATA's `Dual Tray` interpretation is retained as a machine-checked caveat.
- Coverage reporting remains deterministic outside the repository working directory.
- Reviewed-versus-candidate reporting status is bound to both the exact content SHA-256 of each catalogue tranche and the exact SHA-256-pinned seed approval artefact; pending tranches cannot self-promote by changing a membership label, and reviewed catalogue facts cannot drift under a stable fixture ID.
- Cross-tranche manufacturer-scoped MPNs, identifiers, manufacturer names and aliases are runtime-validated rather than test-only.
- Catalogue specification facts, publishers, extraction timestamps and source URLs are bound end-to-end to raw extract bytes whose length and SHA-256 must match the evidence manifest.
- Production activation, methodology change, source approval, external publication, automatic pool promotion and basket mutation remain locked.

## Reconciled decision

David approved the recommended conservative selection on 2026-08-09:

- **Approved for additive fixture use:** Corsair `CMK32GX5M2B6000C36` and Patriot `VV532G60C30AK`.
- **Held as research-only candidates:** ADATA `AD5U480016G-DT` and `AD5U560016G-DT`, pending stronger first-party evidence that literally establishes the complete 32GB (2×16GB) kit configuration.
- **Documented abstention:** Lexar remains unapproved and unrejected until normal-access, exact-MPN first-party evidence can be retained without crawler impersonation or access-control bypass.

This decision does not grant source approval, production activation, baseline/reserve eligibility, basket membership, automatic matching, methodology approval or publication authority.

The exact selected/held product keys, catalogue-content checksum, evidence-manifest checksum, accepted caveats and limitations are recorded in `data/reviews/ddr5-32gb-diversification-review-2026-08-09.json`.
