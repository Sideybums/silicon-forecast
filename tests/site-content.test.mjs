import assert from "node:assert/strict"; import {readFileSync,globSync} from "node:fs"; import test from "node:test";
const source = globSync(["app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts"])
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
test("affiliate verification is network-neutral and honest",()=>{
  assert.match(source,/affiliate-network-verification/);
  for(const network of ["Awin","Webgains","CJ Affiliate"]){assert.match(source,new RegExp(network));}
  assert.match(source,/multiple affiliate networks/i);
  assert.doesNotMatch(source,/<h2>Awin status<\/h2>/);
  assert.doesNotMatch(source,/Affiliate partnerships provided through/i);
});
test("public research preview shows bounded dated prices without pretending they are a live index",()=>{
  const home=readFileSync("app/page.tsx","utf8");
  const priceHistory=readFileSync("app/price-history/page.tsx","utf8")+readFileSync("components/ObservedPriceBoard.tsx","utf8");
  const disclosure=readFileSync("app/affiliate-disclosure/page.tsx","utf8");
  assert.match(home,/Public research preview/);
  assert.match(home,/Observed prices/);
  assert.match(priceHistory,/Dated marketplace observations/);
  assert.match(priceHistory,/not current-price claims/i);
  assert.match(priceHistory,/or\s+the UK retail index/i);
  assert.match(priceHistory,/Unpaid source link/);
  assert.match(disclosure,/unpaid, untracked source links/i);
  assert.doesNotMatch(home,/View the example chart|Published prices<\/dt><dd>None yet/);
  assert.doesNotMatch(priceHistory,/Demonstration only|All chart values are synthetic/);
});
test("price channels are separated without weakening the headline index",()=>{
  const priceHistory=readFileSync("app/price-history/page.tsx","utf8")+readFileSync("components/ObservedPriceBoard.tsx","utf8");
  assert.match(priceHistory,/Marketplace · Asking prices/);
  assert.match(priceHistory,/Primary retail index/);
  assert.match(priceHistory,/Marketplace asking prices never enter the primary-retail index/);
  assert.match(priceHistory,/Professional third-party seller/);
  assert.match(priceHistory,/Observation time/);
  assert.match(priceHistory,/VAT and delivery/);
});
test("research notes explain evidence-first context for future index movements",()=>{
  const research=readFileSync("app/research/page.tsx","utf8");
  assert.match(research,/Research and market notes/);
  assert.match(research,/movement first, explanation second/i);
  assert.match(research,/does not prove causation/i);
  assert.match(research,/supporting\s+and\s+contradictory evidence/i);
  assert.match(research,/Marketplace scarcity is not the retail index/);
});
test("required publisher routes exist",()=>{for(const route of ["about","contact","privacy","affiliate-disclosure","price-history","research"]){assert.ok(readFileSync(`app/${route}/page.tsx`,`utf8`).length>300)}});
test("project email is operational",()=>{
  const contact=readFileSync("app/contact/page.tsx","utf8");
  assert.match(contact,/active project address/i);
  assert.doesNotMatch(contact,/will become active|must be purchased|non-working contact route/i);
});
test("no tracking package",()=>assert.doesNotMatch(readFileSync("package.json","utf8"),/google-analytics|gtag|plausible|posthog|segment|facebook-pixel/i));
test("Cloudflare deploys the static export without OpenNext",()=>{
  const config=readFileSync("wrangler.jsonc","utf8");
  assert.match(config,/"directory"\s*:\s*"\.\/out"/);
  assert.doesNotMatch(config,/opennext/i);
  assert.match(config,/"pattern"\s*:\s*"siliconforecast\.com"/);
  assert.match(config,/"pattern"\s*:\s*"www\.siliconforecast\.com"/);
  assert.match(config,/"custom_domain"\s*:\s*true/);
  const pkg=JSON.parse(readFileSync("package.json","utf8"));
  assert.equal(pkg.scripts.deploy,"wrangler deploy");
});
