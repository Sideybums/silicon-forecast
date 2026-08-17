// Chart geometry. Pure functions, integers only, no JSX.
//
// Every coordinate this module produces is an integer, and that is a safety
// property rather than a stylistic one. A retained retailer price rendered to
// two decimal places is a banned substring anywhere in public output, and
// several of those banned values are round numbers of exactly the kind a chart
// generator emits for gridlines and axis positions. Working in an integer user
// space means a geometry string cannot contain a decimal point at all, so the
// collision is impossible rather than merely unlikely.
//
// (This comment deliberately describes those values rather than listing them:
// an earlier draft spelled them out and tripped the very check it was
// explaining, because the scanner reads this file too.)
//
// The viewBox is large so that integer rounding is visually irrelevant: at
// 1440 units wide, a rounded coordinate is well under a tenth of a pixel on a
// typical render.

export const VIEWBOX = { width: 1440, height: 560 } as const;

export type Padding = { top: number; right: number; bottom: number; left: number };
export type ViewBox = { width: number; height: number };

export const PADDING: Padding = { top: 32, right: 28, bottom: 64, left: 92 };

export type Point = { x: number; y: number };

export function plotArea(viewBox: ViewBox = VIEWBOX, padding: Padding = PADDING) {
  return {
    left: padding.left,
    right: viewBox.width - padding.right,
    top: padding.top,
    bottom: viewBox.height - padding.bottom,
    width: viewBox.width - padding.left - padding.right,
    height: viewBox.height - padding.top - padding.bottom,
  };
}

/** Horizontal position of the i-th of count evenly spaced slots. */
export function xFor(index: number, count: number, area = plotArea()): number {
  if (count <= 1) return Math.round(area.left + area.width / 2);
  return Math.round(area.left + (index / (count - 1)) * area.width);
}

/** Vertical position of a value within [min, max], inverted for screen space. */
export function yFor(value: number, min: number, max: number, area = plotArea()): number {
  if (max === min) return Math.round(area.top + area.height / 2);
  const t = (value - min) / (max - min);
  return Math.round(area.bottom - t * area.height);
}

/**
 * Groups indices into runs of consecutive values that actually have data.
 *
 * A period with too little matched evidence carries no value at all, and the
 * derivation goes out of its way to keep it that way. Drawing one continuous
 * line across such a period would undo in pixels what the data was careful to
 * preserve, so gaps break the line into separate runs and the caller renders
 * the space between them as an explicit absence.
 */
export function contiguousRuns(values: readonly (number | null)[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (const [i, value] of values.entries()) {
    if (value === null || value === undefined) {
      if (current.length) runs.push(current);
      current = [];
    } else {
      current.push(i);
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

/**
 * Groups dated monthly points without joining across an unobserved month.
 * The input may be sparse; adjacency in the array is not evidence of adjacency
 * in time.
 */
export function calendarMonthRuns(
  points: readonly { month: string; value: number | null }[],
): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  let previousMonth: string | null = null;
  for (const [i, point] of points.entries()) {
    const adjacent = previousMonth !== null && monthOffset(point.month, previousMonth) === 1;
    if (point.value === null || (!adjacent && current.length)) {
      if (current.length) runs.push(current);
      current = [];
    }
    if (point.value !== null) current.push(i);
    previousMonth = point.month;
  }
  if (current.length) runs.push(current);
  return runs;
}

/** SVG polyline `points`. Integers only, so the output holds no decimal point. */
export function polyline(points: readonly Point[]): string {
  return points.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ");
}

/** SVG path `d` for a run. Integers only. */
export function path(points: readonly Point[]): string {
  if (!points.length) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${Math.round(p.x)} ${Math.round(p.y)}`)
    .join(" ");
}

/**
 * Round tick values spanning the data.
 *
 * Ticks are whole numbers in the value's own units, so an axis label is never a
 * two-decimal string. The step is chosen from a 1/2/5 progression so labels
 * land on values a reader recognises.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [Math.round(min)];
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? 10 * magnitude;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

/**
 * Padded value bounds, so the line never touches the top or bottom edge.
 *
 * Returned as integers because they seed tick values and y positions.
 */
export function bounds(values: readonly (number | null)[], headroom = 0.12): { min: number; max: number } {
  const present = values.filter((v): v is number => typeof v === "number");
  if (!present.length) return { min: 0, max: 1 };
  const lo = Math.min(...present);
  const hi = Math.max(...present);
  const pad = Math.max((hi - lo) * headroom, 1);
  return { min: Math.round(Math.max(0, lo - pad)), max: Math.round(hi + pad) };
}

/**
 * Horizontal position as integer permille, for HTML overlays.
 *
 * CSS percentages are the other place a decimal could appear in public output.
 * An event marker at 12.30% would serialise that decimal into the HTML, so
 * positions travel as an integer and the stylesheet divides.
 */
export function permilleAcross(index: number, count: number): number {
  if (count <= 1) return 500;
  return Math.round((index / (count - 1)) * 1000);
}

/** Months from `first` to `month`, both `YYYY-MM`. Negative if earlier. */
export function monthOffset(month: string, first: string): number {
  const [year, index] = month.split("-").map(Number);
  const [firstYear, firstIndex] = first.split("-").map(Number);
  return (year - firstYear) * 12 + (index - firstIndex);
}

/** Count of months from `first` to `last` inclusive. */
export function monthSpan(first: string, last: string): number {
  return monthOffset(last, first) + 1;
}

/**
 * How far a label sitting at a slot should be pulled back over its own width.
 *
 * A label centred on the first or last slot hangs half its width off the end of
 * the chart, which at a phone width pushes the whole page sideways. The first
 * slot's label is left-aligned to the point, the last is right-aligned, and
 * everything between stays centred. It is expressed as a percentage the
 * stylesheet negates, so like every other overlay position it serialises as an
 * integer.
 */
export function edgeAnchor(index: number, count: number): number {
  if (index === 0) return 0;
  if (index === count - 1) return 100;
  return 50;
}
