import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildLegacyFixture, FIXTURE_COMMIT, renderLegacySql } from "../scripts/render-collector-fixture-sql.mjs";
import { canonicalJsonBytes, compareUtf8, mapObservation, mappingContractManifest, normaliseMpn, prescribedManifestBytes, sha256, suppliedTargetIdentity, validateAttemptSet } from "../lib/collector-persistence/mapping-contract-v1.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const fixtureDir=resolve(root,"tests/fixtures/collector-persistence");

test("canonical JSON and mapping contract are deterministic and fail closed",()=>{
  assert.equal(normaliseMpn("  kf５６-c.1  "),"KF56-C.1");
  assert.equal(suppliedTargetIdentity("Rétailer"," mpn-1 "),"Rétailer\u001fMPN-1");
  assert.equal(compareUtf8("z","é"),-1);
  assert.equal(canonicalJsonBytes({é:1,z:2}).toString(),'{\n  "z": 2,\n  "é": 1\n}\n');
  assert.throws(()=>canonicalJsonBytes({value:Infinity}),/non-finite/u);
  const mapping=mappingContractManifest(root);
  assert.equal(mapping.manifest.artifacts.length,6);
  assert.equal(sha256(mapping.bytes),mapping.digest);
  assert.throws(()=>prescribedManifestBytes({...mapping.manifest, unexpected:true},"mapping"),/MAPPING_MANIFEST_ENVELOPE_INVALID/u);
  assert.throws(()=>prescribedManifestBytes({...mapping.manifest, artifacts:mapping.manifest.artifacts.map((item,index)=>index===0?{...item,unexpected:true}:item)},"mapping"),/MAPPING_MANIFEST_ARTIFACT_ENVELOPE_INVALID/u);
  const changed=Buffer.from(mapping.bytes); changed[changed.length-2]^=1;
  assert.notEqual(sha256(changed),mapping.digest);
});

test("allowlisted Git fixture creates exact six-member golden bundle",()=>{
  const bundle=buildLegacyFixture();
  const golden=readFileSync(resolve(fixtureDir,"legacy-bundle-manifest.v1.json"));
  const digest=readFileSync(resolve(fixtureDir,"legacy-bundle-manifest.v1.sha256"),"utf8").trim();
  assert.equal(bundle.commit,FIXTURE_COMMIT);
  assert.equal(bundle.artifacts.length,6);
  assert.deepEqual(bundle.manifestBytes,golden);
  assert.equal(bundle.bundleId,digest);
  assert.equal(sha256(golden),digest);
  assert.equal(bundle.tranche.observations.length,35);
  assert.equal(bundle.run.abstentions,10);
  assert.equal((renderLegacySql(bundle).match(/observation_derived_unknown_ordinal/g)??[]).length,35);
  assert.match(renderLegacySql(bundle),/missing_identity_count,aggregate_reason_map[\s\S]*,10,/u);
  assert.throws(()=>buildLegacyFixture({commit:"0".repeat(40)}),/UNTRUSTED_FIXTURE/u);
});

test("fixture SQL is byte-identical outside the repository",()=>{
  const script=resolve(root,"scripts/render-collector-fixture-sql.mjs");
  const inside=execFileSync(process.execPath,[script],{cwd:root,maxBuffer:10*1024*1024});
  const outside=execFileSync(process.execPath,[script],{cwd:"/tmp",maxBuffer:10*1024*1024});
  assert.deepEqual(outside,inside);
});

test("synthetic attempt-schema v1 preserves every successful and failed target",()=>{
  const fixture=validateAttemptSet(JSON.parse(readFileSync(resolve(fixtureDir,"attempt-set-v1.synthetic.json"),"utf8")));
  assert.equal(fixture.attempts.length,45);
  assert.equal(fixture.attempts.filter((a)=>a.outcome==="observation_retained").length,2);
  assert.equal(fixture.attempts.filter((a)=>a.outcome!=="observation_retained").length,43);
  assert.deepEqual(fixture.attempts[2].raw_reasons,["HTTP_403"]);
  const changed=structuredClone(fixture); changed.attempts[2].raw_reasons=["CHANGED"];
  assert.throws(()=>validateAttemptSet(changed),/OUTCOME_OR_REASON/u);
  const authority=structuredClone(fixture); authority.governance.publication_eligible=true;
  assert.throws(()=>validateAttemptSet(authority),/JSON_SCHEMA_INVALID/u);
  const extra=structuredClone(fixture); extra.attempts[0].execute="rm -rf /";
  assert.throws(()=>validateAttemptSet(extra),/JSON_SCHEMA_INVALID/u);
});

test("mapping retains raw vocabulary, nulls and colon identities",()=>{
  const observation=buildLegacyFixture().tranche.observations.find((item)=>item.availability.normalised==="other");
  const mapped=mapObservation(observation);
  assert.equal(mapped.raw.observation_id.includes(":"),true);
  assert.equal(mapped.raw.availability.display,"Out of stock");
  assert.equal(mapped.raw.delivery.destination_basis,null);
  assert.equal(mapped.raw.evidence.extract_sha256,null);
  assert.equal(mapped.normalised.availability,"other");
  assert.equal(mapped.normalised.qualification,"retained_candidate");
  const unsafe=structuredClone(observation); unsafe.governance.publication_allowed=true;
  assert.throws(()=>mapObservation(unsafe),/AUTHORITY_FLAG_TRUE/u);
});
