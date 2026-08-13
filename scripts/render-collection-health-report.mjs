// Renders the collection health view: what the collector has done, which
// scheduled days went unobserved and are waiting on you, and which retailers
// are actually reachable.
//
// This exists because "the gap is recorded in the ledger" is not the same as
// being reviewable. A JSON file on disk is a record; this is the place to go
// and look at it.
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { SCHEDULE } from "../lib/canonical-collector.mjs";

const repo = new URL("../", import.meta.url);
const ledgerPath = new URL("data/collection-runs/ledger.v1.json", repo);
const ledger = existsSync(ledgerPath)
  ? JSON.parse(readFileSync(ledgerPath, "utf8"))
  : { runs: [], missed_slots: [], schedule: SCHEDULE };
const registry = JSON.parse(readFileSync(new URL("data/catalogue/collection-targets.v1.json", repo), "utf8"));

// Per-retailer reachability, taken from what runs actually observed rather than
// from what we hope is true.
const candidateDir = new URL("data/observations/candidate/", repo);
const liveBySeller = new Map();
for (const f of readdirSync(candidateDir).filter((x) => /^uk-primary-retail-\d/u.test(x))) {
  const t = JSON.parse(readFileSync(new URL(f, candidateDir), "utf8"));
  for (const o of t.observations ?? []) {
    const s = o.seller?.display_name;
    if (!s) continue;
    const cur = liveBySeller.get(s) ?? { observations: 0, last: null };
    cur.observations += 1;
    const at = o.observed_at;
    if (!cur.last || at > cur.last) cur.last = at;
    liveBySeller.set(s, cur);
  }
}

const lastRun = ledger.runs.at(-1) ?? null;
const blocked = Object.entries(lastRun?.abstention_reasons ?? {}).filter(([k]) => /^HTTP_4\d\d$/u.test(k));
// Acknowledgement is derived from the appended records, which are the
// authority; the boolean on each slot is only a cached view of them.
const acknowledged = new Map((ledger.acknowledgements ?? []).map((a) => [a.scheduled_for, a]));
const openGaps = ledger.missed_slots.filter((m) => !acknowledged.has(m.scheduled_for));

