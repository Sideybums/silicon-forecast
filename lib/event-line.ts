export type PublicEventLineMarker = {
  event_id: string;
  headline: string;
  publisher: string;
  author: string | null;
  source_url: string;
  publication_date: string;
  event_date: string;
  interpretation: string;
  uncertainty: string;
  counter_evidence: string[];
  revision: number;
};

export type PublicEventLineDataset = {
  schema_version: 1;
  policy_id: "sf-public-event-line-v1";
  dataset_id: string;
  category_slug: string;
  status: "empty_pending_review" | "reviewed_markers_published";
  markers: PublicEventLineMarker[];
};

const PUBLIC_MARKER_KEYS = [
  "author", "counter_evidence", "event_date", "event_id", "headline", "interpretation",
  "publication_date", "publisher", "revision", "source_url", "uncertainty",
];

export function assertPublicEventLine(value: PublicEventLineDataset): PublicEventLineDataset {
  if (value.policy_id !== "sf-public-event-line-v1" || value.category_slug !== "ram") throw new Error("Event Line identity drifted");
  if (value.status === "empty_pending_review" && value.markers.length !== 0) throw new Error("empty Event Line contains markers");
  if (value.status === "reviewed_markers_published" && value.markers.length === 0) throw new Error("published Event Line contains no markers");
  for (const marker of value.markers) {
    if (JSON.stringify(Object.keys(marker).sort()) !== JSON.stringify(PUBLIC_MARKER_KEYS)) throw new Error(`Event Line marker ${marker.event_id} has private or unknown fields`);
    if (!marker.source_url.startsWith("https://") || !marker.headline || !marker.publisher || marker.author === "" || !marker.interpretation || !marker.uncertainty || !marker.counter_evidence.length) throw new Error(`Event Line marker ${marker.event_id} is incomplete`);
  }
  return value;
}
