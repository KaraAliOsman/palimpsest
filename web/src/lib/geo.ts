// Geography: WGSRPD level-3 regions (TopoJSON), WCVP ranges and the herbal overview.
// Produced by scripts/geo_regions.py, geo_wcvp.py, geo_gbif.py and geo_insights.py; see data/derived/geo/index.json.
import { feature } from "topojson-client";
import { geoArea } from "d3-geo";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { load } from "./data";

export interface RegionProps { id: string; name: string; l2: number; l1: number; lon: number; lat: number; approx?: boolean; geom?: boolean }
export type Region = Feature<Geometry, RegionProps>;
export interface Regions {
  list: Region[]; byId: Map<string, Region>;
  /** Every unit, drawn or point-only (too small for Natural Earth admin-1). */
  info: Map<string, RegionProps>; points: RegionProps[];
  l1: Record<string, string>; l2: Record<string, string>;
}

type Topo = Topology<{ regions: GeometryCollection<RegionProps> }> & { levels: { l1: Record<string, string>; l2: Record<string, string> }; points?: RegionProps[] };

const cache = new Map<string, Promise<Regions>>();
/** "map" is the detailed file for flat maps; "globe" a coarser copy for the turning globe. */
export function loadRegions(kind: "map" | "globe" = "map"): Promise<Regions> {
  let regions = cache.get(kind);
  if (!regions) {
    regions = load<Topo>(kind === "globe" ? "derived/geo/regions-globe.topo.json" : "derived/geo/regions.topo.json").then((t) => {
      const fc = feature(t, t.objects.regions) as FeatureCollection<Geometry, RegionProps>;
      // d3-geo reads rings by spherical winding (clockwise = the inside). A ring wound the other way
      // would fill the rest of the globe, so any polygon larger than a hemisphere is turned round.
      const fix = (poly: Position[][]) => (geoArea({ type: "Polygon", coordinates: poly }) > 2 * Math.PI ? poly.map((r) => r.slice().reverse()) : poly);
      for (const f of fc.features) {
        const g = f.geometry;
        if (g.type === "Polygon") g.coordinates = fix(g.coordinates);
        else if (g.type === "MultiPolygon") g.coordinates = g.coordinates.map(fix);
      }
      const list = fc.features;
      const points = t.points ?? [];
      const info = new Map<string, RegionProps>([...list.map((f) => [f.properties.id, f.properties] as const), ...points.map((p) => [p.id, p] as const)]);
      return { list, byId: new Map(list.map((f) => [f.properties.id, f])), info, points, l1: t.levels.l1, l2: t.levels.l2 };
    });
    regions.catch(() => { cache.delete(kind); });
    cache.set(kind, regions);
  }
  return regions;
}

export interface TaxonRange {
  taxon: string; slug: string; rank: string;
  wcvp: { id: string; name: string; authors?: string; rank?: string; method: string; via?: string | null; powo?: string | null } | null;
  native: string[]; introduced: string[]; doubtful: string[]; extinct: string[];
  summary: string;
  gbif: { key?: number | null; cell_deg: number; total: number; cells: [number, number, number][] };
}
export const rangeFile = (slug: string) => `derived/geo/taxa/${encodeURIComponent(slug)}.json`;

export type Herbal = "dsc" | "cul" | "both";
export const HERBALS: Herbal[] = ["dsc", "cul", "both"];
export const HERBAL_LABEL: Record<Herbal, string> = { dsc: "Dioscorides", cul: "Culpeper", both: "Both herbals" };
export const HERBAL_OWNER: Record<Herbal, string> = { dsc: "Dioscorides’ plants", cul: "Culpeper’s plants", both: "plants in both herbals" };

export interface Insight {
  id: string; k: number; n: number; pct: number; text: string; definition: string;
  compare?: { label: string; k: number; n: number; pct: number }; examples?: string[]; absent?: number;
}
export interface Overview {
  generated: string;
  totals: Record<Herbal, number>;
  peak: Record<Herbal, { code: string; name: string; n: number }>;
  insights: Insight[];
  regions: Record<string, { c: [number, number, number]; top: [string[], string[], string[]] }>;
  plants: Record<string, [string, string | null]>;
  sources: { ranges: string; regions: string };
}

/** Classes of the share of a herbal's species native to a region; 0 is "none". */
export const SHARE_BREAKS = [0.05, 0.15, 0.3, 0.5];
export function shareClass(k: number, n: number): number {
  if (!k || !n) return 0;
  const s = k / n;
  let c = 1;
  for (const b of SHARE_BREAKS) if (s >= b) c++;
  return c;
}
export const SHARE_LABELS = ["under 5%", "5–15%", "15–30%", "30–50%", "50% or more"];

export const herbalIndex = (h: Herbal) => HERBALS.indexOf(h);

/** Width of an element that may mount after the first render (a callback ref, unlike kit's useWidth). */
export function useBoxWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    ro.current?.disconnect();
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    let frame = 0;
    ro.current = new ResizeObserver((es) => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setW(es[0].contentRect.width)); });
    ro.current.observe(el);
  }, []);
  useEffect(() => () => ro.current?.disconnect(), []);
  return [ref, w];
}
