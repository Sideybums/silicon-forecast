#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTRACT_VERSION, canonicalJsonBytes, compareUtf8, mapObservation,
  mappingContractManifest, prescribedManifestBytes, sha256,
  validateCommittedSchema,
} from "../lib/collector-persistence/mapping-contract-v1.mjs";

export const FIXTURE_COMMIT = "2181685afa98dcc42316c13377f50b932a471431";
export const FIXTURE_TREE = "5fd4b6f544bac994976c9c2f8303046296791026";
export const FIXTURE_RUN_ID = "sf-collection-run-20260825T103008Z";
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const TARGET_PATH = "data/catalogue/collection-targets.v1.json";
const CANDIDATE_PATH = "data/derived/private-candidate/ram-input-manifest.v1.json";
const RUN_PATH = "data/collection-runs/ledger.v1.json";
const KIND = new Map([[RUN_PATH,"run_ledger"],[TARGET_PATH,"target_registry"],[CANDIDATE_PATH,"candidate_input_manifest"]]);

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: projectRoot, encoding: options.encoding ?? null, maxBuffer: 20 * 1024 * 1024 });
}
function parse(bytes, path) {
  try { return JSON.parse(bytes.toString("utf8")); } catch (error) { throw new Error(`INVALID_JSON:${path}:${error.message}`); }
}
function regularPath(path) {
  if (typeof path !== "string" || path.startsWith("/") || path.includes("\\") || path.split("/").includes("..") || path.length === 0) throw new Error(`NON_CANONICAL_PATH:${path}`);
  return path;
}
function artifactAt(commit, path, kind) {
  regularPath(path);
  const line = git(["ls-tree", commit, "--", path], { encoding: "utf8" }).trim();
  const match = /^100644 blob ([0-9a-f]{40})\t(.+)$/u.exec(line);
  if (!match || match[2] !== path) throw new Error(`NOT_REGULAR_GIT_ARTIFACT:${path}`);
  const bytes = git(["show", `${commit}:${path}`]);
  return { path, kind, git_blob: match[1], byte_length: bytes.length, sha256: sha256(bytes), bytes, json: parse(bytes, path) };
}
function sqlText(value) {
  if (value === null || value === undefined) return "NULL";
  return `convert_from(decode('${Buffer.from(String(value), "utf8").toString("base64")}','base64'),'UTF8')`;
}
function sqlJson(value) { return `${sqlText(JSON.stringify(value))}::jsonb`; }
function sqlBytes(value) { return `decode('${Buffer.from(value).toString("base64")}','base64')`; }
function sqlInt(value) { return value === null || value === undefined ? "NULL" : String(value); }
function sqlBool(value) { return value ? "true" : "false"; }

function validateLegacy(run, tranche, evidence) {
  validateCommittedSchema("collector-persistence/observation-tranche.v1.schema.json", tranche);
  validateCommittedSchema("collector-persistence/evidence-ledger.v1.schema.json", evidence);
  if (run.run_id !== FIXTURE_RUN_ID || run.targets_attempted !== 45 || run.observations_retained !== 35 || run.abstentions !== 10) throw new Error("LEGACY_RUN_CONTRACT_MISMATCH");
  if (Object.hasOwn(run, "target_selection")) throw new Error("LEGACY_FIXTURE_UNEXPECTED_TARGET_SELECTION");
  if (tranche.capture_basis?.run_id !== run.run_id || tranche.observation_count !== 35 || tranche.observations.length !== 35) throw new Error("TRANCHE_COUNT_OR_RUN_MISMATCH");
  if (evidence.run_id !== run.run_id || evidence.entry_count !== 35 || evidence.entries.length !== 35) throw new Error("EVIDENCE_COUNT_OR_RUN_MISMATCH");
  const evidenceKeys = new Set();
  for (const entry of evidence.entries) {
    const key = `${entry.seller_display_name}\u001f${entry.facts.mpn}`;
    if (evidenceKeys.has(key)) throw new Error(`DUPLICATE_EVIDENCE_IDENTITY:${key}`);
    evidenceKeys.add(key);
  }
  for (const observation of tranche.observations) {
    const key = `${observation.seller.display_name}\u001f${observation.identity.mpn_observed}`;
    if (!evidenceKeys.has(key)) throw new Error(`OBSERVATION_EVIDENCE_MISSING:${key}`);
    mapObservation(observation);
  }
}

