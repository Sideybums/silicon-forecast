import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const install = readFileSync(new URL("../ops/install-collector.sh", import.meta.url), "utf8");
const plist = readFileSync(new URL("../ops/uk.co.siliconforecast.collector.plist", import.meta.url), "utf8");
const runner = readFileSync(new URL("../scripts/run-canonical-collector.mjs", import.meta.url), "utf8");

test("launchd is bound to an explicit dedicated main checkout and overlap lock", () => {
  assert.match(plist, /SF_COLLECTOR_CHECKOUT/u);
  assert.match(plist, /SF_COLLECTOR_BRANCH[\s\S]*<string>main<\/string>/u);
  assert.match(plist, /SF_COLLECTOR_LOCK/u);
  assert.match(install, /collector checkout must be an absolute path/u);
  assert.match(install, /collector checkout must be on main/u);
  assert.match(install, /collector checkout must be clean/u);
  assert.match(install, /must exactly match its cached origin\/main/u);
  assert.match(install, /render_plist "\$REPO\/ops\/\$LABEL\.plist"/u);
  assert.match(install, /plutil -lint "\$TEMP_PLIST"/u);
  assert.ok(install.indexOf("launchctl bootstrap \"gui/$(id -u)\" \"$TARGET\"") < install.indexOf("mv \"$TEMP_REPO_FILE\" \"$REPO_FILE\""));
  assert.match(install, /ROLLBACK_NEEDED=true/u);
  assert.match(install, /RunAtLoad is false; installation performed no collection/u);
});

test("repository preflight occurs before any retailer collection", () => {
  const preflight = runner.indexOf("synchroniseCollectorCheckout(repoPath");
  const collect = runner.indexOf("await runCollection(");
  assert.ok(preflight >= 0 && collect > preflight);
  assert.match(runner, /PUSH FAILED; evidence retained in local commit/u);
  assert.match(runner, /writeGlobalIntegrationAudit/u);
});
