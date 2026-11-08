// "Where it grows": a flat equal-area map of a plant's WCVP range. It opens fitted to the native range
// (with a small world locator) and can step out to the whole world; GBIF records are an optional overlay.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { geoBounds, geoEqualEarth, geoPath, type GeoProjection } from "d3-geo";
import type { FeatureCollection, Geometry, MultiPoint } from "geojson";
import { useResource } from "../lib/data";
import { fmt } from "../lib/format";
import { loadRegions, rangeFile, useBoxWidth, type Region, type RegionProps, type Regions, type TaxonRange } from "../lib/geo";
import { ChartTip, TableToggle, type TipState } from "./kit";
import { Ext, Skeleton } from "../components/ui";

type Status = "native" | "introduced";
type View = "range" | "world";
const STATUS_LABEL: Record<Status, string> = { native: "Native", introduced: "Introduced" };
const MIN_PX = 5; // a region smaller than this on screen (either side) also gets a dot marker
const ROT: [number, number] = [-11, 0];

function useRegions(): Regions | null {
  const [r, setR] = useState<Regions | null>(null);
  useEffect(() => { let on = true; loadRegions().then((x) => { if (on) setR(x); }, () => {}); return () => { on = false; }; }, []);
  return r;
}

const METHOD: Record<string, string> = {
  accepted: "matched as an accepted name", synonym: "matched through a WCVP synonym",
  "gbif-synonym": "matched through a GBIF synonym", "genus-union": "union of the genus’s accepted species",
};

/** The native extent as sample points, widened to at least 34° × 20° so one island never fills the map. */
function nativeFrame(native: Region[], points: RegionProps[]): MultiPoint | null {
  const pts: [number, number][] = [];
  for (const f of native) {
    const [[x0, y0], [x1, y1]] = geoBounds(f);
    if (x1 < x0) { pts.push([f.properties.lon, f.properties.lat]); continue; } // crosses the antimeridian
    pts.push([x0, y0], [x1, y1]);
  }
  for (const p of points) pts.push([p.lon, p.lat]);
  if (!pts.length) return null;
  let [x0, x1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  let [y0, y1] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const w = Math.max(34, (x1 - x0) * 1.15), h = Math.max(20, (y1 - y0) * 1.15);
  x0 = Math.max(-180, cx - w / 2); x1 = Math.min(180, cx + w / 2);
  y0 = Math.max(-58, cy - h / 2); y1 = Math.min(84, cy + h / 2);
  const ring: [number, number][] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; ring.push([x0 + (x1 - x0) * t, y0], [x0 + (x1 - x0) * t, y1], [x0, y0 + (y1 - y0) * t], [x1, y0 + (y1 - y0) * t]); }
  return { type: "MultiPoint", coordinates: ring };
}

