# DDR5 32GB Seed Catalogue Review Note

## Status

Human catalogue and label review was approved by David Sidebottom on 2026-08-06 at 09:21:11 UTC for fixture use only. The additive decision record is `data/reviews/ddr5-32gb-seed-review-2026-08-06.json`; the original candidate catalogue and labels remain unchanged as historical inputs.

This approval does not approve a production product, source, region, feed, automatic match, methodology, baseline, index run or publication.

## Scope

The seed is deliberately narrow:

- DDR5 desktop U-DIMM kits only;
- 32GB total capacity as two 16GB modules;
- non-system-ECC, unregistered and unbuffered;
- exact manufacturer part numbers first;
- no invented GTINs;
- no live prices, stock or retailer content.

Machine-readable catalogue: `data/catalogue/ddr5-32gb-seed.v1.json`

Labelled fixture set: `data/fixtures/listing-matches.v1.json`

Evidence manifest: `research/evidence/catalogue-2026-08-06/manifest.json`

## Candidate products

| Manufacturer | Product | MPN | Speed | Evidence state |
|---|---|---|---:|---|
| Kingston Technology | Kingston FURY Beast DDR5 6000 CL30 | `KF560C30BBEK2-32` | 6000 MT/s | Minimal factual extract from exact first-party PDF |
| Kingston Technology | Kingston FURY Renegade DDR5 6400 CL32 | `KF564C32RSK2-32` | 6400 MT/s | Minimal factual extract; apparent source prose typo noted |
| G.SKILL | Flare X5 DDR5-6000 CL36 | `F5-6000J3636F16GX2-FX5` | 6000 MT/s | Minimal factual extract from exact first-party pages |
| G.SKILL | Trident Z5 Neo RGB DDR5-6000 CL36 | `F5-6000J3636F16GX2-TZ5NR` | 6000 MT/s | Minimal factual extract from exact first-party pages |

## Evidence decisions

The initial research proposed three other G.SKILL MPNs. Retrieval showed that two supplied URLs resolved to different or combined variants, so those candidates were rejected. Corsair returned HTTP 403 to bounded retrieval and Crucial returned non-product stubs, so neither brand was added on unverified assumptions.

Full manufacturer pages and PDFs were used transiently for extraction and then removed. The retained evidence contains only selected factual fields, source URLs, source-response byte counts and source-response SHA-256 checksums. Authored descriptions, navigation, imagery and advertising creative are not retained.

The Kingston PDFs explicitly establish exact MPN, total capacity, module organisation, DDR5 speed and 288-pin DIMM construction. They describe DDR5 on-die ECC, which must not be misclassified as system ECC. The consumer FURY product class supports ordinary unbuffered desktop U-DIMM use, but this interpretation should receive human review before the records become `reviewed`.

The G.SKILL specification pages explicitly establish exact MPN, 32GB (16GBx2), tested speed, desktop U-DIMM category, unbuffered construction and Non-ECC.

## Normalisation

`mpn-v1-uppercase-trim` performs only Unicode NFKC normalisation, surrounding-whitespace removal and uppercasing. It deliberately preserves punctuation. Removing hyphens can collapse distinct manufacturer identifiers and is therefore forbidden without a separately reviewed manufacturer-specific rule.

## Label semantics

The fixture separates product identity from index qualification. A refurbished listing can identify a canonical product correctly while remaining ineligible for the index.

Expected decisions are:

- `match`: exact identity established;
- `no_match`: an exact supplied identity is absent from this candidate catalogue fixture;
- `abstain_ambiguous`: evidence conflicts or several products remain plausible;
- `abstain_insufficient`: there is not enough reliable identity evidence;
- `unsupported`: the listing is outside the 32GB DDR5 desktop-kit scope.

The auto-confirmation gate remains locked for every example. This small fixture is a deterministic regression and safety set; it cannot establish the project’s eventual 99.5% production precision requirement.

## Human review record

Completed by David Sidebottom on 2026-08-06 at 09:21:11 UTC:

- [x] Retained first-party evidence and exact MPNs reviewed.
- [x] 32GB total capacity, two 16GB modules, DDR5, desktop U-DIMM, speed, non-system-ECC, unregistered and unbuffered status accepted.
- [x] Kingston on-die-ECC interpretation and the Renegade datasheet's apparent per-module prose typo accepted as documented.
- [x] All positive, negative, abstention and unsupported labels reviewed.
- [x] Decision recorded additively in `data/reviews/ddr5-32gb-seed-review-2026-08-06.json`.

The auto-confirmation gate remains locked. Fixture approval is not production approval.