export function buildLegacyFixture({ commit = FIXTURE_COMMIT, runId = FIXTURE_RUN_ID } = {}) {
  if (commit !== FIXTURE_COMMIT || runId !== FIXTURE_RUN_ID) throw new Error("UNTRUSTED_FIXTURE_COMMIT_OR_RUN");
  const tree = git(["show", "-s", "--format=%T", commit], { encoding: "utf8" }).trim();
  if (tree !== FIXTURE_TREE) throw new Error("UNTRUSTED_FIXTURE_TREE");
  const runArtifact = artifactAt(commit, RUN_PATH, "run_ledger");
  validateCommittedSchema("collector-persistence/run-ledger.v1.schema.json", runArtifact.json);
  const run = runArtifact.json.runs.find((item) => item.run_id === runId);
  if (!run) throw new Error("RUN_NOT_FOUND");
  validateCommittedSchema("collector-persistence/imported-run.v1.schema.json", run);
  const paths = [RUN_PATH, TARGET_PATH, CANDIDATE_PATH, run.tranche_file, run.evidence_ledger, run.global_integration_audit];
  if (new Set(paths).size !== 6 || paths.some((path) => !path)) throw new Error("LEGACY_MEMBERSHIP_NOT_EXACTLY_SIX");
  const artifacts = paths.map((path) => artifactAt(commit, path, KIND.get(path) ?? (path === run.tranche_file ? "observation_tranche" : path === run.evidence_ledger ? "evidence_ledger" : "global_integration_audit"))).sort((a,b) => compareUtf8(a.path,b.path));
  const tranche = artifacts.find((item) => item.kind === "observation_tranche").json;
  const evidence = artifacts.find((item) => item.kind === "evidence_ledger").json;
  validateLegacy(run, tranche, evidence);
  const mapping = mappingContractManifest(projectRoot);
  const manifest = { schema_version: 1, bundle_contract: "sf-collector-import-bundle-v1", run_id: runId, collector_commit: commit, collector_tree: tree, artifacts: artifacts.map(({path,kind,git_blob,byte_length,sha256: digest}) => ({path,kind,git_blob,byte_length,sha256:digest})) };
  const manifestBytes = prescribedManifestBytes(manifest, "bundle");
  return { commit, tree, run, tranche, evidence, artifacts, mapping, manifest, manifestBytes, bundleId: sha256(manifestBytes) };
}

