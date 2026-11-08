// "Where these medicines come from": an orthographic globe of WGSRPD regions shaded by how many of each
// herbal's species are native there (WCVP). Paths are rewritten imperatively, and only while it turns.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { geoBounds, geoCentroid, geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath, type GeoProjection } from "d3-geo";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { HERBAL_LABEL, HERBAL_OWNER, HERBALS, herbalIndex, loadRegions, SHARE_LABELS, shareClass, type Herbal, type Overview, type Regions } from "../lib/geo";
import { useWidth } from "./kit";

const START: [number, number, number] = [-30, -34, 0]; // eastern Mediterranean at the centre
const SPIN = 4.5; // degrees per second, westward-to-eastward drift
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function GeoKey({ mode }: { mode: Herbal }) {
  return (
    <div className="geo-scale" aria-label={`Key: share of ${HERBAL_OWNER[mode]} native to a region`}>
      <p className="geo-scale-title">Share of {HERBAL_OWNER[mode]} native to the region</p>
      <ol className={`geo-scale-steps geo--${mode}`}>
        <li><span className="geo-sw geo-c0" aria-hidden="true" />none</li>
        {SHARE_LABELS.map((l, i) => <li key={l}><span className={`geo-sw geo-c${i + 1}`} aria-hidden="true" />{l}</li>)}
      </ol>
    </div>
  );
}

