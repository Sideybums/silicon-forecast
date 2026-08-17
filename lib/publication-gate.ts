// Fail-closed publication boundary for the recovery branch.
//
// Repository JSON cannot constitute an independently authenticated publication
// approval. Until a protected, externally verified approval mechanism is
// designed and explicitly approved, no configuration, environment variable,
// review file or generated artefact may open the public numerical series.

export type GateDecision = {
  isPublic: boolean;
  reason: string;
};

type GateOptions = {
  configPath?: string;
  reviewsDir?: string;
  manifestPath?: string;
  env?: string | undefined;
};

export function publicationGate(options: GateOptions = {}): GateDecision {
  void options;
  return {
    isPublic: false,
    reason: "publication activation is not implemented; repository data cannot authenticate approval",
  };
}

export function seriesIsPublic(options: GateOptions = {}): boolean {
  return publicationGate(options).isPublic;
}
