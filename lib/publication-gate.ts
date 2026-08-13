// Whether the real price series may render on the public site.
//
// This is deliberately not an environment variable. An env-var gate fails
// *open* when CI is misconfigured, and failing open is the one failure mode
// that matters here — it would publish retailer-derived figures that no
// approval covers. So the gate is a committed record that must name a signed
// approval, every step is a positive check, and every error path returns false.
//
// The environment variable exists only as a second lever in the closing
// direction. It can force the gate shut; it can never open it.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());

export type GateDecision = {
  isPublic: boolean;
  reason: string;
};

type GateOptions = {
  configPath?: string;
  reviewsDir?: string;
  env?: string | undefined;
};

/**
 * Resolves the gate, explaining itself either way.
 *
 * The reason travels with the decision so a closed gate can be diagnosed
 * without guessing which of the conditions failed.
 */
export function publicationGate(options: GateOptions = {}): GateDecision {
  const configPath = options.configPath ?? path.join(repoRoot, "config/public-release.v1.json");
  const reviewsDir = options.reviewsDir ?? path.join(repoRoot, "data/reviews");
  const env = "env" in options ? options.env : process.env.SF_PUBLIC_SERIES;

  if (env === "withheld") {
    return { isPublic: false, reason: "SF_PUBLIC_SERIES is set to withheld" };
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  } catch {
    // A missing or unparsable config is not a reason to publish.
    return { isPublic: false, reason: "release config is missing or unreadable" };
  }

  if (config.public_series_release !== "approved") {
    return { isPublic: false, reason: `public_series_release is ${String(config.public_series_release)}` };
  }

  const approvalRef = config.approval_ref;
  if (typeof approvalRef !== "string" || approvalRef.trim() === "") {
    return { isPublic: false, reason: "public_series_release is approved but names no approval record" };
  }

  // The named approval must actually exist and carry a human decision. An
  // approved flag pointing at nothing is how a gate becomes decorative.
  try {
    for (const file of readdirSync(reviewsDir)) {
      if (!file.endsWith(".json")) continue;
      const record = JSON.parse(readFileSync(path.join(reviewsDir, file), "utf8")) as Record<string, unknown>;
      if (record.review_id !== approvalRef) continue;
      const decidedBy = typeof record.decided_by === "string" ? record.decided_by.trim() : "";
      const decidedAt = typeof record.decided_at === "string" ? record.decided_at.trim() : "";
      if (!decidedBy || !decidedAt) {
        return { isPublic: false, reason: "the named approval record carries no decision" };
      }
      return { isPublic: true, reason: `approved by ${decidedBy}` };
    }
  } catch {
    return { isPublic: false, reason: "approval records could not be read" };
  }

  return { isPublic: false, reason: "the named approval record does not exist" };
}

export function seriesIsPublic(options: GateOptions = {}): boolean {
  return publicationGate(options).isPublic;
}
