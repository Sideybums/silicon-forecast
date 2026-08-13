// The component categories the site covers, and which of them have data.
//
// `dataset` is the whole point. An entry with a dataset renders charts,
// per-product pages and an event line; an entry without one renders a plain
// statement that nothing has been collected. Adding GPU coverage later means
// generating index-gpu.v1.json and setting dataset here — every page maps over
// this registry, so nothing is hardcoded to RAM and no new component is needed.
//
// It supersedes the `categories` array that used to live in lib/site.ts.

export type ComponentEntry = {
  slug: string;
  shortName: string;
  name: string;
  summary: string;
  detail: string;
  considerations: readonly string[];
  /** Key into the public projection, or null when nothing has been collected. */
  dataset: string | null;
  /** What we track, stated plainly enough for a reader to know what is excluded. */
  scopeNote: string;
};

export const components: readonly ComponentEntry[] = [
  {
    slug: "ram",
    shortName: "RAM",
    name: "Memory (RAM)",
    summary: "Capacity, DDR generation, kit configuration and speed.",
    detail:
      "Coverage is narrow on purpose: 32GB (2×16GB) DDR5 desktop memory kits sold from retailer-owned UK stock. Every price is matched to an exact manufacturer part number, so a change in the number reflects a change in prices rather than a change in which products happened to be on sale.",
    considerations: [
      "Capacity and module count must match exactly",
      "Desktop UDIMM and laptop SO-DIMM products are kept separate",
      "Speed, timings, model and manufacturer identifiers matter",
      "Coverage limits stay visible rather than being filled with estimates",
    ],
    dataset: "ram",
    scopeNote: "32GB (2×16GB) DDR5 desktop kits, UK retailer-owned stock",
  },
  {
    slug: "gpu",
    shortName: "GPUs",
    name: "Graphics cards",
    summary: "GPU model, VRAM and board-partner variants.",
    detail:
      "Nothing has been collected. Graphics cards need reference models, board-partner variants, memory capacities and seller condition separated before any comparison means anything.",
    considerations: [
      "GPU model and VRAM capacity",
      "Board-partner and cooler variants",
      "New retail stock only",
      "Bundles and seller-of-record ambiguity need separate treatment",
    ],
    dataset: null,
    scopeNote: "Not yet collecting",
  },
  {
    slug: "cpu",
    shortName: "CPUs",
    name: "Processors",
    summary: "Desktop processor families, sockets and package types.",
    detail:
      "Nothing has been collected. A reliable comparison has to distinguish generations, sockets, boxed and tray products, and anything bundled with a cooler.",
    considerations: [
      "Manufacturer, family and exact model",
      "Socket and generation",
      "Retail boxed and tray products",
      "Bundles and included coolers",
    ],
    dataset: null,
    scopeNote: "Not yet collecting",
  },
  {
    slug: "ssd",
    shortName: "SSDs",
    name: "Solid-state drives",
    summary: "Capacity, interface, form factor and endurance class.",
    detail:
      "Nothing has been collected. Capacity alone is not enough: interface, form factor, controller revisions and endurance can materially change what looks like the same drive.",
    considerations: [
      "Usable capacity and product family",
      "NVMe or SATA interface",
      "M.2 or 2.5-inch form factor",
      "Hardware revisions and bundled heatsinks",
    ],
    dataset: null,
    scopeNote: "Not yet collecting",
  },
] as const;

export function componentFor(slug: string): ComponentEntry | undefined {
  return components.find((entry) => entry.slug === slug);
}

export const trackedComponents = components.filter((entry) => entry.dataset !== null);
