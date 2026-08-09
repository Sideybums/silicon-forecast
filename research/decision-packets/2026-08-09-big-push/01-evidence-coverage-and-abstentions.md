# Evidence coverage and abstentions

State: **EVIDENCE REVIEW ONLY — NO SOURCE OR PUBLICATION APPROVAL**

## Retained evidence

- Two immutable private candidate tranches.
- Seven exact-MPN item-price observations.
- Three seller-legal-entity + exact-MPN lines.
- Four archive capture points and three 2026-08-09 retrieval points.
- Every observation remains source-unapproved, production-ineligible, index-ineligible and publication-locked.
- Retained extract file hashes were independently recomputed for all seven observations.

## Coverage

- `F5-6000J3636F16GX2-FX5`: two archive captures in January 2026 plus one August 2026 retrieval.
- `KF560C30BBEK2-32`: one archive capture in March 2026 plus one August 2026 retrieval.
- `KF564C32RSK2-32`: one archive capture in August 2022 plus one August 2026 retrieval.

Archive timestamps are capture times, not retailer change times. No value is inferred between observations.

## Abstentions and gaps

- Fixed-destination delivery is unresolved for every retained line.
- Kingston availability semantics remain ambiguous.
- No historical category breadth, retailer breadth or continuous exact-MPN history exists.
- Wave 1 historical retry found no new evidence: two bounded CDX requests timed out and one exact-URL request returned an empty result.
- The recurring collector is enabled but had never run as of 2026-08-09T18:59:31Z. It remains the sole prospective fetcher.
- Collector collision, namespace and run-lineage gaps remain integration blockers for any future output; the readiness audit in `research/waves/wave1/prospective-retail-readiness-audit-2026-08-09.md` is the integration checklist.

## Decision boundary

This packet does not establish source approval, landed-price eligibility, a basket, a normal period, an index, or public-display authority.
