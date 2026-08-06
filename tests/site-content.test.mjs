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
test("demonstration cannot be mistaken for live data",()=>{assert.match(source,/Every value above is synthetic/);assert.match(source,/No live prices/i);assert.match(source,/does not yet compare current retailer offers/i)});
test("required publisher routes exist",()=>{for(const route of ["about","contact","privacy","affiliate-disclosure","price-history"]){assert.ok(readFileSync(`app/${route}/page.tsx`,`utf8`).length>300)}});
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
