#!/usr/bin/env python3
"""Deterministic structural verification for Silicon Forecast Phase 1 evidence artefacts."""

from __future__ import annotations

import json
import re
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PHASE = ROOT / ".planning/phases/01-source-methodology-gate"

checks: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)
    checks.append(message)


required = [
    PHASE / "PLAN.md",
    PHASE / "SOURCE-RIGHTS-TEMPLATE.md",
    PHASE / "SOURCE-RIGHTS-REGISTER.md",
    PHASE / "REGION-ASSESSMENT.md",
    PHASE / "METHODOLOGY-v0.1.md",
    PHASE / "VERIFICATION.md",
    ROOT / "research/us_ddr5_structured_price_data_rights_2026-08-05.md",
    ROOT / "research/uk_de_structured_price_data_options_2026-08-05.md",
    ROOT / "research/japan_ddr5_structured_price_data_rights_2026-08-05.md",
]
require(all(path.is_file() for path in required), "all nine Phase 1 deliverables exist")

register = (PHASE / "SOURCE-RIGHTS-REGISTER.md").read_text()
template = (PHASE / "SOURCE-RIGHTS-TEMPLATE.md").read_text()
assessment = (PHASE / "REGION-ASSESSMENT.md").read_text()
method = (PHASE / "METHODOLOGY-v0.1.md").read_text()
verification = (PHASE / "VERIFICATION.md").read_text()
state = (ROOT / ".planning/STATE.md").read_text()
requirements = (ROOT / ".planning/REQUIREMENTS.md").read_text()

status_vocab = {
    "verified_permitted",
    "verified_restricted",
    "contract_required",
    "unknown",
    "not_applicable",
}
rights_rows: list[list[str]] = []
for line in register.splitlines():
    if not re.match(r"\| (US|UK|DE|JP)-\d+ \|", line):
        continue
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if len(cells) == 14:
        rights_rows.append(cells)

require(len(rights_rows) == 26, "rights matrix contains exactly 26 candidate routes")
counts = {}
for row in rights_rows:
    counts[row[0].split("-")[0]] = counts.get(row[0].split("-")[0], 0) + 1
require(counts == {"US": 8, "UK": 5, "DE": 6, "JP": 7}, "candidate counts are 8 US, 5 UK, 6 Germany and 7 Japan")
expected_regions = {"US": "US", "UK": "GB", "DE": "DE", "JP": "JP"}
require(all(row[1] == expected_regions[row[0].split("-")[0]] for row in rights_rows), "every route has the correct explicit region code")
for row in rights_rows:
    statuses = [value.strip("`") for value in row[5:12]]
    require(len(statuses) == 7 and set(statuses) <= status_vocab, f"{row[0]} has seven controlled rights statuses")
require(not any(all(value.strip("`") == "verified_permitted" for value in row[5:9] + [row[11]]) for row in rights_rows), "no route clears the private collection/retention/derivation/display/combination gate")
require("every row is `production_approval: not_approved`" in register, "register explicitly leaves every production approval off")

# Evidence IDs are first-party bibliography IDs in the compact Phase 1 register.
directory_ids = set(re.findall(r"\*\*([A-Z]+:[A-Za-z0-9]+)\s+—", register))
referenced_ids: set[str] = set()
for row in rights_rows:
    require("–" not in row[12], f"{row[0]} evidence references are explicitly enumerated")
    refs = re.findall(r"`([A-Z]+:[A-Za-z0-9]+)`", row[12])
    require(bool(refs), f"{row[0]} has at least one evidence reference")
    referenced_ids.update(refs)
require(referenced_ids <= directory_ids, "every matrix evidence reference resolves in the evidence directory")

weights = [Decimal("0.30"), Decimal("0.20"), Decimal("0.15"), Decimal("0.15"), Decimal("0.10"), Decimal("0.10")]
require(sum(weights) == Decimal("1.00"), "region weights sum to 100%")
region_scores = {
    "United States": (["2.0", "4.0", "3.5", "2.0", "3.0", "4.5"], "2.975"),
    "United Kingdom": (["1.8", "4.2", "3.3", "2.7", "3.2", "4.0"], "3.000"),
    "Germany": (["1.9", "4.5", "3.7", "3.2", "3.3", "4.3"], "3.265"),
    "Japan": (["1.5", "3.8", "3.8", "2.8", "3.1", "4.2"], "2.930"),
}
for region, (raw, expected) in region_scores.items():
    total = sum(Decimal(value) * weight for value, weight in zip(raw, weights))
    require(total == Decimal(expected), f"{region} weighted score recalculates to {expected}")
    require(f"**{expected} / 5" in assessment, f"{region} exact score is recorded in the assessment")
require("**Selected diligence region** | **United Kingdom**" in assessment, "UK is selected for diligence only")
require("**Approved production region** | **None**" in assessment, "no production region is approved")
require("**NO-GO for production collection" in assessment, "region gate is explicitly no-go for production")

threshold_ids = []
for line in method.splitlines():
    match = re.match(r"\| (T\d{2}) \|", line)
    if match:
        threshold_ids.append(match.group(1))
require(threshold_ids == [f"T{i:02d}" for i in range(1, 21)], "methodology defines exactly T01 through T20 in order")
for token in [
    "baseline_basket_product_ids",
    "acquisition_vendor_group_id",
    "cross_source_combination_status",
    "EXPERIMENTAL_REDUCED_SOURCE",
    "authorised-human approval",
    "canonical_hash",
    "external_publication_locked",
]:
    require(token in method, f"methodology contains required control: {token}")
require("DRAFT_NOT_APPROVED" in method, "methodology remains explicitly unapproved")
require("LOCKED_PENDING_SOURCE_RIGHTS_AND_HUMAN_APPROVAL" in method, "production activation remains locked")
require("index formula in Rule 23" in method, "daily basket rule points to the correct index-formula rule")
require("exact_median(nonmissing(product_daily[p])" not in method, "basket-price pseudocode does not apply nonmissing to scalar values")
require("if product_daily[p] is not MISSING" in method, "basket-price pseudocode explicitly filters missing product prices")

config = json.loads((ROOT / ".planning/config.json").read_text())
locks = config["safety"]
require(all(locks.values()), "all configured consequential-action locks remain enabled")
require("SRC-02 | Phase 1 | Blocked" in requirements, "SRC-02 remains visibly blocked")
require("Approved production region: none" in state, "state records no approved production region")
require("Production collection/index: no-go" in state, "state records the production no-go")
require(
    "No production data/index application exists yet" in state,
    "state does not claim a production data/index implementation that does not exist",
)
require("all seven fields are required" in template.lower(), "source template requires all seven rights dimensions")
require("Production collection:** no-go" in verification, "verification records the production no-go")
require("approves no source" in verification, "verification explicitly grants no source approval")

for path in required + [ROOT / ".planning/PROJECT.md", ROOT / ".planning/REQUIREMENTS.md", ROOT / ".planning/STATE.md"]:
    require(path.read_bytes().endswith(b"\n"), f"{path.relative_to(ROOT)} ends with a newline")

print(f"PASS: {len(checks)} checks")
for item in checks:
    print(f"- {item}")