export function RangeMap({ slug, taxon }: { slug: string; taxon: string }) {
  const range = useResource<TaxonRange>(rangeFile(slug));
  const regions = useRegions();
  const [wrapRef, width] = useBoxWidth<HTMLDivElement>();
  const frame = useRef<HTMLDivElement>(null);
  const [showRecords, setShowRecords] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const [cursor, setCursor] = useState(-1);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = range.data;

  const status = useMemo(() => {
    const m = new Map<string, Status>();
    r?.introduced.forEach((c) => m.set(c, "introduced"));
    r?.native.forEach((c) => m.set(c, "native"));
    return m;
  }, [r]);
  const hasRange = status.size > 0;
  const cells = r?.gbif.cells ?? [];
  const records = showRecords || (!hasRange && cells.length > 0);

  const base = useMemo(() => {
    if (!regions || !width) return null;
    const land = regions.list.filter((f) => f.properties.l1 !== 9);
    const fc: FeatureCollection<Geometry, RegionProps> = { type: "FeatureCollection", features: land };
    const W = Math.round(width);
    const world = geoEqualEarth().rotate(ROT).fitWidth(W, fc);
    const [[, y0], [, y1]] = geoPath(world).bounds(fc);
    // The zoomed view keeps a steady frame: wide on desktop, taller on a phone so the locator never crowds it.
    const H = W < 560 ? Math.round(W * 0.8) : Math.round(Math.min(W * 0.62, Math.max(W * 0.46, y1 - y0 + 4)));
    const natF = land.filter((f) => status.get(f.properties.id) === "native");
    const natP = regions.points.filter((p) => status.get(p.id) === "native");
    const box = nativeFrame(natF, natP);
    // Zoom only when the native range is a small part of the world map.
    let zoomable = false;
    if (box) {
      const [[bx0], [bx1]] = geoPath(world).bounds(box);
      zoomable = (bx1 - bx0) / W < 0.62;
    }
    return { W, H, land, fc, box, zoomable, worldTop: Math.floor(y0) - 2, worldH: Math.ceil(y1 - y0) + 4 };
  }, [regions, width, status]);

  const active: View = view ?? (base?.zoomable ? "range" : "world");

  const geo = useMemo(() => {
    if (!base || !regions) return null;
    const { W } = base;
    let proj: GeoProjection, top: number, H: number;
    if (active === "range" && base.box) {
      H = base.H;
      proj = geoEqualEarth().rotate(ROT).fitExtent([[16, 16], [W - 16, H - 16]], base.box);
      top = 0;
    } else {
      proj = geoEqualEarth().rotate(ROT).fitWidth(W, base.fc);
      top = base.worldTop; H = base.worldH;
    }
    const path = geoPath(proj);
    const shapes = base.land.map((f) => {
      const [[x0, y0], [x1, y1]] = path.bounds(f);
      return { id: f.properties.id, name: f.properties.name, approx: !!f.properties.approx, d: path(f) ?? "", c: proj([f.properties.lon, f.properties.lat]), small: x1 - x0 < MIN_PX && y1 - y0 < MIN_PX };
    });
    const pts = regions.points.map((p) => ({ id: p.id, name: p.name, approx: !!p.approx, d: "", c: proj([p.lon, p.lat]), small: true }));
    return { W, H, top, proj, shapes: [...shapes, ...pts], scale: proj.scale() };
  }, [base, regions, active]);

  // The world locator: land, the native range, and the frame of the zoomed view.
  const locator = useMemo(() => {
    if (!base || !base.box || active !== "range") return null;
    const LW = Math.round(Math.max(120, Math.min(200, base.W * 0.24)));
    const proj = geoEqualEarth().rotate(ROT).fitWidth(LW, base.fc);
    const path = geoPath(proj);
    const [[, y0], [, y1]] = path.bounds(base.fc);
    const [[fx0, fy0], [fx1, fy1]] = path.bounds(base.box);
    return {
      LW, LH: Math.ceil(y1 - y0) + 2, top: Math.floor(y0) - 1, frame: [fx0, fy0, fx1 - fx0, fy1 - fy0] as const,
      land: path({ type: "FeatureCollection", features: base.land }) ?? "",
      native: path({ type: "FeatureCollection", features: base.land.filter((f) => status.get(f.properties.id) === "native") }) ?? "",
    };
  }, [base, active, status]);

  // Keyboard order: the plant's own regions, west to east, native first.
  const stops = useMemo(() => {
    if (!geo) return [];
    return geo.shapes.filter((s) => status.has(s.id)).sort((a, b) => {
      const sa = status.get(a.id) === "native" ? 0 : 1, sb = status.get(b.id) === "native" ? 0 : 1;
      return sa - sb || (a.c?.[0] ?? 0) - (b.c?.[0] ?? 0);
    });
  }, [geo, status]);

  const dots = useMemo(() => {
    if (!geo || !records || !cells.length) return [];
    const max = Math.max(...cells.map((c) => c[2]));
    const L = Math.log10(max + 1) || 1;
    const cellPx = (geo.scale * 2.8125 * Math.PI) / 180;
    const rMax = Math.max(2.2, Math.min(6, cellPx * 0.42));
    return cells.map(([lon, lat, n]) => {
      const p = geo.proj([lon, lat]);
      return p && p[0] > -10 && p[0] < geo.W + 10 && p[1] > geo.top - 10 && p[1] < geo.top + geo.H + 10
        ? { x: p[0], y: p[1], r: 0.9 + (rMax - 0.9) * (Math.log10(n + 1) / L) } : null;
    }).filter((d): d is { x: number; y: number; r: number } => !!d);
  }, [geo, records, cells]);

  const show = (id: string, at: [number, number] | null | undefined) => {
    if (!geo || !at) return;
    const s = geo.shapes.find((x) => x.id === id);
    const st = status.get(id);
    const host = frame.current?.getBoundingClientRect();
    const scale = host ? host.width / geo.W : 1;
    setTip({
      x: Math.max(80, Math.min((host?.width ?? geo.W) - 80, at[0] * scale)), y: (at[1] - geo.top) * scale - 8,
      lines: [s?.name ?? id, `${st ? STATUS_LABEL[st] : "Not recorded in WCVP"}${s?.approx ? " · boundary approximate" : ""}`],
    });
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!stops.length) return;
    const k = e.key;
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(k)) return;
    e.preventDefault();
    const n = stops.length;
    const next = k === "Home" ? 0 : k === "End" ? n - 1 : k === "ArrowRight" || k === "ArrowDown" ? (cursor + 1) % n : (cursor - 1 + n) % n;
    setCursor(next);
    show(stops[next].id, stops[next].c);
  };
  const focusId = cursor >= 0 ? stops[cursor]?.id : null;

  if (range.status === "loading" || (range.status === "ready" && !regions)) return <Skeleton rows={6} label="Drawing the range" />;
  const empty = range.status === "error" || (!hasRange && !cells.length);
  const byL1 = (codes: string[]) => {
    const m = new Map<string, string[]>();
    for (const c of codes) {
      const f = regions?.info.get(c);
      const k = f ? regions!.l1[String(f.l1)] : "Other";
      m.set(k, [...(m.get(k) ?? []), f?.name ?? c]);
    }
    return [...m.entries()].map(([k, v]) => [k, v.sort()] as const);
  };
  const inView = (c: [number, number] | null | undefined) => !!c && !!geo && c[0] >= 0 && c[0] <= geo.W && c[1] >= geo.top && c[1] <= geo.top + geo.H;
  const markers = geo ? geo.shapes.filter((s) => s.small && inView(s.c) && status.has(s.id)) : [];

  return (
    <div className="where-grid">
      <div className="where-text">
        <h2 id="where-title" className="sec-title">Where it grows</h2>
        {empty ? (
          <p className="where-summary">No distribution is on record for <i>{taxon}</i>. Kew’s checklist covers vascular plants only, so mosses, algae, lichens and fungi have no mapped range.</p>
        ) : (
          <>
            <p className="where-summary">{r?.summary || "No native or introduced range is on record; the map shows GBIF records only."}</p>
            <dl className="where-counts">
              <div><dt>Native</dt><dd className="num">{fmt.int(r?.native.length)}</dd><dd className="fact-src">botanical countries</dd></div>
              <div><dt>Introduced</dt><dd className="num">{fmt.int(r?.introduced.length)}</dd><dd className="fact-src">botanical countries</dd></div>
              <div><dt>GBIF records</dt><dd className="num">{fmt.int(r?.gbif.total)}</dd><dd className="fact-src">georeferenced</dd></div>
            </dl>
            <ul className="legend where-legend" aria-label="Map key">
              {hasRange && <li className="legend-item"><span className="geo-key geo-key--native" aria-hidden="true" />Native</li>}
              {hasRange && <li className="legend-item"><span className="geo-key geo-key--intro" aria-hidden="true" />Introduced</li>}
              {markers.length > 0 && <li className="legend-item"><span className="geo-key geo-key--marker" aria-hidden="true" />Too small to see</li>}
              {records && <li className="legend-item"><span className="geo-key geo-key--dot" aria-hidden="true" />GBIF records, sized by count</li>}
            </ul>
            <div className="where-tools">
              {base?.box && (
                <div className="segmented where-view" role="group" aria-label="Map extent">
                  <button type="button" aria-pressed={active === "range"} onClick={() => setView("range")}>Native range</button>
                  <button type="button" aria-pressed={active === "world"} onClick={() => setView("world")}>World</button>
                </div>
              )}
              {hasRange && cells.length > 0 && (
                <button type="button" className="btn btn--line btn--small" aria-pressed={showRecords} onClick={() => setShowRecords((v) => !v)}>
                  {showRecords ? "Hide recorded occurrences" : "Show recorded occurrences"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="where-map" ref={wrapRef}>
        {!empty && geo && (
          <div className="chart where-frame" ref={frame}>
            <svg className={`geo-svg ${records ? "is-records" : ""} ${active === "range" ? "is-zoomed" : ""}`} width={geo.W} height={geo.H} viewBox={`0 ${geo.top} ${geo.W} ${geo.H}`}
              role="group" aria-label={`Map of the range of ${taxon}, ${active === "range" ? "fitted to the native range" : "whole world"}. ${r?.summary ?? ""} ${stops.length ? "Use the arrow keys to step through its regions." : ""}`}
              tabIndex={stops.length ? 0 : -1} onKeyDown={onKey} onBlur={() => { setTip(null); setCursor(-1); }}>
              <defs>
                <pattern id={`hatch-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="5" height="5" className="geo-hatch-bg" />
                  <line x1="0" y1="0" x2="0" y2="5" className="geo-hatch-line" />
                </pattern>
                <clipPath id={`clip-${uid}`}><rect x="0" y={geo.top} width={geo.W} height={geo.H} /></clipPath>
              </defs>
              <g clipPath={`url(#clip-${uid})`}>
                <g className="geo-regions" onMouseLeave={() => setTip(null)}>
                  {geo.shapes.filter((s) => s.d).map((s) => {
                    const st = status.get(s.id);
                    return (
                      <path key={s.id} d={s.d} className={`rg ${st === "native" ? "rg--native" : st === "introduced" ? "rg--intro" : ""}`}
                        style={st === "introduced" ? { fill: `url(#hatch-${uid})` } : undefined}
                        onMouseEnter={() => show(s.id, s.c)} />
                    );
                  })}
                </g>
                {focusId && geo.shapes.find((s) => s.id === focusId)?.d && <path className="rg-focus" d={geo.shapes.find((s) => s.id === focusId)!.d} />}
                {dots.length > 0 && (
                  <g className="geo-dots" aria-hidden="true">
                    {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} />)}
                  </g>
                )}
                <g className="geo-markers">
                  {markers.map((s) => (
                    <circle key={s.id} cx={s.c![0]} cy={s.c![1]} r={focusId === s.id ? 5.5 : 4}
                      className={`geo-marker geo-marker--${status.get(s.id) === "native" ? "native" : "intro"}`}
                      onMouseEnter={() => show(s.id, s.c)} onMouseLeave={() => setTip(null)} />
                  ))}
                </g>
              </g>
            </svg>
            {locator && (
              <svg className="geo-locator" width={locator.LW} height={locator.LH} viewBox={`0 ${locator.top} ${locator.LW} ${locator.LH}`} aria-hidden="true">
                <path d={locator.land} className="loc-land" />
                <path d={locator.native} className="loc-native" />
                <rect x={locator.frame[0]} y={locator.frame[1]} width={Math.max(3, locator.frame[2])} height={Math.max(3, locator.frame[3])} className="loc-frame" />
              </svg>
            )}
            <ChartTip tip={tip} />
          </div>
        )}
        {empty && <div className="where-empty" aria-hidden="true" />}
        <p className="seam where-seam">
          Range: <Ext href="https://doi.org/10.34885/egs6-cp24">WCVP</Ext>, facilitated by the Royal Botanic Gardens, Kew (CC BY 3.0){r?.wcvp ? <>, {METHOD[r.wcvp.method] ?? r.wcvp.method}{r.wcvp.name && r.wcvp.name !== taxon ? <> (<i>{r.wcvp.name}</i>)</> : null}{r.wcvp.powo ? <>; <Ext href={r.wcvp.powo}>POWO record</Ext></> : null}</> : null}. Records: <Ext href={r?.gbif.key ? `https://www.gbif.org/species/${r.gbif.key}` : "https://www.gbif.org/"}>GBIF</Ext> (CC BY 4.0), binned to 2.8° squares. Boundaries: <Ext href="https://www.naturalearthdata.com/">Natural Earth</Ext> (public domain); botanical-country units after TDWG WGSRPD (Brummitt 2001), drawn approximately.
        </p>
        {!empty && hasRange && (
          <TableToggle label="List the regions">
            <dl className="where-list">
              {(["native", "introduced"] as const).map((k) => (r && r[k].length ? (
                <div key={k}>
                  <dt>{STATUS_LABEL[k]} ({r[k].length})</dt>
                  <dd>{byL1(r[k]).map(([l1, names]) => <p key={l1}><b>{l1}:</b> {names.join(", ")}</p>)}</dd>
                </div>
              ) : null))}
            </dl>
          </TableToggle>
        )}
      </div>
    </div>
  );
}