export function HerbalGlobe({ data, mode, compact = false, onSelect, selected, turn }: {
  data: Overview; mode: Herbal; compact?: boolean; selected?: string | null; turn?: { id: string; seq: number } | null;
  onSelect?: (id: string | null, how: "hover" | "pin" | "key") => void;
}) {
  const [regions, setRegions] = useState<Regions | null>(null);
  useEffect(() => { let on = true; loadRegions("globe").then((r) => { if (on) setRegions(r); }, () => {}); return () => { on = false; }; }, []);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  // A bounding cap per region (centre, angular radius), so regions on the far side are skipped, not clipped.
  const caps = useMemo(() => regions?.list.map((f) => {
    const c = geoCentroid(f);
    const [[x0, y0], [x1, y1]] = geoBounds(f);
    const r = x1 < x0 ? Math.PI : Math.max(...([[x0, y0], [x0, y1], [x1, y0], [x1, y1]] as [number, number][]).map((p) => geoDistance(c, p)));
    return { c, r };
  }) ?? [], [regions]);
  const hidden = useRef<boolean[]>([]);
  const S = Math.max(240, Math.round(Math.min(width || 0, compact ? 440 : 600)));
  const svgRef = useRef<SVGSVGElement>(null);
  const pathEls = useRef<(SVGPathElement | null)[]>([]);
  const sphereEl = useRef<SVGPathElement>(null);
  const gratEl = useRef<SVGPathElement>(null);
  const selEl = useRef<SVGPathElement>(null);
  const rot = useRef<[number, number, number]>([...START]);
  const spinning = useRef(!reduced());
  const visible = useRef(false);
  const frame = useRef(0);
  const selRef = useRef<string | null>(null);
  selRef.current = selected ?? null;
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const proj = useMemo<GeoProjection>(() => geoOrthographic().precision(1).clipAngle(90), []);
  const graticule = useMemo(() => geoGraticule10(), []);

  const draw = useCallback(() => {
    if (!regions) return;
    proj.scale(S / 2 - 2).translate([S / 2, S / 2]).rotate(rot.current);
    const path = geoPath(proj);
    const centre: [number, number] = [-rot.current[0], -rot.current[1]];
    regions.list.forEach((f, i) => {
      const el = pathEls.current[i];
      if (!el) return;
      const cap = caps[i];
      if (cap && geoDistance(centre, cap.c) > Math.PI / 2 + cap.r + 0.02) {
        if (!hidden.current[i]) { el.setAttribute("d", ""); hidden.current[i] = true; }
        return;
      }
      hidden.current[i] = false;
      el.setAttribute("d", path(f) ?? "");
    });
    sphereEl.current?.setAttribute("d", path({ type: "Sphere" }) ?? "");
    gratEl.current?.setAttribute("d", path(graticule) ?? "");
    const sel = selRef.current ? regions.byId.get(selRef.current) : null;
    selEl.current?.setAttribute("d", sel ? path(sel) ?? "" : "");
  }, [regions, proj, S, graticule, caps]);

  useLayoutEffect(() => { draw(); }, [draw, selected]);

  // Gentle drift: only while visible, never under reduced motion, and never again once touched.
  const loop = useCallback(() => {
    let last = performance.now();
    const tick = (t: number) => {
      if (!spinning.current || !visible.current || document.hidden) { frame.current = 0; return; }
      // The drift is slow, so 30 redraws a second are enough and halve the work on a phone.
      if (t - last >= 32) {
        const dt = Math.min(64, t - last); last = t;
        rot.current = [rot.current[0] + (SPIN * dt) / 1000, rot.current[1], 0];
        draw();
      }
      frame.current = requestAnimationFrame(tick);
    };
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  }, [draw]);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; if (e.isIntersecting && spinning.current) loop(); });
    io.observe(el);
    const vis = () => { if (!document.hidden && visible.current && spinning.current) loop(); };
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [loop]);
  const stop = () => { spinning.current = false; };

  // Turn smoothly to a region (or jump, under reduced motion).
  const turnTo = useCallback((lon: number, lat: number) => {
    stop();
    const from = [...rot.current] as [number, number, number];
    const dl = ((-lon - from[0]) % 360 + 540) % 360 - 180;
    const to: [number, number] = [from[0] + dl, Math.max(-60, Math.min(60, -lat))];
    if (reduced()) { rot.current = [to[0], to[1], 0]; draw(); return; }
    cancelAnimationFrame(frame.current);
    const t0 = performance.now(), D = 650;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4);
      rot.current = [from[0] + dl * e, from[1] + (to[1] - from[1]) * e, 0];
      draw();
      frame.current = k < 1 ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [draw]);
  useEffect(() => {
    const f = turn ? regions?.byId.get(turn.id) : null;
    if (f) turnTo(f.properties.lon, f.properties.lat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn?.seq, regions]);

  // Drag to rotate.
  const drag = useRef<{ x: number; y: number; r: [number, number, number]; moved: boolean } | null>(null);
  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    stop();
    cancelAnimationFrame(frame.current); frame.current = 0;
    drag.current = { x: e.clientX, y: e.clientY, r: [...rot.current] as [number, number, number], moved: false };
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) { d.moved = true; setDragging(true); try { svgRef.current?.setPointerCapture(e.pointerId); } catch { /* not capturable */ } }
    const k = 115 / (S / 2);
    rot.current = [d.r[0] + dx * k, Math.max(-75, Math.min(75, d.r[1] - dy * k)), 0];
    if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; draw(); });
  };
  const onUp = () => { const moved = drag.current?.moved; drag.current = null; if (moved) setTimeout(() => setDragging(false), 0); };

  const centreRegion = () => {
    if (!regions) return null;
    const c: [number, number] = [-rot.current[0], -rot.current[1]];
    return regions.list.find((f, i) => (!caps[i] || geoDistance(c, caps[i].c) <= caps[i].r + 0.01) && geoContains(f, c))?.properties.id ?? null;
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 30 : 10;
    const m: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (m[e.key]) {
      e.preventDefault(); stop();
      const [a, b] = m[e.key];
      rot.current = [rot.current[0] + a, Math.max(-75, Math.min(75, rot.current[1] + b)), 0];
      draw();
      onSelect?.(centreRegion(), "key");
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const id = centreRegion();
      if (id) onSelect?.(id, "pin");
    } else if (e.key === "Escape") onSelect?.(null, "pin");
  };

  const idx = herbalIndex(mode);
  const n = data.totals[mode];
  // Path elements are memoised on the shading only, so hover never re-renders 369 paths.
  const shapes = useMemo(() => regions?.list.map((f, i) => {
    const id = f.properties.id;
    const k = data.regions[id]?.c[idx] ?? 0;
    return (
      <path key={id} ref={(el) => { pathEls.current[i] = el; }} className={`gr geo-c${shareClass(k, n)}`} data-id={id} />
    );
  }), [regions, data, idx, n]);

  const pick = (e: RPointerEvent<SVGGElement> | React.MouseEvent<SVGGElement>, how: "hover" | "pin") => {
    if (drag.current?.moved || dragging) return;
    const id = (e.target as Element).getAttribute?.("data-id");
    if (how === "pin" && !id) { onSelect?.(null, "pin"); return; }
    if (id) onSelect?.(id, how);
  };

  return (
    <div className={`globe ${compact ? "globe--compact" : ""}`} ref={wrapRef}>
      <svg ref={svgRef} className={`globe-svg geo--${mode} ${dragging ? "is-dragging" : ""} ${focused ? "is-focused" : ""}`} width={S} height={S} viewBox={`0 0 ${S} ${S}`}
        tabIndex={0} role="group" aria-roledescription="globe"
        aria-label={`Globe of the botanical regions shaded by the share of ${HERBAL_OWNER[mode]} native to each. Drag or use the arrow keys to turn it; the region under the centre mark is read out; Enter keeps it.`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onKeyDown={onKey} onFocus={() => { setFocused(true); stop(); }} onBlur={() => setFocused(false)}>
        <path ref={sphereEl} className="globe-sphere" />
        <path ref={gratEl} className="globe-grat" />
        <g className="globe-regions" onPointerOver={(e) => pick(e, "hover")} onClick={(e) => pick(e, "pin")}
          onPointerLeave={() => { if (!drag.current) onSelect?.(null, "hover"); }}>
          {shapes}
        </g>
        <path ref={selEl} className="globe-sel" />
        {focused && <g className="globe-cross" aria-hidden="true"><line x1={S / 2 - 7} x2={S / 2 + 7} y1={S / 2} y2={S / 2} /><line y1={S / 2 - 7} y2={S / 2 + 7} x1={S / 2} x2={S / 2} /></g>}
      </svg>
    </div>
  );
}

