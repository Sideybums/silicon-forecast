// Chart geometry. Pure functions, integers only, no JSX.
//
// Every coordinate this module produces is an integer, and that is a safety
// property rather than a stylistic one. A retained retailer price rendered to
// two decimals is a banned substring anywhere in public output, and the banned
// set currently includes 100.00, 200.00, 120.00 and 50.00 — exactly the values
// a chart generator emits for gridlines and axis positions. Working in an
// integer user space means a geometry string cannot contain a decimal point at
// all, so the collision is impossible rather than merely unlikely.
//
// The viewBox is large so that integer rounding is visually irrelevant: at
// 1440 units wide, a rounded coordinate is well under a tenth of a pixel on a
// typical render.

export const VIEWBOX = { width: 1440, height: 560 } as const;

export const PADDING = { top: 32, right: 28, bottom: 64, left: 92 } as const;

export type Point = { x: number; y: number };

export function plotArea(viewBox: { width: number; height: number } = VIEWBOX, padding = PADDING) {
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
