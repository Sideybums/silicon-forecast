# DDR5 32GB catalogue expansion — additive human review packet

Status: candidate set ready for project-owner review
Prepared: 2026-08-08
Candidate fixture: `data/catalogue/ddr5-32gb-expansion.v1.json`
Evidence manifest: `research/evidence/catalogue-expansion-2026-08-08/manifest.json`

## Decision boundary

Approval of this packet would allow these eight exact-MPN records to join the existing four-product catalogue as reviewed fixture data.

It would **not**:

- activate production ingestion;
- approve any retailer, marketplace or resale source;
- approve an index basket, baseline or methodology;
- enable automatic listing confirmation;
- publish prices or change any existing reviewed record.

## Candidate products

| # | Manufacturer | Product | Exact MPN | Speed | First-party evidence |
|---:|---|---|---|---:|---|
| 1 | Kingston | FURY Beast DDR5-6000 CL36 | `KF560C36BBEK2-32` | 6000 MT/s | Exact Kingston PDF datasheet |
| 2 | Crucial | Classic DDR5-5600 CL46 | `CT2K16G56C46U5` | 5600 MT/s | Exact Crucial product response |
| 3 | Crucial | Pro DDR5-5600 CL46 | `CP2K16G56C46U5` | 5600 MT/s | Exact Crucial product response |
| 4 | Crucial | Pro OC DDR5-6000 CL36 Black | `CP2K16G60C36U5B` | 6000 MT/s | Exact Crucial product response |
| 5 | Crucial | Pro OC DDR5-6400 CL38 Black | `CP2K16G64C38U5B` | 6400 MT/s | Exact Crucial product response |
| 6 | TEAMGROUP | T-FORCE DELTA RGB DDR5-6000 CL30 Black | `FF3D532G6000HC30DC01` | 6000 MT/s | Exact first-party product-table row |
| 7 | TEAMGROUP | T-FORCE DELTA RGB ROG Certified DDR5-6000 CL30 | `FFRD532G6000HC30DC01` | 6000 MT/s | Exact first-party product-table row |
| 8 | TEAMGROUP | T-CREATE EXPERT DDR5-6400 CL32 Black | `CTCED532G6400HC32ADC01` | 6400 MT/s | Exact first-party product-table row |

All eight records are constrained to:

- DDR5;
- 32GB total capacity;
- two 16GB modules;
- desktop UDIMM classification;
- unregistered, unbuffered, non-system-ECC treatment;
- exact manufacturer MPN identity;
- draft status until this additive review is explicitly accepted.

## Evidence and classification caveats

### Kingston

The datasheet explicitly establishes the exact MPN, two-module 32GB kit, DDR5-6000 and 288-pin DIMM construction. It says `On-Die ECC`, which is the device-level DDR5 feature rather than system-level ECC memory. The ordinary consumer UDIMM/non-system-ECC classification remains an explicit human-review judgement, as with the existing Kingston seed products.

### Crucial

The captured first-party product responses explicitly distinguish `UDIMM` from `EUDIMM`, describe the DIMM type as `Unbuffered`, and establish exact MPN, capacity, module count and speed. The source-response byte count and SHA-256 were retained; authored page content was not retained. Crucial may intermittently reject automated re-fetches, so replay relies on the minimal factual extract plus pinned source-response metadata.

### TEAMGROUP

The exact first-party product-table rows establish MPN, 32GB (2×16GB) and speed. Product URLs and first-party asset paths classify the products under `memory/u-dimm/ddr5`, while the tables call them desktop memory. `On-die ECC` is treated as the DDR5 device feature, not system ECC. U-DIMM/unbuffered/non-system-ECC treatment is therefore a derived classification requiring explicit human acceptance.

TEAMGROUP uses `MHz` on two product rows and `MT/s` on one. The candidate normalises the advertised DDR5 data rate to MT/s; this normalisation also requires human acceptance.

## Basket-shape warning

This is a catalogue-coverage expansion, not an approved representative index basket.

Combined with the existing four products, the 12 candidates would contain:

- Crucial: 4/12;
- Kingston: 3/12;
- TEAMGROUP: 3/12;
- G.SKILL: 2/12;
- DDR5-6000 products: 7/12.

The set deliberately improves exact-MPN breadth, but related Crucial and TEAMGROUP variants could overweight those families if the same set were later adopted as the canonical index basket. Basket selection remains a separate methodology decision.

## Verification completed

- Eight distinct candidate MPNs; no duplicate manufacturer-scoped MPNs across the existing seed and expansion.
- Eight checksum-pinned minimal factual extracts.
- Bidirectional catalogue → evidence → manifest references.
- Original four-product candidate/review files remain unchanged.
- Independent evidence audit found no critical or high-severity blockers for human fixture review.
- Automated catalogue test suite passed after adding expansion checks.

## Review choices

1. **Approve all eight for additive fixture use** — accepts the stated classification caveats while preserving every production and methodology lock.
2. **Approve selected MPNs only** — list the accepted MPNs; rejected candidates remain draft research artifacts.
3. **Hold the set** — gather stronger module-classification evidence and/or diversify manufacturers before approval.
