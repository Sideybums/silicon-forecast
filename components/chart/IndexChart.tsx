import type { IndexDataset } from "@/lib/public-data";
import { formatIndex, formatPermilleRatio } from "@/lib/public-data";
import { ChartCaveat } from "./ChartCaveat";
import { EventLine } from "./EventLine";
import type { EventsDataset } from "@/lib/public-data";
import { VIEWBOX, bounds, contiguousRuns, edgeAnchor, niceTicks, path, permilleAcross, plotArea, xFor, yFor } from "./geometry";

// The headline chart. A server component: everything renders at build time, and
// the hover behaviour is CSS, so nothing here depends on JavaScript running.

export function IndexChart({
  dataset,
  events,
  title,
  describedBy = "index-chart-desc",
}: {
  dataset: IndexDataset;
  events: EventsDataset | null;
  title: string;
  describedBy?: string;
}) {
  const periods = dataset.periods;
  const values = periods.map((p) => p.index_milli);
  const { min, max } = bounds(values);
  const area = plotArea();
  const runs = contiguousRuns(values);
  const ticks = niceTicks(min / 1000, max / 1000, 4).map((t) => t * 1000);

  const pointAt = (i: number) => ({ x: xFor(i, periods.length, area), y: yFor(values[i] as number, min, max, area) });

  return (
    <figure className="index-chart-figure">
      <div className="index-chart-shell">
        <svg
          className="index-chart"
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          role="img"
          aria-labelledby={`${describedBy}-title ${describedBy}`}
          preserveAspectRatio="none"
        >
          <title id={`${describedBy}-title`}>{title}</title>
          <desc id={describedBy}>
            {`Index level by quarter from ${dataset.coverage.first_period} to ${dataset.coverage.last_period}, with ${dataset.parameters_public.reference_period} set to ${dataset.parameters_public.reference_value}. The line stops where too few products carry across between quarters.`}
          </desc>

          <g className="index-chart-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <line key={tick} x1={area.left} x2={area.right} y1={yFor(tick, min, max, area)} y2={yFor(tick, min, max, area)} />
            ))}
          </g>

          {/* The reference level, so the base is readable at a glance. */}
          <line
            className="index-chart-baseline"
            x1={area.left}
            x2={area.right}
            y1={yFor(dataset.parameters_public.reference_value * 1000, min, max, area)}
            y2={yFor(dataset.parameters_public.reference_value * 1000, min, max, area)}
            aria-hidden="true"
          />

          <g className="index-chart-axis" aria-hidden="true">
            {ticks.map((tick) => (
              <text key={tick} x={area.left - 14} y={yFor(tick, min, max, area) + 6} textAnchor="end">
                {Math.round(tick / 1000)}
              </text>
            ))}
          </g>

          {runs.map((run) => (
            <path key={run[0]} className="index-chart-line" d={path(run.map(pointAt))} />
          ))}

          {runs.flat().map((i) => (
            <circle
              key={periods[i].period_id}
              className={`index-chart-point${periods[i].is_reference ? " is-reference" : ""}`}
              cx={xFor(i, periods.length, area)}
              cy={yFor(values[i] as number, min, max, area)}
              r={7}
            />
          ))}

          <g className="index-chart-axis index-chart-axis-x" aria-hidden="true">
            {periods.map((p, i) =>
              i % 2 === 0 || i === periods.length - 1 ? (
                <text key={p.period_id} x={xFor(i, periods.length, area)} y={area.bottom + 34} textAnchor="middle">
                  {p.period_id}
                </text>
              ) : null,
            )}
          </g>
        </svg>

        {/* Periods with no value are named rather than left as blank space, so a
            reader can see the line stopped because evidence ran out. */}
        <ul className="index-chart-gaps" aria-label="Quarters with too little matched evidence">
          {periods.map((p, i) =>
            p.index_milli === null ? (
              <li
                key={p.period_id}
                style={{ ["--x" as string]: permilleAcross(i, periods.length), ["--anchor" as string]: edgeAnchor(i, periods.length) }}
              >
                <span>
                  {p.period_id}: {p.state === "no_observations"
                    ? "no retained observation"
                    : p.state === "outside_stopped_chain"
                      ? "outside the stopped private candidate chain"
                      : `only ${p.matched_product_count ?? 0} product${p.matched_product_count === 1 ? "" : "s"} carried across`}
                </span>
              </li>
            ) : null,
          )}
        </ul>

        {events ? <EventLine events={events} periods={periods.map((p) => p.period_id)} /> : null}
      </div>

      <figcaption className="index-chart-caption">
        <ol className="index-chart-legend">
          <li className="legend-line">Index level, {dataset.parameters_public.reference_period} = {dataset.parameters_public.reference_value}</li>
          <li className="legend-gap">Quarter with too little matched evidence</li>
        </ol>
        <ChartCaveat dataset={dataset} />
      </figcaption>
    </figure>
  );
}

/** The headline reading: level, direction and the span it covers. */
export function IndexHeadline({ dataset }: { dataset: IndexDataset }) {
  const s = dataset.summary;
  const trough = dataset.periods
    .filter((p) => p.index_milli !== null)
    .reduce((a, p) => ((p.index_milli as number) < (a.index_milli as number) ? p : a));
  return (
    <div className="index-headline">
      <div>
        <span>Latest · {s.latest_period}</span>
        <strong>{formatIndex(s.latest_index_milli)}</strong>
        <em>
          {dataset.parameters_public.reference_period} = {dataset.parameters_public.reference_value}
        </em>
      </div>
      <div>
        <span>Against the reference quarter</span>
        <strong className={s.direction === "higher" ? "is-higher" : s.direction === "lower" ? "is-lower" : ""}>
          {formatPermilleRatio(s.change_from_reference_permille === null ? null : s.change_from_reference_permille + 1000)}
        </strong>
        <em>prices are {s.direction}</em>
      </div>
      <div>
        <span>Against the cheapest quarter</span>
        <strong>
          {formatPermilleRatio(
            s.latest_index_milli === null ? null : Math.round(((s.latest_index_milli as number) / (trough.index_milli as number)) * 1000),
          )}
        </strong>
        <em>{trough.period_id} was the low</em>
      </div>
      <div>
        <span>Evidence</span>
        <strong>{dataset.coverage.observed_period_count}</strong>
        <em>
          quarters, {dataset.coverage.first_period} to {dataset.coverage.last_period}
        </em>
      </div>
    </div>
  );
}
