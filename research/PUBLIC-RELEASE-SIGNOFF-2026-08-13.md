# What flipping the publication gate would publish

**Prepared:** 2026-08-13
**Status:** superseded historical review; not an approval or activation runbook.
The recovery audit proved that repository JSON is not an independently signed
decision and that this document's former activation recipe was unsafe.
**Decision it supports:** none. Publication activation is deliberately not
implemented and requires a separately designed, protected approval process.

Nothing in this document is currently public. The site ships with the gate shut
and CI sets `SF_PUBLIC_SERIES: withheld` as a second lever.

---

## 1. The exact surface that changes

| Route | Gate shut (today) | Gate open |
|---|---|---|
| `/` | Empty collection-start chart, category grid | Index headline, index chart, event line, three largest movers |
| `/price-history/` | Coverage counts, "built but not published" notice | Same, without the notice |
| `/price-history/ram/` | Empty collection-start chart | Index chart, quarter table, product list (71 links) |
| `/price-history/gpu,cpu,ssd/` | "No observations collected" | Unchanged — no dataset, no chart |
| `/price-history/ram/<part-number>/` | **Not generated.** One path exists (`/not-published/`) and resolves to the 404 document | 71 pages, one per part number |
| `/methodology/` | Full methodology, parameters verbatim | Unchanged |
| `/research/` | Sources surface, unexplained count | Unchanged |
| `/categories/<slug>/` | Scope description, link to price history | Unchanged |

Static page count: 20 shut, 90 open.

## 2. The numbers that become public

**Index, quarterly, 2024Q1 = 100, unweighted, unapproved.**

```
2023Q3  break (3 matched)     2025Q1   89.2
2023Q4  103.6                 2025Q2   85.7
2024Q1  100.0 (reference)     2025Q3   88.3
2024Q2  101.9                 2025Q4  203.6
2024Q3   95.5                 2026Q1  334.8
2024Q4   89.6                 2026Q2  335.2  (latest)
                              2026Q3  break (2 matched)
```

The headline reading is **3.4x the reference quarter**, and 3.9x the cheapest
quarter (2025Q2). This is a very large number and it is published with its
dispersion visible, not on its own:

| Quarter | Min | Median | Max |
|---|---|---|---|
| 2025Q4 | 1.0x | 2.6x | 4.2x |
| 2026Q1 | 1.0x | 1.4x | 3.4x |

2025Q4 is the quarter that carries most of the move, and the spread behind it is
wide. The chart draws that spread as a vertical range behind every point, and
the two breaks are drawn as breaks — the line is never joined across them.

**Per-product:** 71 products at the 6-month / 2-seller floor, 746 monthly
points, each expressed only as a ratio to that product's own first observed
month. Range of total movement: **-72.6% to +511.7%**, median +2.7%. A further
180 observed products fall below the floor and are not shown individually.

**Events:** 99 measured movements, **0** with a reviewed explanation, 99
unexplained. The rail ships visibly empty with that count stated.

## 3. The fields, exhaustively

- `index-ram.v1.json` (6,163 bytes) — `parameters_public`, `coverage`,
  `summary`, and per period: `period_id`, `state`, `index_milli`,
  `link_permille`, `change_permille`, `matched_product_count`,
  `dispersion_permille`, `distinct_products_in_period`, `is_reference`.
- `products-ram.v1.json` (129,109 bytes) — `floor`, `rebasing`, counts, and per
  product: `mpn`, `month_count`, `seller_count`, `multi_seller_month_count`,
  `first_month`, `last_month`, `change_permille`, and per point: `month`,
  `relative_permille`, `seller_count`, `single_seller`.
- `events-ram.v1.json` (392 bytes) — `markers` (empty), three movement counts,
  `pending_reason`.

## 4. What still does not publish, in either state

- **No amount in any currency.** Not a price, not a delta, not a range. The
  projection has no money field and the build fails if one appears.
- **No seller identity.** `seller_count` only.
- **No observation, tranche, movement or evidence identifier.**
- **No matching state** — no expected-versus-observed part number pair, no
  `match_basis`, no `identity_exact`, no collector reason code.
- **No approval reference.** `approval_id` / `review_id` are a banned key class
  and are never rendered.
- **No quoted article text**, and no marker exists to quote from yet.

Opening this gate does not unlock `external_publish`, `source_approval`,
`editorial_activation`, `methodology_change` or `production_activation`. Those
remain locked and are listed as such in the config.

## 5. What was verified, and how

- `npm run check` green: lint, 335 tests, static build, plus the boundary and
  site-content suites re-run against the built `out/`.
- **Both gate states built locally.** `public-boundary` and `site-content` pass
  in each. Shut: no index level appears in any rendered page in any format, no
  part number appears, and the empty-state text does. Open: the level appears and
  the empty-state text does not.
- `node scripts/build-public-site-data.mjs --check` exits 0 — the committed
  projection reproduces byte for byte.
- No two-decimal value exists in the projection or inside any rendered `<svg>`.
- Every rendered chart carries its parameters and the unapproved statement.
- Methodology strings appear in `out/methodology/` and in no other page.
- Rendered at 390px and 1440px: no page scrolls horizontally. Wide tables scroll
  inside their own container.
- The event hover card is hidden by default, revealed on hover **and** on
  keyboard focus, and its link carries `rel="nofollow noopener external"`.

## 6. Known limits of this verification

- **The event line has never been exercised with real markers**, because none
  exist. Its markup, attribution rules and hover behaviour are tested; its
  behaviour with a populated ledger is not, because populating the ledger is a
  separate editorial decision.
- **Mobile layout is no longer byte-pinned.** The previous tests pinned exact CSS
  declarations and did catch real regressions. The replacement asserts the rules
  exist, which is weaker. The 390px / 1440px check above is what actually covers
  it and must be repeated by hand before a release.
- The site has no favicon; the browser requests one and receives a 404. Cosmetic,
  pre-existing, unrelated to this work.

## 7. Activation withdrawn

There is no configuration-only activation path. `lib/publication-gate.ts`
returns withheld for every input, the public data bridge returns no private
candidate datasets, and the production deploy command exits non-zero. Restoring
publication would be a new governed project requiring independently
authenticated approval, exact dataset-byte binding, protected deployment and a
fresh review. This historical document must not be used to perform that work.