/** The readout beside the globe: one region, three counts, the plants behind the active count. */
export function RegionPanel({ data, regions, id, mode, compact = false }: { data: Overview; regions: Regions | null; id: string | null; mode: Herbal; compact?: boolean }) {
  const f = id ? regions?.info.get(id) : null;
  const r = id ? data.regions[id] : undefined;
  if (!f) return <p className="globe-hint">Open sea under the centre mark. Keep turning with the arrow keys, or point at a region.</p>;
  const idx = herbalIndex(mode);
  const top = r?.top[idx] ?? [];
  return (
    <div className="region-panel">
      <p className="region-name">{f.name}<span className="region-l2">{regions?.l2[String(f.l2)]}{f.approx ? " · boundary drawn approximately" : ""}</span></p>
      <dl className="region-counts">
        {HERBALS.map((h, i) => (
          <div key={h} className={h === mode ? "is-active" : ""}>
            <dt><span className={`mark-swatch mark-swatch--${h}`} aria-hidden="true" />{HERBAL_LABEL[h]}</dt>
            <dd><span className="num">{fmt.int(r?.c[i] ?? 0)}</span> <span className="muted">of {fmt.int(data.totals[h])}</span></dd>
          </div>
        ))}
      </dl>
      {!compact && (top.length ? (
        <div className="region-plants">
          <p className="region-plants-h">Native here, most indications first</p>
          <ul className="plain">
            {top.map((s) => { const p = data.plants[s]; return <li key={s}><a href={href(`/plant/${s}`)}><i>{p?.[0] ?? s}</i></a>{p?.[1] ? <span className="muted"> {p[1]}</span> : null}</li>; })}
          </ul>
        </div>
      ) : <p className="globe-hint">None of {HERBAL_OWNER[mode]} is native here.</p>)}
    </div>
  );
}
