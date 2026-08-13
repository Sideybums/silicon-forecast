import type { EventsDataset, EventMarker } from "@/lib/public-data";
import { permilleAcross } from "./geometry";

// The rail of news and research markers sitting under a chart.
//
// Every marker is a real anchor to the publisher, not a JavaScript popup with a
// link inside it. With CSS or JS unavailable this degrades to a plain list of
// attributed links, which is the correct failure mode for a feature whose whole
// purpose is to credit somebody else's work and send the reader to it.
//
// The wording is fixed template text and never generated. Placing a marker near
// a price movement is a statement about timing, and it must not be allowed to
// read as a statement about cause.
const TEMPORAL_NOTE =
  "Reported around this period. Temporal association only — this is not a claim that the article explains the move.";

function Marker({ marker, left }: { marker: EventMarker; left: number }) {
  const { source } = marker;
  return (
    <li className="event-marker" style={{ ["--x" as string]: left }}>
      <a className="event-marker-anchor" href={source.url} target="_blank" rel="nofollow noopener external">
        <span className="event-marker-dot" aria-hidden="true" />
        <span className="event-marker-label">{source.title}</span>
      </a>
      <div className="event-hover-card" role="note">
        <p className="event-hover-kicker">{marker.period_id}</p>
        <strong className="event-hover-title">{source.title}</strong>
        <p className="event-hover-byline">
          {source.author === "not_stated_by_publisher" ? "Author not stated by the publisher" : source.author}
          {" · "}
          {source.publisher}
          {" · "}
          {source.published_on}
        </p>
        <p className="event-hover-note">{TEMPORAL_NOTE}</p>
        <span className="event-hover-cta">Read the original at {source.publisher} →</span>
      </div>
    </li>
  );
}

export function EventLine({ events, periods }: { events: EventsDataset; periods: readonly string[] }) {
  const indexOf = (periodId: string | null) => (periodId === null ? -1 : periods.indexOf(periodId));

  return (
    <div className="event-line" aria-label="News and research related to this series">
      <ul className="event-line-rail">
        {events.markers.map((marker) => {
          const i = indexOf(marker.period_id);
          if (i < 0) return null;
          return <Marker key={marker.marker_id} marker={marker} left={permilleAcross(i, periods.length)} />;
        })}
      </ul>

      {/* The count that keeps an empty rail honest. A rail with no markers and
          no number implies there was nothing to explain; this says plainly that
          the research has not been done. */}
      <p className="event-line-status">
        {events.explained_movement_count === 0 ? (
          <>
            <strong>No reviewed explanation yet.</strong> {events.unexplained_movement_count} price movements have been
            measured and none has had its explanation researched. An absent marker means the work has not been done, not
            that nothing happened.
          </>
        ) : (
          <>
            <strong>{events.explained_movement_count} of {events.movement_count} movements</strong> have a reviewed
            explanation. The remaining {events.unexplained_movement_count} have no reviewed explanation.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * The same markers as a plain list, for a per-component page.
 *
 * Duplicating the attribution here is deliberate: a reader who never hovers
 * anything should still be able to find every source the site points at.
 */
export function EventList({ events }: { events: EventsDataset }) {
  if (!events.markers.length) {
    return (
      <p className="event-list-empty">
        No news or research has been reviewed against these movements yet. {events.unexplained_movement_count} measured
        movements are currently unexplained.
      </p>
    );
  }
  return (
    <ul className="event-list">
      {events.markers.map((m) => (
        <li key={m.marker_id}>
          <a href={m.source.url} target="_blank" rel="nofollow noopener external">
            {m.source.title}
          </a>
          <span className="event-list-byline">
            {m.source.author === "not_stated_by_publisher" ? "Author not stated" : m.source.author} · {m.source.publisher} ·{" "}
            {m.source.published_on}
          </span>
          <span className="event-list-note">{TEMPORAL_NOTE}</span>
        </li>
      ))}
    </ul>
  );
}
