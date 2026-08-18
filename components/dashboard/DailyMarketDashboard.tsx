"use client";

import Link from "next/link";
import { useState } from "react";
import {
  calendarDayDistance,
  contiguousMonthlySegments,
  contiguousSegments,
  monthlyAveragePoints,
  pointsForRange,
  previousCalendarDayChangePermille,
  type DailyMarketDataset,
  type DailyMarketPoint,
  type DailyMarketRange,
  type MonthlyMarketPoint,
} from "@/lib/daily-market";
import type { PublicEventLineDataset } from "@/lib/event-line";

const RANGES: DailyMarketRange[] = ["7D", "30D", "3M", "1Y", "ALL"];
const WIDTH = 1000;
const HEIGHT = 410;
const MARGIN = { top: 36, right: 28, bottom: 54, left: 84 };

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value / 100);
}

function formatDate(value: string, short = false): string {
  return new Intl.DateTimeFormat("en-GB", short
    ? { day: "numeric", month: "short", timeZone: "UTC" }
    : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

function formatMonth(value: string, short = false): string {
  return new Intl.DateTimeFormat("en-GB", short
    ? { month: "short", year: "2-digit", timeZone: "UTC" }
    : { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}-15T12:00:00Z`));
}

type MarketChartPoint = DailyMarketPoint | MonthlyMarketPoint;
const isMonthlyPoint = (point: MarketChartPoint): point is MonthlyMarketPoint => "month" in point;

function changeLabel(value: number | null): { text: string; className: string } {
  if (value === null) return { text: "No comparable preceding day", className: "is-neutral" };
  const percentage = value / 10;
  if (value === 0) return { text: "No change vs previous day", className: "is-neutral" };
  return {
    text: `${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}% vs previous day`,
    className: value > 0 ? "is-higher" : "is-lower",
  };
}

function MarketChart({
  dataset,
  points,
  monthly,
  selected,
  onSelect,
}: {
  dataset: DailyMarketDataset;
  points: MarketChartPoint[];
  monthly: boolean;
  selected: MarketChartPoint;
  onSelect: (date: string) => void;
}) {
  const rangeStart = points[0].date;
  const rangeEnd = dataset.latest_date;
  const xSpan = Math.max(1, calendarDayDistance(rangeStart, rangeEnd));
  const prices = points.flatMap((point) => isMonthlyPoint(point) ? [point.typical_minor] : [point.low_minor, point.high_minor]);
  const rawLow = Math.min(...prices);
  const rawHigh = Math.max(...prices);
  const pad = Math.max(500, Math.round((rawHigh - rawLow) * 0.08));
  const yLow = Math.max(0, rawLow - pad);
  const yHigh = rawHigh + pad;
  const ySpan = Math.max(1, yHigh - yLow);
  const x = (date: string) => MARGIN.left + (calendarDayDistance(rangeStart, date) / xSpan) * (WIDTH - MARGIN.left - MARGIN.right);
  const y = (price: number) => HEIGHT - MARGIN.bottom - ((price - yLow) / ySpan) * (HEIGHT - MARGIN.top - MARGIN.bottom);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const firstDirect = dataset.points.find((point) => point.capture_basis === "direct" || point.capture_basis === "mixed");
  const directVisible = !monthly && firstDirect && firstDirect.date >= rangeStart && firstDirect.date <= rangeEnd ? firstDirect : null;
  const segments = monthly
    ? contiguousMonthlySegments(points as MonthlyMarketPoint[])
    : contiguousSegments(points as DailyMarketPoint[]);

  return (
    <div className="daily-market-chart-wrap">
      <svg className="daily-market-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="daily-market-chart-title daily-market-chart-desc">
        <title id="daily-market-chart-title">{monthly ? "Monthly average RAM observed price" : "Daily RAM observed-price range"}</title>
        <desc id="daily-market-chart-desc">{monthly ? "One rounded arithmetic average of the daily typical observed prices in each month. Lines stop across months with no observation." : "Typical retained observed RAM price with low-to-high whiskers. Lines stop across calendar days with no observation."}</desc>
        {yTicks.map((tick) => {
          const price = yLow + ySpan * tick;
          const cy = y(price);
          return <g key={tick}><line className="daily-chart-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={cy} y2={cy} /><text className="daily-chart-axis" x={MARGIN.left - 12} y={cy + 4} textAnchor="end">£{Math.round(price / 100)}</text></g>;
        })}
        {directVisible ? <g className="daily-collection-start"><line x1={x(directVisible.date)} x2={x(directVisible.date)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} /><text x={Math.min(WIDTH - 190, x(directVisible.date) + 8)} y={MARGIN.top + 14}>Daily collection began here</text></g> : null}
        {monthly ? null : (points as DailyMarketPoint[]).map((point) => <line key={`range-${point.date}`} className="daily-price-whisker" x1={x(point.date)} x2={x(point.date)} y1={y(point.low_minor)} y2={y(point.high_minor)} />)}
        {segments.filter((segment) => segment.length > 1).map((segment) => (
          <path key={segment[0].date} className="daily-typical-line" d={segment.map((point, index) => `${index ? "L" : "M"}${Math.round(x(point.date))} ${Math.round(y(point.typical_minor))}`).join(" ")} />
        ))}
        {points.map((point) => {
          const label = isMonthlyPoint(point)
            ? `${formatMonth(point.month)}: average daily typical observed price ${formatMoney(point.typical_minor)} from ${point.daily_point_count} observed ${point.daily_point_count === 1 ? "day" : "days"}`
            : `${formatDate(point.date)}: typical ${formatMoney(point.typical_minor)}, retained low ${formatMoney(point.low_minor)}, retained high ${formatMoney(point.high_minor)}`;
          return <circle
            key={point.date}
            className={`daily-typical-point${selected.date === point.date ? " is-selected" : ""}`}
            cx={x(point.date)}
            cy={y(point.typical_minor)}
            r={selected.date === point.date ? 8 : 6}
            role="button"
            tabIndex={0}
            aria-label={label}
            onMouseEnter={() => onSelect(point.date)}
            onFocus={() => onSelect(point.date)}
            onClick={() => onSelect(point.date)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(point.date);
              }
            }}
          ><title>{label}</title></circle>;
        })}
        <text className="daily-chart-axis" x={MARGIN.left} y={HEIGHT - 20} textAnchor="start">{monthly ? formatMonth((points[0] as MonthlyMarketPoint).month, true) : formatDate(rangeStart, true)}</text>
        <text className="daily-chart-axis" x={WIDTH - MARGIN.right} y={HEIGHT - 20} textAnchor="end">{monthly ? formatMonth((points.at(-1) as MonthlyMarketPoint).month, true) : formatDate(rangeEnd, true)}</text>
      </svg>
    </div>
  );
}

function EvidenceList({ label, point, side }: { label: string; point: DailyMarketPoint; side: "low" | "high" }) {
  const evidence = side === "low" ? point.low_evidence : point.high_evidence;
  const price = side === "low" ? point.low_minor : point.high_minor;
  return (
    <div className="daily-evidence-column">
      <span>{label}</span>
      <strong>{formatMoney(price)}</strong>
      <ul>{evidence.map((item) => <li key={item.public_observation_id}>
        <span>{item.retailer_name} · {item.mpn}</span>
        <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.observation_kind === "archived_retail_observation" ? "Open archived snapshot" : "Visit retailer"} ↗</a>
      </li>)}</ul>
    </div>
  );
}

export function DailyMarketDashboard({
  dataset,
  detailHref = "/price-history/ram/",
  eventLine = null,
  headingLevel = "h2",
  eyebrow = "Daily market snapshot · RAM",
}: {
  dataset: DailyMarketDataset;
  detailHref?: string;
  eventLine?: PublicEventLineDataset | null;
  headingLevel?: "h1" | "h2";
  eyebrow?: string;
}) {
  const [range, setRange] = useState<DailyMarketRange>("7D");
  const dailyVisible = pointsForRange(dataset, range);
  const monthly = range === "3M" || range === "1Y" || range === "ALL";
  const visible: MarketChartPoint[] = monthly ? monthlyAveragePoints(dailyVisible) : dailyVisible;
  const [selectedDate, setSelectedDate] = useState(dataset.latest_date);
  const selected = visible.find((point) => point.date === selectedDate) ?? visible.at(-1)!;
  const latest = dataset.points.at(-1)!;
  const change = changeLabel(previousCalendarDayChangePermille(dataset.points));
  const Heading = headingLevel;

  function chooseRange(nextRange: DailyMarketRange) {
    setRange(nextRange);
    const nextDailyPoints = pointsForRange(dataset, nextRange);
    const nextPoints = nextRange === "3M" || nextRange === "1Y" || nextRange === "ALL"
      ? monthlyAveragePoints(nextDailyPoints)
      : nextDailyPoints;
    setSelectedDate(nextPoints.at(-1)!.date);
  }

  return (
    <section className="daily-market-dashboard" aria-labelledby="daily-market-title">
      <div className="daily-market-heading">
        <div>
          <p className="section-label">{eyebrow}</p>
          <Heading id="daily-market-title">What are retained UK DDR5 prices doing?</Heading>
          <p>Typical price is the median of exact-product daily medians. Low and high are the extrema among retained qualifying observations—not the whole UK market. Direction appears only when the same exact products occur on adjacent calendar days.</p>
        </div>
        <div className="daily-market-latest">
          <span>Latest typical observed price</span>
          <strong>{formatMoney(latest.typical_minor)}</strong>
          <em className={change.className}>{change.text}</em>
        </div>
      </div>

      <fieldset className="daily-range-controls">
        <legend>Chart range</legend>
        {RANGES.map((item) => <button key={item} type="button" aria-pressed={range === item} onClick={() => chooseRange(item)}>{item === "ALL" ? "All" : item}</button>)}
      </fieldset>

      <div className="daily-market-plot-layout">
        <figure className="daily-market-figure">
          <MarketChart dataset={dataset} points={visible} monthly={monthly} selected={selected} onSelect={setSelectedDate} />
          <figcaption>{monthly ? <><span className="legend-typical">Monthly average of daily typical prices</span><span className="legend-gap">No line across unobserved months</span></> : <><span className="legend-typical">Typical retained price</span><span className="legend-range">Retained low–high range</span><span className="legend-gap">No line across missing days</span></>}</figcaption>
        </figure>
        <aside className="daily-selected-day" aria-live="polite">
          {isMonthlyPoint(selected) ? <>
            <p className="section-label">Selected month</p>
            <h3>{formatMonth(selected.month)}</h3>
            <dl>
              <div><dt>Average daily typical</dt><dd>{formatMoney(selected.typical_minor)}</dd></div>
              <div><dt>Observed daily points</dt><dd>{selected.daily_point_count}</dd></div>
              <div><dt>Exact products observed</dt><dd>{selected.product_count} / {selected.declared_product_count}</dd></div>
            </dl>
            <p className="monthly-average-note">This point is the rounded arithmetic average of the daily typical observed prices in the month. Months with no retained observation remain gaps.</p>
          </> : <>
            <p className="section-label">Selected day</p>
            <h3>{formatDate(selected.date)}</h3>
            <dl>
              <div><dt>Typical</dt><dd>{formatMoney(selected.typical_minor)}</dd></div>
              <div><dt>Exact products observed</dt><dd>{selected.product_count} / {selected.declared_product_count}</dd></div>
              <div><dt>Qualifying observations</dt><dd>{selected.observation_count}</dd></div>
              <div><dt>Retailers represented</dt><dd>{selected.retailer_count}</dd></div>
            </dl>
            <div className="daily-evidence-grid">
              <EvidenceList label="Retained low" point={selected} side="low" />
              <EvidenceList label="Retained high" point={selected} side="high" />
            </div>
          </>}
        </aside>
      </div>

      <div className="daily-coverage-strip">
        <div><span>Released product roster</span><strong>{dataset.declared_products.length} exact MPNs</strong><small>Coverage is measured against this roster, not the whole market.</small></div>
        <div><span>Latest retained day</span><strong>{formatDate(dataset.latest_date)}</strong><small>Static evidence timestamp; not a checkout guarantee.</small></div>
        <Link href={detailHref}>See products, prices and full evidence →</Link>
      </div>

      {eventLine?.markers.length ? (
        <div className="dashboard-event-line dashboard-event-line-published" aria-label="Reviewed industry event line">
          <div><p className="section-label">Event Line</p><strong>Reviewed industry chronology</strong></div>
          <ol>{eventLine.markers.map((marker) => <li key={marker.event_id}><time dateTime={marker.event_date}>{formatDate(marker.event_date)}</time><strong>{marker.headline}</strong><span>{marker.publisher} · {marker.author ?? "Author not listed"}</span><p>{marker.interpretation}</p><small>{marker.uncertainty}</small><div><span>Counter-evidence</span><ul>{marker.counter_evidence.map((item) => <li key={item}>{item}</li>)}</ul></div><a href={marker.source_url} target="_blank" rel="noopener noreferrer">Read cited source ↗</a></li>)}</ol>
          <Link href="/research/">How research is reviewed →</Link>
        </div>
      ) : (
        <div className="dashboard-event-line" aria-label="Reviewed industry event line">
          <div><p className="section-label">Event Line</p><strong>No reviewed market events published yet.</strong></div>
          <p>Industry reporting will appear here only after its exact citation and wording are reviewed. Placement will show chronology; no relationship to the price series is asserted.</p>
          <Link href="/research/">How research is reviewed →</Link>
        </div>
      )}
    </section>
  );
}