export function renderLegacySql(bundle = buildLegacyFixture()) {
  const { run, tranche, evidence, artifacts, mapping, manifest, manifestBytes, bundleId, commit, tree } = bundle;
  const targetArtifact = artifacts.find((item) => item.kind === "target_registry");
  const runArtifact = artifacts.find((item) => item.kind === "run_ledger");
  const trancheArtifact = artifacts.find((item) => item.kind === "observation_tranche");
  const projectionManifest = {bundle_id:bundleId,mapping_contract_version:CONTRACT_VERSION,mapping_contract_sha256:mapping.digest};
  const projectionId = sha256(canonicalJsonBytes(projectionManifest));
  const lines = ["BEGIN;", `SELECT pg_advisory_xact_lock(${Buffer.from(bundleId,"hex").readInt32BE(0)},${Buffer.from(bundleId,"hex").readInt32BE(4)});`];
  lines.push(`INSERT INTO silicon_forecast.collector_mapping_contract(contract_version,manifest_sha256,manifest_byte_length,manifest_bytes,manifest_json) VALUES (${sqlText(CONTRACT_VERSION)},${sqlText(mapping.digest)},${mapping.bytes.length},${sqlBytes(mapping.bytes)},${sqlJson(mapping.manifest)}) ON CONFLICT (contract_version) DO NOTHING;`);
  lines.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM silicon_forecast.collector_mapping_contract WHERE contract_version=${sqlText(CONTRACT_VERSION)} AND manifest_sha256=${sqlText(mapping.digest)} AND manifest_bytes=${sqlBytes(mapping.bytes)}) THEN RAISE EXCEPTION 'MAPPING_CONTRACT_COLLISION'; END IF; END $$;`);
  lines.push(`INSERT INTO silicon_forecast.collector_import_bundle(bundle_id,collector_commit,collector_tree,manifest_sha256,manifest_byte_length,manifest_bytes,manifest_json) VALUES (${sqlText(bundleId)},${sqlText(commit)},${sqlText(tree)},${sqlText(bundleId)},${manifestBytes.length},${sqlBytes(manifestBytes)},${sqlJson(manifest)}) ON CONFLICT (bundle_id) DO NOTHING;`);
  lines.push(`INSERT INTO silicon_forecast.collector_projection_batch(projection_batch_id,bundle_id,mapping_contract_version,mapping_contract_sha256,projection_digest,projection_manifest) VALUES (${sqlText(projectionId)},${sqlText(bundleId)},${sqlText(CONTRACT_VERSION)},${sqlText(mapping.digest)},${sqlText(projectionId)},${sqlJson(projectionManifest)}) ON CONFLICT (bundle_id,mapping_contract_version) DO NOTHING;`);
  for (const artifact of artifacts) lines.push(`INSERT INTO silicon_forecast.collector_raw_artifact(bundle_id,collector_commit,collector_tree,canonical_path,git_blob,content_byte_length,content_sha256,artifact_kind,raw_bytes,parsed_json) VALUES (${sqlText(bundleId)},${sqlText(commit)},${sqlText(tree)},${sqlText(artifact.path)},${sqlText(artifact.git_blob)},${artifact.byte_length},${sqlText(artifact.sha256)},${sqlText(artifact.kind)},${sqlBytes(artifact.bytes)},${sqlJson(artifact.json)}) ON CONFLICT (collector_commit,canonical_path) DO NOTHING;`);
  lines.push(`INSERT INTO silicon_forecast.collector_collection_run(collection_run_id,bundle_id,run_artifact_id,collector_version,started_at,completed_at,outcome,attempt_schema_version,selected_target_keys,targets_attempted,observations_retained,abstentions,raw_abstention_reasons,target_registry_path,target_registry_sha256,raw_run) VALUES (${sqlText(run.run_id)},${sqlText(bundleId)},(SELECT id FROM silicon_forecast.collector_raw_artifact WHERE bundle_id=${sqlText(bundleId)} AND canonical_path=${sqlText(runArtifact.path)}),${sqlText(run.collector_version)},${sqlText(run.started_at)}::timestamptz,${sqlText(run.completed_at)}::timestamptz,${sqlText(run.outcome)},NULL,NULL,${run.targets_attempted},${run.observations_retained},${run.abstentions},${sqlJson(run.abstention_reasons)},${sqlText(TARGET_PATH)},${sqlText(targetArtifact.sha256)},${sqlJson(run)}) ON CONFLICT (collection_run_id) DO NOTHING;`);
  lines.push(`INSERT INTO silicon_forecast.collector_observation_tranche(tranche_id,collection_run_id,bundle_id,artifact_id,schema_version,region_raw,channel_raw,status_raw,created_at,observation_count,evidence_ledger_path,raw_tranche) VALUES (${sqlText(tranche.tranche_id)},${sqlText(run.run_id)},${sqlText(bundleId)},(SELECT id FROM silicon_forecast.collector_raw_artifact WHERE bundle_id=${sqlText(bundleId)} AND canonical_path=${sqlText(trancheArtifact.path)}),${tranche.schema_version},${sqlText(tranche.region)},${sqlText(tranche.channel)},${sqlText(tranche.status)},${sqlText(tranche.created_at)}::timestamptz,${tranche.observation_count},${sqlText(tranche.evidence_ledger)},${sqlJson(tranche)}) ON CONFLICT (tranche_id) DO NOTHING;`);
  const evidenceByKey = new Map(evidence.entries.map((entry) => [`${entry.seller_display_name}\u001f${entry.facts.mpn}`, entry]));
  for (const observation of tranche.observations) {
    const mapped = mapObservation(observation);
    const entry = evidenceByKey.get(`${observation.seller.display_name}\u001f${observation.identity.mpn_observed}`);
    const attemptId = `${run.run_id}:legacy-observation:${sha256(Buffer.from(observation.observation_id)).slice(0,24)}`;
    const rawAttempt = { legacy_state: "observation_derived_unknown_ordinal", observation_id: observation.observation_id, evidence_id: entry.evidence_id, seller_display_name: observation.seller.display_name, expected_mpn: observation.identity.mpn_expected };
    lines.push(`INSERT INTO silicon_forecast.collector_target_attempt(attempt_id,collection_run_id,bundle_id,ordinal,target_key,expected_mpn_raw,seller_display_name_raw,seller_legal_name_supplied_raw,source_key_raw,requested_url_raw,attempt_started_at,attempt_completed_at,outcome_raw,raw_reasons,http_status,final_url_raw,response_bytes,response_sha256,response_bytes_retained,retention_note_raw,observation_id_raw,evidence_id_raw,raw_result_sha256,raw_attempt,legacy_detail_state) VALUES (${sqlText(attemptId)},${sqlText(run.run_id)},${sqlText(bundleId)},NULL,NULL,${sqlText(observation.identity.mpn_expected)},${sqlText(observation.seller.display_name)},${sqlText(observation.seller.legal_name)},${sqlText(observation.source.source_key)},${sqlText(observation.source.source_url)},NULL,NULL,'observation_retained','[]'::jsonb,${sqlInt(entry.http_status)},${sqlText(entry.final_url)},${sqlInt(entry.response_bytes)},${sqlText(entry.response_sha256)},false,${sqlText(entry.retention_note)},${sqlText(observation.observation_id)},${sqlText(entry.evidence_id)},NULL,${sqlJson(rawAttempt)},'observation_derived_unknown_ordinal') ON CONFLICT (attempt_id) DO NOTHING;`);
    lines.push(`INSERT INTO silicon_forecast.collector_evidence_entry(evidence_id,collection_run_id,bundle_id,tranche_id,attempt_id,seller_display_name_raw,source_url_raw,final_url_raw,retrieved_at,http_status,response_bytes,response_sha256,response_bytes_retained,retention_note_raw,vat_determination_raw,facts_raw,raw_evidence) VALUES (${sqlText(entry.evidence_id)},${sqlText(run.run_id)},${sqlText(bundleId)},${sqlText(tranche.tranche_id)},${sqlText(attemptId)},${sqlText(entry.seller_display_name)},${sqlText(entry.source_url)},${sqlText(entry.final_url)},${sqlText(entry.retrieved_at)}::timestamptz,${sqlInt(entry.http_status)},${sqlInt(entry.response_bytes)},${sqlText(entry.response_sha256)},${sqlBool(entry.response_bytes_retained)},${sqlText(entry.retention_note)},${sqlText(entry.vat_determination)},${sqlJson(entry.facts)},${sqlJson(entry)}) ON CONFLICT (evidence_id) DO NOTHING;`);
    const rawBytes = canonicalJsonBytes(observation);
    lines.push(`INSERT INTO silicon_forecast.collector_retail_offer_observation(observation_id_raw,collection_run_id,bundle_id,projection_batch_id,tranche_id,attempt_id,evidence_id,mapping_contract_version,mapping_contract_sha256,expected_mpn_raw,observed_mpn_raw,normalised_mpn,supplied_target_identity,seller_raw,availability_raw,availability_normalised,delivery_raw,landed_price_raw,qualification_raw,qualification_normalised,item_price_minor,currency_raw,observed_at,retrieved_at,source_url_raw,final_url_raw,response_sha256,raw_observation_sha256,raw_observation) VALUES (${sqlText(observation.observation_id)},${sqlText(run.run_id)},${sqlText(bundleId)},${sqlText(projectionId)},${sqlText(tranche.tranche_id)},${sqlText(attemptId)},${sqlText(entry.evidence_id)},${sqlText(CONTRACT_VERSION)},${sqlText(mapping.digest)},${sqlText(observation.identity.mpn_expected)},${sqlText(observation.identity.mpn_observed)},${sqlText(mapped.normalised.normalisedMpn)},${sqlText(mapped.normalised.suppliedTargetIdentity)},${sqlJson(observation.seller)},${sqlJson(observation.availability)},${sqlText(mapped.normalised.availability)},${sqlJson(observation.delivery)},${sqlJson(observation.landed_price)},${sqlJson(observation.qualification)},${sqlText(mapped.normalised.qualification)},${observation.item_price.amount_minor},${sqlText(observation.item_price.currency)},${sqlText(observation.observed_at)}::timestamptz,${sqlText(entry.retrieved_at)}::timestamptz,${sqlText(observation.source.source_url)},${sqlText(entry.final_url)},${sqlText(entry.response_sha256)},${sqlText(sha256(rawBytes))},${sqlJson(observation)}) ON CONFLICT (observation_id_raw,projection_batch_id) DO NOTHING;`);
    for (const reason of mapped.quarantine) lines.push(`INSERT INTO silicon_forecast.collector_ingestion_quarantine(bundle_id,projection_batch_id,collection_run_id,subject_type,subject_identity,reason_code,raw_finding) VALUES (${sqlText(bundleId)},${sqlText(projectionId)},${sqlText(run.run_id)},'observation',${sqlText(observation.observation_id)},${sqlText(reason)},${sqlJson({reason, mapping_contract: CONTRACT_VERSION})}) ON CONFLICT DO NOTHING;`);
  }
  lines.push(`INSERT INTO silicon_forecast.collector_attempt_gap(collection_run_id,bundle_id,missing_identity_count,aggregate_reason_map,provenance_note,quarantine_code) VALUES (${sqlText(run.run_id)},${sqlText(bundleId)},10,${sqlJson(run.abstention_reasons)},'The retained run did not preserve target_selection; ten attempted identities and per-target reasons are unavailable.','legacy_attempt_detail_unavailable') ON CONFLICT (collection_run_id,quarantine_code) DO NOTHING;`);
  lines.push(`INSERT INTO silicon_forecast.collector_ingestion_quarantine(bundle_id,projection_batch_id,collection_run_id,subject_type,subject_identity,reason_code,raw_finding) VALUES (${sqlText(bundleId)},${sqlText(projectionId)},${sqlText(run.run_id)},'run',${sqlText(run.run_id)},'legacy_attempt_detail_unavailable',${sqlJson({missing_identity_count:10, aggregate_reason_map:run.abstention_reasons})}) ON CONFLICT DO NOTHING;`);
  lines.push(`SELECT silicon_forecast.assert_collector_bundle(${sqlText(bundleId)});`, "COMMIT;", "");
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2); let commit = FIXTURE_COMMIT; let runId = FIXTURE_RUN_ID;
  for (let index=0; index<args.length; index+=1) { if (args[index]==="--commit") commit=args[++index]; else if (args[index]==="--run-id") runId=args[++index]; else throw new Error(`UNKNOWN_ARGUMENT:${args[index]}`); }
  process.stdout.write(renderLegacySql(buildLegacyFixture({commit,runId})));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode=1; }
}
