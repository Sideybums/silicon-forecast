import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fixtureUrl = new URL(
  "../data/observations/candidate/amazon-uk-2026-08-06T103140Z.v1.json",
  import.meta.url,
);

const loadFixture = async () => JSON.parse(await readFile(fixtureUrl, "utf8"));

const decimalAmount = /^(0|[1-9]\d*)\.\d{2}$/;

test("candidate price snapshot remains outside production and publication", async () => {
  const fixture = await loadFixture();

  assert.equal(fixture.status, "candidate_research_only");
  assert.equal(fixture.region, "GB");
  assert.equal(fixture.currency, "GBP");
  assert.equal(fixture.governance.production_import_allowed, false);
  assert.equal(fixture.governance.publication_allowed, false);
  assert.equal(fixture.governance.index_inclusion_allowed, false);
  assert.equal(fixture.governance.automatic_matching_allowed, false);
  assert.ok(fixture.observations.length > 0);
  assert.ok(
    fixture.observations.every(
      (observation) => observation.eligibility === "excluded_pending_review",
    ),
  );
});

test("bounded public projection is additive, attributable and exact", async () => {
  const sourceBytes = await readFile(fixtureUrl);
  const source = JSON.parse(sourceBytes.toString("utf8"));
  const publication = JSON.parse(await readFile(new URL(
    "../data/publications/ddr5-marketplace-observations-2026-08-09.v1.json",
    import.meta.url,
  ), "utf8"));

  assert.equal(publication.status, "approved_public_research_snapshot");
  assert.equal(publication.approved_by.role, "project_owner");
  assert.equal(createHash("sha256").update(sourceBytes).digest("hex"), publication.source_snapshot_sha256);
  assert.equal(publication.publication_scope.current_price_claim_allowed, false);
  assert.equal(publication.publication_scope.deal_or_recommendation_allowed, false);
  assert.equal(publication.publication_scope.index_inclusion_allowed, false);
  assert.equal(publication.commercial_status.links_are_affiliate, false);
  assert.equal(publication.commercial_status.links_are_tracked, false);
  assert.equal(publication.commercial_status.commission_expected, false);

  const sourceByKey = new Map(source.observations.map((observation) => [observation.observation_key, observation]));
  assert.equal(publication.observations.length, 3);
  for (const published of publication.observations) {
    const observed = sourceByKey.get(published.observation_key);
    assert.ok(observed, `${published.observation_key} is absent from the source snapshot`);
    assert.equal(observed.match_status, "exact_mpn_in_page_title");
    assert.equal(published.mpn, observed.mpn_observed);
    assert.equal(published.observed_price_gbp, observed.display_price.amount);
    assert.equal(published.seller, observed.seller);
    assert.equal(published.source_url, observed.source_url);
    assert.ok(published.caveats.length > 0);
  }
  assert.ok(!publication.observations.some(({ observation_key }) => observation_key === "amazon-uk-B0BN4PPQ16-2026-08-06T103140Z"));
});

test("candidate observations preserve provenance and conservative matching", async () => {
  const fixture = await loadFixture();
  const observationKeys = new Set();

  for (const observation of fixture.observations) {
    assert.ok(!observationKeys.has(observation.observation_key));
    observationKeys.add(observation.observation_key);

    const url = new URL(observation.source_url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "www.amazon.co.uk");
    assert.equal(observation.platform, "amazon_uk");
    assert.equal(observation.channel, "MARKETPLACE_PRO");
    assert.equal(observation.manufacturer_authorisation, "unverified");
    assert.equal(observation.offer_basis, "ASK");
    assert.equal(observation.condition_evidence.classified, "NEW_OTHER");
    assert.match(observation.display_price.amount, decimalAmount);
    assert.equal(observation.display_price.currency, "GBP");
    assert.ok(observation.exclusion_reasons.length > 0);
    assert.ok(observation.evidence.length > 0);

    if (observation.match_status === "exact_mpn_in_page_title") {
      assert.equal(observation.mpn_observed, observation.mpn_expected);
      assert.ok(observation.listing_title.includes(observation.mpn_expected));
    } else {
      assert.equal(observation.match_status, "needs_human_review_exact_mpn_absent");
      assert.equal(observation.mpn_observed, null);
      assert.ok(
        observation.exclusion_reasons.includes(
          "exact_mpn_not_present_in_retained_page_evidence",
        ),
      );
    }
  }
});