const esc = (s) => String(s).replace(/[&<>"]/gu, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const when = (iso) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : "—");

const sellerRows = Object.entries(registry.targets_by_seller)
  .sort((a, b) => b[1] - a[1])
  .map(([seller, targets]) => {
    const live = liveBySeller.get(seller);
    const reachable = live ? "collected" : "not yet collected";
    return `<tr>
      <td>${esc(seller)}</td>
      <td class="num">${targets}</td>
      <td class="num">${live?.observations ?? 0}</td>
      <td class="mono">${when(live?.last)}</td>
      <td><span class="pill ${live ? "ok" : "unknown"}">${reachable}</span></td>
    </tr>`;
  })
  .join("");

const gapRows = ledger.missed_slots.length
  ? ledger.missed_slots
      .slice()
      .reverse()
      .map(
        (m) => `<tr class="${acknowledged.has(m.scheduled_for) ? "" : "open"}">
        <td class="mono">${esc(m.scheduled_for.replace("T", " ").slice(0, 16))}</td>
        <td>${esc(m.state)}</td>
        <td class="mono">${when(m.detected_at)}</td>
        <td>${
          acknowledged.has(m.scheduled_for)
            ? `<span class='pill ok'>acknowledged</span> <span class="muted">${esc(acknowledged.get(m.scheduled_for).acknowledged_by)}, ${acknowledged.get(m.scheduled_for).acknowledged_at.slice(0, 10)}</span>`
            : "<span class='pill warn'>awaiting you</span>"
        }</td>
      </tr>`,
      )
      .join("")
  : `<tr><td colspan="4" class="muted">No missed scheduled slots recorded.</td></tr>`;

const runRows = ledger.runs
  .slice()
  .reverse()
  .slice(0, 20)
  .map(
    (r) => `<tr>
      <td class="mono">${when(r.started_at)}</td>
      <td class="num">${r.targets_attempted ?? "—"}</td>
      <td class="num strong">${r.observations_retained ?? 0}</td>
      <td class="num">${r.abstentions ?? 0}</td>
      <td class="mono small">${esc(Object.entries(r.abstention_reasons ?? {}).map(([k, v]) => `${k}×${v}`).join("  ") || "—")}</td>
      <td>${r.reconstructed ? "<span class='pill unknown'>reconstructed</span>" : "<span class='pill ok'>collector</span>"}</td>
    </tr>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Silicon Forecast — collection health (private)</title>
<style>
:root{--paper:#f2efe7;--raised:#fbfaf6;--ink:#171a18;--muted:#59615d;--rule:#c8c8bd;--rule2:#8b908b;--amber:#c46616;--amber-dark:#94501a;--amber-soft:#f0d2ad;--blue:#356a78;
--display:"Arial Narrow","Avenir Next Condensed","Roboto Condensed",sans-serif;--body:"Avenir Next","Segoe UI",system-ui,sans-serif;--mono:"SFMono-Regular",Consolas,"Liberation Mono",monospace}
*{box-sizing:border-box}
body{margin:0;padding:2.5rem 1.5rem 5rem;background:var(--paper);color:var(--ink);font-family:var(--body);line-height:1.55}
.shell{width:min(100%,72rem);margin-inline:auto}
h1,h2{font-family:var(--display);letter-spacing:-.025em;line-height:.98;margin-top:0}
h1{font-size:clamp(2.2rem,5vw,3.4rem);margin-bottom:.5rem}
h2{font-size:1.5rem;margin:2.5rem 0 1rem}
.eyebrow{margin:0 0 .8rem;font:700 .68rem/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--amber-dark)}
.lede{color:var(--muted);max-width:62ch;margin:0 0 2rem}
.cards{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--ink);background:var(--raised)}
.cards div{padding:1.1rem 1.2rem;border-right:1px solid var(--rule2)}
.cards div:last-child{border-right:0}
.cards span{display:block;margin-bottom:1.2rem;font:700 .6rem/1.2 var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.cards strong{display:block;font:800 1.9rem/1 var(--display)}
.cards em{display:block;margin-top:.3rem;font:.65rem/1.3 var(--mono);color:var(--muted);font-style:normal}
.cards div.alert{background:#f0e5d4}
.cards div.alert strong{color:var(--amber-dark)}
table{width:100%;border-collapse:collapse;font-size:.87rem;background:var(--raised);border:1px solid var(--rule2)}
th,td{padding:.5rem .7rem;border-bottom:1px solid var(--rule);text-align:left}
th{font:700 .62rem/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--ink)}
td.num{text-align:right;font-variant-numeric:tabular-nums;font-family:var(--mono);font-size:.8rem}
td.mono{font-family:var(--mono);font-size:.78rem}
td.small{font-size:.72rem}
td.strong{font-weight:700}
tr.open{background:#f0e5d4}
.muted{color:var(--muted)}
.pill{display:inline-block;padding:.18rem .45rem;font:700 .6rem/1.3 var(--mono);text-transform:uppercase;letter-spacing:.05em;border:1px solid currentColor}
.pill.ok{color:var(--blue)}
.pill.warn{color:var(--amber-dark);background:var(--amber-soft)}
.pill.unknown{color:var(--muted)}
.notice{border:1px solid var(--rule2);border-left:6px solid var(--amber);background:#f0e5d4;padding:1rem 1.2rem;margin:1.5rem 0;display:grid;grid-template-columns:190px 1fr;gap:1rem;font-size:.88rem}
.notice strong{font:700 .66rem/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.notice p{margin:0;color:var(--muted)}
.notice.info{border-left-color:var(--blue);background:var(--raised)}
code{font-family:var(--mono);font-size:.85em;background:#e8e3d8;padding:.1rem .3rem}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--rule2);color:var(--muted);font-size:.8rem;max-width:80ch}
@media(max-width:900px){.cards{grid-template-columns:1fr 1fr}.notice{grid-template-columns:1fr}}
</style></head><body><div class="shell">

<p class="eyebrow">Private operations view</p>
<h1>Collection health</h1>
<p class="lede">What the daily collector has done, which scheduled days passed with no run at all, and which retailers will actually answer it.</p>

<div class="cards">
  <div><span>Last run</span><strong>${when(lastRun?.started_at).slice(0, 10) || "never"}</strong><em>${lastRun ? `${lastRun.observations_retained} observations` : "no run recorded"}</em></div>
  <div><span>Runs recorded</span><strong>${ledger.runs.length}</strong><em>schedule ${String(SCHEDULE.hour).padStart(2, "0")}:${String(SCHEDULE.minute).padStart(2, "0")} daily</em></div>
  <div class="${openGaps.length ? "alert" : ""}"><span>Gaps awaiting you</span><strong>${openGaps.length}</strong><em>${ledger.missed_slots.length} recorded in total</em></div>
  <div><span>Targets</span><strong>${registry.target_count}</strong><em>${registry.distinct_mpn_count} products, ${Object.keys(registry.targets_by_seller).length} retailers</em></div>
</div>

${
  openGaps.length
    ? `<div class="notice"><strong>Days with no observation</strong><p>${openGaps.length} scheduled ${openGaps.length === 1 ? "day" : "days"} passed with no collection run. Nothing was observed on ${openGaps.length === 1 ? "that day" : "those days"} and nothing may be inferred for ${openGaps.length === 1 ? "it" : "them"} — acknowledging a gap records that you have seen it, and never creates or backfills a price. Acknowledge one with <code>node scripts/acknowledge-collection-gap.mjs --slot &lt;scheduled_for&gt;</code>, which appends a record of who accepted it and when. The ledger is append-only, so acknowledgement is added rather than toggled.</p></div>`
    : `<div class="notice info"><strong>No open gaps</strong><p>${ledger.missed_slots.length ? `Every recorded gap has been acknowledged. ${ledger.missed_slots.length} unobserved slot${ledger.missed_slots.length === 1 ? " remains a gap" : "s remain gaps"} in the data — acknowledgement records review, it never fills them.` : "Every scheduled slot since the first recorded run has been served."}</p></div>`
}

<h2>Scheduled days with no run</h2>
<table><thead><tr><th>Scheduled for</th><th>State</th><th>Detected</th><th>Review</th></tr></thead><tbody>${gapRows}</tbody></table>

<h2>Retailer reachability</h2>
<table><thead><tr><th>Retailer</th><th class="num">Targets</th><th class="num">Live observations</th><th>Last collected</th><th>Status</th></tr></thead><tbody>${sellerRows}</tbody></table>
${
  blocked.length
    ? `<div class="notice"><strong>Refusing the collector</strong><p>The most recent run saw ${blocked.map(([k, v]) => `${v}× ${k}`).join(", ")}. Overclockers UK and CCL Online return 403 to automated requests even though their robots.txt permits us, so this is bot protection rather than a crawl rule. No attempt is made to work around it. Affiliate programme membership is the legitimate route to those two.</p></div>`
    : ""
}

<h2>Recent runs</h2>
<table><thead><tr><th>Started</th><th class="num">Attempted</th><th class="num">Retained</th><th class="num">Abstained</th><th>Reasons</th><th>Source</th></tr></thead><tbody>${runRows}</tbody></table>

<footer>Private operations artefact generated ${new Date().toISOString().slice(0, 10)}. Regenerate with <code>node scripts/render-collection-health-report.mjs</code>, or check from the terminal with <code>ops/install-collector.sh status</code>. Runs marked <em>reconstructed</em> were performed by an orchestrated session before the scheduled collector existed, and their attempt counts reflect retained observations only. No source, methodology or publication is approved.</footer>
</div></body></html>`;

const target = new URL("research/reports/collection-health.html", repo);
writeFileSync(target, html);
process.stdout.write(`wrote ${target.pathname}\n`);
process.stdout.write(`runs ${ledger.runs.length} · gaps ${ledger.missed_slots.length} (${openGaps.length} open) · targets ${registry.target_count}\n`);
